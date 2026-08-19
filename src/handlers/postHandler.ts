import { Devvit, TriggerContext } from "@devvit/public-api";
import { detectLanguage } from "../helpers/languageDetection.js"
import { handleDetection } from "./detectionHandler.js";

export async function handlePost(event: any, context: TriggerContext) {
    const postText = event.post.title + " " + event.post.selftext;

    let langCode = "und"; // Default to undefined language code
    let postId = event.post.id;
    if(postText.trim().length >= 15){
        langCode = detectLanguage(postText);
        console.log(`Detected language code: ${langCode}`);
    } else {
        // Fallback for short content (TODO)

    }

    if(langCode == "und"){
        console.log(`Post ${postId} language could not be detected. Skipping.`);
        return;
    }

    await handleDetection(postId, context, langCode);
}