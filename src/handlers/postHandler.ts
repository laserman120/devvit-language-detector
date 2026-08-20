import { Devvit, TriggerContext } from "@devvit/public-api";
import { handleDetection } from "./detectionHandler.js";
import { isAuthorBlacklisted } from "../helpers/authorBlacklist.js";

export async function handlePost(event: any, context: TriggerContext) {
    const author = event.post.author;
    if(isAuthorBlacklisted(author)) {
        return;
    }
    const postText = event.post.title + " " + (event.post.selftext || "");
    const postId = event.post.id;
    await handleDetection(postId, context, postText);
}