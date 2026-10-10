import { TriggerContext } from "@devvit/public-api";
import { handleDetection } from "./detectionHandler.js";
import { getMenuItemById } from "@devvit/public-api/devvit/internals/menu-items.js";

export async function handleEdit(event: any, context: TriggerContext, isPost: boolean){
    const editChecksEnabled = await context.settings.get<boolean>('REPORT_EDITS') ?? false;
    if(!editChecksEnabled) {
        return;
    }

    const itemId = isPost ? event.post.id : event.comment.id;

    const redisKey = `actioned:${itemId}`;
    const wasActioned = await context.redis.get(redisKey);

    if(!wasActioned) {
        return;
    }

    let text;
    if(isPost) {
        text = event.post.title + " " + (event.post.selftext || "");
    } else {
        text = event.comment.body;
    }

    const langCode = await handleDetection(itemId, context, text, undefined, false)
    const allowedLanguages = await context.settings.get<string[]>('ALLOWED_LANGUAGES') ?? ['en'];

    console.log("[EditCheck-" + itemId + "] Detected language code on edited item: " + langCode);

    if(allowedLanguages.includes(langCode)) {
        let item;
        if(isPost) {
            item = await context.reddit.getPostById(itemId);
        } else {
            item = await context.reddit.getCommentById(itemId);
        }


        let actionSetting;
        if(isPost) 
        {
            item = await context.reddit.getPostById(itemId);
            actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_POST') ?? ['report'];
        } 
        else
        {
            item = await context.reddit.getCommentById(itemId);
            actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_COMMENT') ?? ['report'];
        } 

        if(actionSetting[0] === 'report') {
            // Ignore reported Items
            console.log(`[EditCheck-${itemId}] Item was previously actioned but is now in an allowed language. Skipped as it is set to report.`);
        } else {
            await context.reddit.filter(itemId, { reason: "Item was edited and is now allowed" });
            console.log(`[EditCheck-${itemId}] Item was previously actioned but is now in an allowed language (${langCode}). Filtered for review.`);
        }

        await context.redis.del(redisKey);
    }

}