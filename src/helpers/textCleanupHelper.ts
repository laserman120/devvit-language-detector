export function stripFormattingAndUrls(rawText: string): string {
    let cleaned = rawText;
    
    // Remove code blocks
    cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
    // Remove inline code
    cleaned = cleaned.replace(/`[^`]*`/g, ' ');
    // Keep text from markdown links: [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove bare URLs
    cleaned = cleaned.replace(/(?:https?:\/\/|www\.)[^\s]+/gi, ' ');
    // Remove standard Markdown symbols (*, _, ~, >)
    cleaned = cleaned.replace(/[\*_~>]+/g, '');
    // Remove headers
    cleaned = cleaned.replace(/^#+\s+/gm, '');
    
    return cleaned;
}