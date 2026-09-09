export function stripFormattingAndUrls(rawText: string, ignoreCodeBlocks: boolean): string {
    let cleaned = rawText;
    
    if (ignoreCodeBlocks) {
        // Remove code blocks
        cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
        // Remove inline code
        cleaned = cleaned.replace(/`[^`]*`/g, ' ');
    }

    // Keep text from markdown links: [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove bare URLs
    cleaned = cleaned.replace(/(?:https?:\/\/|www\.)[^\s]+/gi, ' ');
    // Remove Reddit tags (r/subreddit, u/user)
    cleaned = cleaned.replace(/\b[ru]\/[^\s]+/gi, ' ');
    // Remove standard Markdown symbols (*, _, ~, >)
    cleaned = cleaned.replace(/[\*_~>]+/g, '');
    // Remove headers
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    // Reduce excessive character repetition (e.g., "uaaaaalgh" -> "uaalgh")
    cleaned = cleaned.replace(/(.)\1{2,}/g, '$1$1');

    return cleaned;
}