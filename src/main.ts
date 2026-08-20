import { Devvit } from "@devvit/public-api";
import { handlePost } from "./handlers/postHandler.js";
import { handleComment } from "./handlers/commentHandler.js";
import { languageDetectionGroup } from "./config/settings.js";

Devvit.addSettings([
  languageDetectionGroup
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

Devvit.configure({
  redditAPI: true,
});


export default Devvit;
