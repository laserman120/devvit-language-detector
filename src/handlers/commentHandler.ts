import { Devvit, TriggerContext } from "@devvit/public-api";
import { detectLanguage } from "../helpers/languageDetection.js"
import { handleDetection } from "./detectionHandler.js";

export async function handleComment(event: any, context: TriggerContext) {
    const commentText = event.comment.body

    let langCode = "und"; // Default to undefined language code
    let commentId = event.comment.id;
    if(commentText.trim().length >= 15){
        langCode = detectLanguage(commentText);
        console.log(`Detected language code: ${langCode}`);
    } else {
        // Fallback for short content (TODO)

    }

    if(langCode == "und"){
        console.log(`Comment ${commentId} language could not be detected. Skipping.`);
        return;
    }

    await handleDetection(commentId, context, langCode);
}