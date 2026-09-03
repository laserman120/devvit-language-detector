import { Comment, Post, TriggerContext } from "@devvit/public-api";


export async function sendRemovalNotification(context: TriggerContext, item: Post | Comment, type: String, langName: string) {
    let notifyAuthor;
    let rawMessage;
    if(type === "filter") {
        notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR_FILTER');
        rawMessage = await context.settings.get<string>('FILTER_MESSAGE') ?? '';
    } else if(type === "removal") {
        notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR_REMOVAL');
        rawMessage = await context.settings.get<string>('REMOVAL_MESSAGE') ?? '';
    }

    if (!notifyAuthor) return;

    const authorName = item.authorName;
    const subredditName = item.subredditName;
    const itemType = item.id.startsWith("t3_") ? 'post' : 'comment';
    const permaLink = item.permalink;
    
    if(!rawMessage){
        return;
    }
    const message = await replaceWildcards(rawMessage, item);

    const notificationMethod = await context.settings.get<string[]>('NOTIFICATION_METHOD') ?? ['comment'];
    if (notificationMethod[0] === 'modmail') {
        const modmailSubjectRaw = await context.settings.get<string>('MODMAIL_SUBJECT') ?? `Notice regarding your recent ${itemType} in r/${subredditName}`;
        const modmailSubject = await replaceWildcards(modmailSubjectRaw, item);
        await context.reddit.modMail.createConversation({
            subredditName: subredditName,
            subject: modmailSubject,
            body: message,
            to: authorName,
            isAuthorHidden: true,
        });
        console.log(`[${item.id}] Sent modmail notification (${type})`);
    } else {
        const comment = await context.reddit.submitComment({
            id: item.id,
            text: message,
        });
        await comment.distinguish(true);
        console.log(`[${item.id}] Left comment notification (${type})`);
    }
}

export async function replaceWildcards(message: string, item: Post | Comment, langName?: string): Promise<string> {
    const authorName = item.authorName;
    const subredditName = item.subredditName;
    const itemType = item.id.startsWith("t3_") ? 'post' : 'comment';
    const permaLink = item.permalink;


    let replacedMessage = message;
    replacedMessage = message.replace(/{{type}}/gi, itemType)
        .replace(/{{subredditName}}/gi, subredditName)
        .replace(/{{UserName}}/gi, authorName)
        .replace(/{{PermaLink}}/gi, permaLink);

    if(langName){
        replacedMessage = replacedMessage.replace(/{{langName}}/gi, langName);
    }

    return replacedMessage;
}