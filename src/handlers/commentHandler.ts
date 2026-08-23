import { Devvit, TriggerContext } from "@devvit/public-api";
import { handleDetection } from "./detectionHandler.js";
import { isAuthorBlacklisted } from "../helpers/authorBlacklist.js";

export async function handleComment(event: any, context: TriggerContext) {
    const actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_COMMENT') ?? ['report'];
    const action = actionSetting[0];
    if(action === 'none') {
        return;
    }

    const author = event.comment.author;
    if(isAuthorBlacklisted(author)) {
        return;
    }
    const commentText = event.comment.body;
    const commentId = event.comment.id;
    await handleDetection(commentId, context, commentText);
}