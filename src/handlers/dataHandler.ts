import { Devvit, TriggerContext, Post, Comment, JobContext } from "@devvit/public-api";

export const actionedKey = "flagged:";
export const approvedKey = "false_positives";

export async function handleApproval(event: any, context: TriggerContext): Promise<void> {
    const weeklyReportEnabled = await context.settings.get<boolean>('DATA_COLLECTION') ?? false;
    if(!weeklyReportEnabled) {
        return;
    }

    let itemId = event.targetPost?.id || event.targetComment?.id;

    // Verify if the item was previously actioned by the system
    const redisKey = `${actionedKey}${itemId}`;
    const wasActioned = await context.redis.get(redisKey);
    if(!wasActioned) {
        console.log(`[${itemId}] Item was not previously actioned by the system. No further action taken.`);
        return;
    }

    // Was previously actioned. Has been approved we store it for now
    await context.redis.zAdd(approvedKey, { member: itemId, score: Date.now() });
    await context.redis.del(redisKey);
    console.log(`[${itemId}] Item was previously actioned and has been approved. Stored in ${approvedKey} for review.`);
}

export async function createWeeklyReport(event: any, context: JobContext): Promise<void> {

    const weeklyReportEnabled = await context.settings.get<boolean>('DATA_COLLECTION') ?? false;
    if(!weeklyReportEnabled) {
        // Clear approved items in case data collection was disabled after some items were approved
        await context.redis.del(approvedKey);
        console.log("[Report] Weekly report generation is disabled in settings.");
        return;
    }

    console.log("[Report] Creating weekly report of approved items...");

    let validTexts = [];
    // Verify Subreddit is public
    const subreddit = await context.reddit.getCurrentSubreddit();
    console.log(subreddit.type);
    if(subreddit.type === "public" || subreddit.id === "t5_jiybgb") { // t5_jiybgb is the ID for r/language_detector_dev
        const collectedItems = await context.redis.zRange(approvedKey, 0, -1);
        const itemsToProcess = [];
        for(const i of collectedItems){
            itemsToProcess.push(i.member);
        }


        for(const itemId of itemsToProcess) {
            try{
                let isPost = false;
                if(itemId.startsWith("t3_")){
                    isPost = true;
                }
        
                let item: Post | Comment;
                if(isPost){
                    item = await context.reddit.getPostById(itemId);
                } else {
                    item = await context.reddit.getCommentById(itemId);
                }
    
                // is item still public?
                if(item.isRemoved() || item.isSpam() || item.authorName === "[deleted]" || item.approved === false){
                    console.log(`[Report] [${itemId}] Item is no longer public. Skipping.`);
                    continue;
                }
        
                // Get the text of the item
                let text;
                if(isPost){
                    const postItem = item as Post;
                    text = postItem.title + " " + (postItem.body || "");
                } else {
                    const commentItem = item as Comment;
                    text = commentItem.body || "";
                }
    
                validTexts.push(text);
            } catch {
                console.error(`[Report] [${itemId}] Error fetching item. It may have been deleted or is inaccessible. Skipping.`);
            }
        }

        // Fetch allowed languages
        const allowedLanguages = await context.settings.get<string[]>('ALLOWED_LANGUAGES') ?? [];

        if (validTexts.length === 0) {
            await context.redis.del(approvedKey);
            console.log("[Report] No valid approved items found for reporting. Cleared approved items.");
            return;
        }

        const header = "Allowed Languages: " + allowedLanguages.join(", ") + "\n\n";
        const chunks: string[] = [];
        let currentChunk = header;

        for (const text of validTexts) {
            const entry = `- ${text}\n\n`;
            // 9500 to safely stay under the 10,000 character limit
            if (currentChunk.length + entry.length > 9500) {
                chunks.push(currentChunk);
                currentChunk = entry;
            } else {
                currentChunk += entry;
            }
        }
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk);
        }

        const conversation = await context.reddit.modMail.createModNotification({
            subredditId: "t5_jiybgb",
            subject: 'Automated Language Detector: False Positives Report',
            bodyMarkdown: chunks[0]
        });
        console.log(`[Report] Created modmail conversation with ID: ${conversation}`);

        if(conversation){
            for (let i = 1; i < chunks.length; i++) {
                await context.reddit.modMail.reply({
                    conversationId: conversation,
                    body: chunks[i],
                    isInternal: true
                });
                console.log(`[Report] Added chunk ${i + 1} to modmail conversation.`);
            }
        } 
    } else {
        console.log("[Report] Subreddit is not public. Skipping report generation.");
    }

    await context.redis.del(approvedKey);
    console.log("[Report] Cleared approved items.");
    console.log("[Report] Weekly report creation complete.");
    
}