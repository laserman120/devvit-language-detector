import { JobContext } from "@devvit/public-api";

const devSubreddit = 'language_detector_dev';

export async function checkForUpdates(event: any, context: JobContext): Promise<void> {
    try{ 
        console.log("[UpdateCheck] Checking for updates...");
        const isV2 = await context.reddit.isWikiV2Enabled(devSubreddit);
        let wikiPage;
        if (isV2) {
            wikiPage = await context.reddit.getWikiPage(devSubreddit, 'index', { wikiVersion: 'v2' });
        } else {
            wikiPage = await context.reddit.getWikiPage(devSubreddit, 'index');
        }

        if(!wikiPage || !wikiPage.content) {
            console.error('[Update Check] Wiki page not found or empty.');
            return;
        }
        const latestVersion = wikiPage.content.trim();

        // Get the stored version from Redis
        const storedVersion = await context.redis.get('app:version');
        if(!storedVersion || storedVersion == undefined){
            console.log("[UpdateCheck] No stored version found, setting to current.");
            await context.redis.set('app:version', latestVersion);
            return;
        }

        if (storedVersion && storedVersion !== latestVersion) {
            console.log("[UpdateCheck] New version found, sending notification.");
            const currentSub = await context.reddit.getCurrentSubreddit();
            // New version found, notify mods via modmail
            await context.reddit.modMail.createConversation({
            subredditName: currentSub.name,
            subject: 'Language Detector: App Update Available',
            body: `A new version of the app is available!\n\n**Previous version:** ${storedVersion}\n**New version:** ${latestVersion}\n\nThe changelog can be found here: https://developers.reddit.com/apps/language-detector\n\n**To update the app please visit:** https://developers.reddit.com/r/${currentSub.name}/apps **and press "Update".**`,
            to: null,
            isAuthorHidden: true,
            });
        }

        // Update Redis with the latest version
        await context.redis.set('app:version', latestVersion);
        console.log("[UpdateCheck] Update Check Complete");
    } catch (error) {
        console.error(`[Update Check] Error checking for updates: ${error}`);
    }
}