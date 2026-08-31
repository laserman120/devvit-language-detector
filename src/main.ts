import { Devvit } from "@devvit/public-api";
import { handlePost } from "./handlers/postHandler.js";
import { handleComment } from "./handlers/commentHandler.js";
import { languageDetectionGroup, languageSettingsGroup, notificationSettingsGroup } from "./config/settings.js";
import { checkForUpdates } from "./handlers/updateHandler.js";

Devvit.addSettings([
  languageDetectionGroup,
  notificationSettingsGroup,
  languageSettingsGroup
]);

Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
      if (event.post && context) {
          handlePost(event, context);
      }
  },
});

Devvit.addTrigger({
  event: 'CommentSubmit',
  onEvent: async (event, context) => {
      if (event.comment && context) {
        handleComment(event, context);
      }
  },
});

Devvit.addSchedulerJob({
  name: 'check_for_updates',
  onRun: checkForUpdates,
});

Devvit.addTrigger({
  events: ['AppInstall', 'AppUpgrade'],
  onEvent: async (_event, context) => {
      try {
          const jobs = await context.scheduler.listJobs();
          for (const job of jobs) {
              console.log(`[Setup] Cancelling existing job: ${job.id}`);
              await context.scheduler.cancelJob(job.id);
          }

          const jobId = await context.scheduler.runJob({
            name: 'check_for_updates',
            cron: '0 * * * *', // Run once every hour at minute 0
        });
        console.error(`[Setup] Scheduled update check job with ID: ${jobId}`);

        } catch (error) {
          console.error(`[Setup] Error during job setup: ${error}`);
        }
  },
});


Devvit.configure({
  redditAPI: true,
});


export default Devvit;
