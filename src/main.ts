import { Devvit } from "@devvit/public-api";
import { handlePost } from "./handlers/postHandler.js";
import { handleComment } from "./handlers/commentHandler.js";
import { languageDetectionGroup, languageSettingsGroup, notificationSettingsGroup, miscSettingsGroup } from "./config/settings.js";
import { checkForUpdates } from "./handlers/updateHandler.js";
import { createWeeklyReport, handleApproval } from "./handlers/dataHandler.js";

Devvit.addSettings([
  languageDetectionGroup,
  notificationSettingsGroup,
  languageSettingsGroup,
  miscSettingsGroup
]);

Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
      if (event.post && context) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        handlePost(event, context);
      }
  },
});

Devvit.addTrigger({
  event: 'CommentSubmit',
  onEvent: async (event, context) => {
      if (event.comment && context) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        handleComment(event, context);
      }
  },
});

Devvit.addTrigger({
  event: 'ModAction',
  onEvent: async (event, context) => {
      if (event.action && context) {
        if(event.action ===  "approvelink" || event.action === "approvecomment") {
          await new Promise(resolve => setTimeout(resolve, 4000));
          handleApproval(event, context);
        }
        return;
        
      }
  },
});

Devvit.addSchedulerJob({
  name: 'check_for_updates',
  onRun: checkForUpdates,
});

Devvit.addSchedulerJob({
  name: 'create_weekly_report',
  onRun: createWeeklyReport,
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
        console.log(`[Setup] Scheduled update check job with ID: ${jobId}`);

        checkForUpdates(_event, context);

        const weeklyReportJobId = await context.scheduler.runJob({
          name: 'create_weekly_report',
          cron: '0 0 * * 6', // Run once every Saturday at midnight
        });
        console.log(`[Setup] Scheduled weekly report job with ID: ${weeklyReportJobId}`);

        } catch (error) {
          console.error(`[Setup] Error during job setup: ${error}`);
        }
  },
});


Devvit.configure({
  redditAPI: true,
});


export default Devvit;
