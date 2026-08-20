import { Devvit, TriggerContext } from "@devvit/public-api";
import { handleDetection } from "./detectionHandler.js";

export async function handlePost(event: any, context: TriggerContext) {
    const postText = event.post.title + " " + (event.post.selftext || "");
    const postId = event.post.id;
    await handleDetection(postId, context, postText);
}