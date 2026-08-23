import { Devvit, TriggerContext } from "@devvit/public-api";
import { handleDetection } from "./detectionHandler.js";
import { isAuthorBlacklisted } from "../helpers/authorBlacklist.js";

export async function handlePost(event: any, context: TriggerContext) {
    const actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_POST') ?? ['report'];
    const action = actionSetting[0];
    if(action === 'none') {
        return;
    }

    const author = event.post.author;
    if(isAuthorBlacklisted(author)) {
        return;
    }
    const postText = event.post.title + " " + (event.post.selftext || "");
    const postId = event.post.id;
    await handleDetection(postId, context, postText);
}