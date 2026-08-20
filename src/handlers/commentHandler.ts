import { Devvit, TriggerContext } from "@devvit/public-api";
import { handleDetection } from "./detectionHandler.js";

export async function handleComment(event: any, context: TriggerContext) {
    const commentText = event.comment.body;
    const commentId = event.comment.id;
    await handleDetection(commentId, context, commentText);
}