import { francAll } from 'franc-min';
import { iso6393 } from 'iso-639-3';
import { Devvit, TriggerContext, Post, Comment } from "@devvit/public-api";
import { stopwords } from '../helpers/stopwords-iso.js';
import { whitelistedWords } from '../helpers/word-whitelist.js';
import { stripFormattingAndUrls } from '../helpers/textCleanupHelper.js';

const supportedLanguages = [
    'eng', 'cmn', 'hin', 'spa', 'fra', 'arb', 'ben', 'rus', 'por', 'urd', 
    'ind', 'deu', 'jpn', 'mar', 'tel', 'tur', 'tam', 'vie', 'tgl', 'kor', 
    'pes', 'pol', 'ita', 'nld', 'ron', 'ell', 'ces', 'swe', 'hun', 'fin'
];

// Detection Settings:

const StopwordDensityThresholdLenient = 0.40; // % of words must be valid stopwords to pass the check
const StopwordDensityThresholdStrict = 0.60; // % of words must be valid stopwords to pass the check
const StopwordDensityThresholdFallback = 0.75; // % of words must be valid stopwords to pass the check for short texts
const MinTextLengthForDetection = 30; // Minimum text length for language detection
const MinConfidenceStrict = 0.1; // Minimum confidence for strict mode ( Low confidence to allow even unsure cases to be caught, risking false positives )
const MinConfidenceLenient = 0.8; // Minimum confidence for lenient mode
const MinScriptMatchPercentageLenient = 0.5; // Minimum percentage of characters matching a script for short text detection
const MinScriptMatchPercentageStrict = 0.7; // Minimum percentage of characters matching a script for short text detection


export async function handleDetection(itemId: string, context: TriggerContext, text: string) {
    const trace: string[] = [];
    const finish = (msg: string) => {
        trace.push(msg);
        console.log(`[${itemId}] ${trace.join(' -> ')}`);
    };

    // Redis Deduplication Check
    const redisKey = `processed:${itemId}`;
    const alreadyProcessed = await context.redis.get(redisKey);
    
    if (alreadyProcessed) 
    {
        return finish('Already processed recently');
    }

    text = stripFormattingAndUrls(text);

    await context.redis.set(redisKey, 'true');
    await context.redis.expire(redisKey, 60);

    const strictnessSetting = await context.settings.get<string[]>('STRICTNESS') ?? ['strict'];
    const allowedLanguages = await context.settings.get<string[]>('ALLOWED_LANGUAGES') || ['eng'];

    let langCode = "und";

    // Quick Stopword Check
    const words = text.toLowerCase().replace(/[^\p{Letter}\p{Number}\s']/gu, '').split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    // Add global whitelisted words to the allowed set
    const allowedWords = new Set<string>(whitelistedWords.global || []);

    // Fetch and parse the custom whitelist from settings
    const customWhitelistStr = await context.settings.get<string>('CUSTOM_WHITELIST') ?? '';
    if (customWhitelistStr.trim().length > 0) {
        const customWords = customWhitelistStr
            .split(/[,;]+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0);
            
        customWords.forEach(w => allowedWords.add(w));
        
        if (customWords.length > 0) {
            trace.push(`Loaded ${customWords.length} custom whitelisted words`);
        }
    }

    for (const code3 of allowedLanguages) {
        // Add whitelisted words for the specific language code
        if (whitelistedWords[code3]) 
        {
            whitelistedWords[code3].forEach(w => allowedWords.add(w));
        }

        const langData = iso6393.find(l => l.iso6393 === code3);
        if (langData?.iso6391 && (stopwords as any)[langData.iso6391]) 
        {
            (stopwords as any)[langData.iso6391].forEach((w: string) => allowedWords.add(w));
        }
    }

    let validWordCount = 0;
    for (const word of words) {
        if (allowedWords.has(word)){
            validWordCount++;
        } 
    }

    const StopwordDensityThreshold = strictnessSetting[0] === 'lenient' ? StopwordDensityThresholdLenient : StopwordDensityThresholdStrict;

    if (totalWords > 0 && (validWordCount / totalWords) >= StopwordDensityThreshold) {
        return finish(`Passed Quick Stopwords [${validWordCount}/${totalWords}]`);
    }

    trace.push(`Stopwords [${validWordCount}/${totalWords}]`);

    // Main Detection using Franc
    if (text.trim().length >= MinTextLengthForDetection) {
        trace.push('Mode: Franc');

        const minConfidence = strictnessSetting[0] === 'lenient' ? MinConfidenceLenient : MinConfidenceStrict;
        

        const results = francAll(text, { only: supportedLanguages });
        const topCode = results[0][0];
        const topScore = results[0][1] as number;

        if (topCode === 'und' || topScore < minConfidence) {
            return finish(`Skipped: Franc Undetermined or < ${minConfidence} (Score: ${topScore})`);
        }

        const numToCheck = strictnessSetting[0] === 'lenient' ? 3 : 1;
        const topResultsToCheck = results.slice(0, numToCheck);

        const isAllowed = topResultsToCheck.some(([code]) => allowedLanguages.includes(code as string));

        if (isAllowed) {
            return finish(`Passed: Franc matched allowed lang in top ${numToCheck} (Top code: ${topCode}, Score: ${topScore})`);
        } 
        else
        {
            trace.push(`Franc rejected: ${topCode} (${topScore})`);
        }


        
        langCode = topCode;
    } 
    else 
    {
        // If the text is too short, we can attempt to detect the script of the characters to infer the language.
        const textLetters = [...text].filter(char => /\p{Letter}/u.test(char));
        const totalLetters = textLetters.length;

        if (totalLetters > 0) {
            const scriptMappings = [
                { regex: /\p{Script=Cyrillic}/u, code: 'rus' }, // Russian / Cyrillic
                { regex: /\p{Script=Han}/u, code: 'cmn' }, // Chinese
                { regex: /\p{Script=Hiragana}|\p{Script=Katakana}/u, code: 'jpn' }, // Japanese
                { regex: /\p{Script=Hangul}/u, code: 'kor' }, // Korean
                { regex: /\p{Script=Arabic}/u, code: 'arb' }, // Arabic
                { regex: /\p{Script=Devanagari}/u, code: 'hin' } // Hindi / Devanagari
            ];

            let scriptFound = false;

            for (const script of scriptMappings) {
                const matchCount = textLetters.filter(char => script.regex.test(char)).length;
                
                const minScriptMatchPercentage = strictnessSetting[0] === 'lenient' ? MinScriptMatchPercentageLenient : MinScriptMatchPercentageStrict;
                if (matchCount / totalLetters > minScriptMatchPercentage) {
                    langCode = script.code;
                    scriptFound = true;
                    trace.push(`Mode: Script Analysis -> Detected ${script.code}`);
                    break;
                }
            }
            // if no script was found, we attempt to use stopword density for short texts as a fallback.
            if (!scriptFound) {
                let bestLang = 'und';
                let bestMatch = 0;

                for (const code3 of supportedLanguages) {
                    let matchCount = 0;
                    const langData = iso6393.find(l => l.iso6393 === code3);
                    const stopwordList = langData?.iso6391 ? (stopwords as any)[langData.iso6391] : [];
                    const whitelist = whitelistedWords[code3] || [];
                    
                    const langWords = new Set([...(stopwordList || []), ...whitelist]);
                    
                    for (const word of words) {
                        if (langWords.has(word)) matchCount++;
                    }

                    if (matchCount > bestMatch) {
                        bestMatch = matchCount;
                        bestLang = code3;
                    }
                }

                if (totalWords > 0 && (bestMatch / totalWords) >= StopwordDensityThresholdFallback) {
                    langCode = bestLang;
                    trace.push(`Mode: Short Stopwords -> Detected ${langCode} (${bestMatch}/${totalWords})`);
                } else {
                    return finish(`Skipped: Under 30 chars (Latin/mixed) and unverified`);
                }
            }

            if (allowedLanguages.includes(langCode)) {
                return finish(`Passed: Short text allowed (${langCode})`);
            }
            trace.push(`Short Text rejected: ${langCode}`);
        } else {
            return finish(`Skipped: No recognizable letters`);
        }
    }

    if(langCode === "und"){
        return finish(`Skipped: Language could not be determined`);
    }

    let item;
    let actionSetting;
    if(itemId.startsWith("t3_")) 
    {
        // It's a post
        item = await context.reddit.getPostById(itemId);
        actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_POST') ?? ['report'];
    } 
    else if(itemId.startsWith("t1_")) 
    {
        // It's a comment
        item = await context.reddit.getCommentById(itemId);
        actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_COMMENT') ?? ['report'];
    } 
    else 
    {
        return finish(`Skipped: Neither post nor comment`);
    }

    // Check if already removed.
    if(item.isRemoved())
    {
        return finish(`Skipped: Already removed`);
    }

    // Take action
    const langData = iso6393.find(l => l.iso6393 === langCode);
    const langName = langData?.name || langCode;

    const action = actionSetting[0];
    const rawReason = await context.settings.get<string>('ACTION_REASON') ?? 'Language not allowed: {{LangName}}';
    const reason = rawReason.replace('{{LangName}}', langName);

    if (action === 'report') 
    {
        await context.reddit.report(item, { reason: reason });
        finish(`Action: Reported (${langCode})`);
    } 
    else if (action === 'filter') 
    {
        await context.reddit.filter(item.id, { reason: reason });
        finish(`Action: Filtered (${langCode})`);
        await sendRemovalNotification(context, item, "filter");
    } 
    else if (action === 'remove') 
    {
        await context.reddit.remove(item.id, false);
        await context.reddit.addRemovalNote({ itemIds: [item.id], reasonId: "", modNote: reason });
        finish(`Action: Removed (${langCode})`);
        await sendRemovalNotification(context, item, "removal");
    }
}

async function sendRemovalNotification(context: TriggerContext, item: Post | Comment, type: String) {
    let notifyAuthor;
    let rawMessage;
    if(type === "filter") {
        notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR_FILTER');
        rawMessage = await context.settings.get<string>('FILTER_MESSAGE') ?? '';
    } else if(type === "removal") {
        notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR_REMOVAL');
        rawMessage = await context.settings.get<string>('REMOVAL_MESSAGE') ?? '';
    }

    if (!notifyAuthor) return;

    const authorName = item.authorName;
    const subredditName = item.subredditName;
    const itemType = item.id.startsWith("t3_") ? 'post' : 'comment';
    
    if(!rawMessage){
        return;
    }
    const message = rawMessage.replace(/{{type}}/g, itemType).replace(/{{subredditName}}/g, subredditName).replace(/{{UserName}}/g, authorName);

    const comment = await context.reddit.submitComment({
        id: item.id,
        text: message,
    });
    await comment.distinguish(true);
    console.log(`[${item.id}] Left comment notification (${type})`);
    
}