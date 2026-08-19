import ISO6391 from 'iso-639-1';
import { iso6393 } from 'iso-639-3';
import { Devvit, TriggerContext, Post, Comment } from "@devvit/public-api";

export async function handleDetection(itemId: string, context: TriggerContext, langCode: string) {
    // Redis Deduplication Check
    const redisKey = `processed:${itemId}`;
    const alreadyProcessed = await context.redis.get(redisKey);
    
    if (alreadyProcessed) {
        console.log(`Event for ${itemId} was already processed recently. Skipping.`);
        return;
    }

    // Add check if language is allowed:
    const allowedLanguages = await context.settings.get<string[]>('ALLOWED_LANGUAGES') || ['eng'];
    
    if (allowedLanguages.includes(langCode) || langCode === 'und') {
        console.log(`Item ${itemId} is in an allowed language (${langCode}), skipping.`);
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