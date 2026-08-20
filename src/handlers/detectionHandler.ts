import { francAll } from 'franc-min';
import { iso6393 } from 'iso-639-3';
import { Devvit, TriggerContext, Post, Comment } from "@devvit/public-api";
import { stopwords } from '../helpers/stopwords-iso.js';
import { whitelistedWords } from '../helpers/word-whitelist.js';

const supportedLanguages = [
    'eng', 'cmn', 'hin', 'spa', 'fra', 'arb', 'ben', 'rus', 'por', 'urd', 
    'ind', 'deu', 'jpn', 'mar', 'tel', 'tur', 'tam', 'vie', 'tgl', 'kor', 
    'pes', 'pol', 'ita', 'nld', 'ron', 'ell', 'ces', 'swe', 'hun', 'fin'
];


export async function handleDetection(itemId: string, context: TriggerContext, text: string) {
    // Redis Deduplication Check
    const redisKey = `processed:${itemId}`;
    const alreadyProcessed = await context.redis.get(redisKey);
    
    if (alreadyProcessed) {
        console.log(`Event for ${itemId} was already processed recently. Skipping.`);
        return;
    }

    const allowedLanguages = await context.settings.get<string[]>('ALLOWED_LANGUAGES') || ['eng'];

    let langCode = "und";

    // Quick Stopword Check
    const words = text.toLowerCase().replace(/[^\w\s\']/gi, '').split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    // Add common internet slang and abbreviations to the allowed words set
    const allowedWords = new Set<string>(whitelistedWords.global || []);

    for (const code3 of allowedLanguages) {
        if (whitelistedWords[code3]) {
            whitelistedWords[code3].forEach(w => allowedWords.add(w));
        }

        const langData = iso6393.find(l => l.iso6393 === code3);
        if (langData?.iso6391 && (stopwords as any)[langData.iso6391]) {
            (stopwords as any)[langData.iso6391].forEach((w: string) => allowedWords.add(w));
        }
    }

    let validWordCount = 0;
    for (const word of words) {
        if (allowedWords.has(word)) validWordCount++;
    }

    if (totalWords > 0 && (validWordCount / totalWords) >= 0.25) {
        console.log(`Item ${itemId} passed stopword Check.`);
        return;
    }

    // Main Detection using Franc
    if (text.trim().length >= 30) {
        const strictnessSetting = await context.settings.get<string[]>('STRICTNESS') ?? ['strict'];
        const minConfidence = strictnessSetting[0] === 'lenient' ? 0.8 : 0.1;
        

        const results = francAll(text, { only: supportedLanguages });
        const topCode = results[0][0];
        const topScore = results[0][1] as number;

        if (topCode === 'und' || topScore < minConfidence) {
            console.log(`Item ${itemId} skipped: Undetermined or below minimum confidence (${topScore}).`);
            return;
        }

        const numToCheck = strictnessSetting[0] === 'lenient' ? 3 : 1;
        const topResultsToCheck = results.slice(0, numToCheck);

        const isAllowed = topResultsToCheck.some(([code]) => allowedLanguages.includes(code as string));

        if (isAllowed) {
            console.log(`Item ${itemId} passed language check. (Top code: ${topCode}, Score: ${topScore})`);
            return;
        } else {
            console.log(`Item ${itemId} failed language check. (Top code: ${topCode}, Score: ${topScore})`);
        }


        
        langCode = topCode;
    } else {
        // Fallback for short content (TODO)
    }

    if(langCode === "und"){
        console.log(`Item ${itemId} language could not be detected. Skipping.`);
        return;
    }

    let item;

    if(itemId.startsWith("t3_")) 
    {
        // It's a post
        item = await context.reddit.getPostById(itemId);
    } 
    else if(itemId.startsWith("t1_")) 
    {
        // It's a comment
        item = await context.reddit.getCommentById(itemId);
    } else {
        console.log(`Item ${itemId} is neither a post nor a comment. Skipping.`);
        return;
    }

    // Check for Author data
    const authorName = item.authorName;
    if(authorName === 'language-detector') {
        return; 
    }

    // Check if already removed.
    if(item.isRemoved()){
        console.log(`Item ${itemId} is already removed. Skipping.`);
        return;
    }

    // Take action
    const langData = iso6393.find(l => l.iso6393 === langCode);
    const langName = langData?.name || langCode;

    const actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED') ?? ['report'];
    const action = actionSetting[0];
    const rawReason = await context.settings.get<string>('ACTION_REASON') ?? 'Language not allowed: {{LangName}}';
    const reason = rawReason.replace('{{LangName}}', langName);

    if (action === 'report') {
        await context.reddit.report(item, { reason: reason });
        console.log(`Sent report for item ${item.id} with language code: ${langCode}`);
    } else if (action === 'filter') {
        await context.reddit.filter(item.id, { reason: reason });
        console.log(`Filtered item ${item.id} with language code: ${langCode}`);
        await sendRemovalNotification(context, item);
    } else if (action === 'remove') {
        await context.reddit.remove(item.id, false);
        await context.reddit.addRemovalNote({ itemIds: [item.id], reasonId: "", modNote: reason });
        console.log(`Removed item ${item.id} with language code: ${langCode}`);
        await sendRemovalNotification(context, item);
    }

    await context.redis.set(redisKey, 'true');
    await context.redis.expire(redisKey, 60);
}

async function sendRemovalNotification(context: TriggerContext, item: Post | Comment) {
    const notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR');
    if (!notifyAuthor) return;

    const authorName = item.authorName;
    const subredditName = item.subredditName;
    const itemType = item.id.startsWith("t3_") ? 'post' : 'comment';
    
    const rawMessage = await context.settings.get<string>('REMOVAL_MESSAGE') ?? '';
    const message = rawMessage.replace(/{{type}}/g, itemType).replace(/{{subredditName}}/g, subredditName).replace(/{{UserName}}/g, authorName);

    const comment = await context.reddit.submitComment({
        id: item.id,
        text: message,
    });
    await comment.distinguish(true);
    console.log(`Left comment notification on ${item.id}`);
    
}