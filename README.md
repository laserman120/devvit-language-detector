# Language Detector
An easy-to-use moderation app to automatically report, filter, or remove posts and comments written in unsupported languages.

## IMPORTANT
**Foreword on Accuracy:** 
Automated language detection is a complex statistical challenge and is never 100% precise. Slang, proper nouns, abbreviations, and mixed-language content can occasionally cause misidentifications. Because of this, we strongly recommend starting with **"Report" or "Filter"** rather than direct "Removal" until you are comfortable with how the app performs in your community.

---

## Setup and installation:

### Installing the app in your subreddit:
- To add the app to a subreddit, you must be a moderator with sufficient permissions.
- Go to the App Page and press "Add to community".
- This installs it in the selected subreddit and opens the app settings shortly after.

### Basic Configuration:
- First, select all allowed languages for your community.
    - If you notice a lot of false positives (e.g., the system incorrectly confuses German and Dutch), we recommend allowing both languages.

- Next, select the action the app should take if it encounters a disallowed language in a post or comment. You can select:
    - None (Do not scan for language)
    - Report (Reports the post/comment)
    - Filter (Removes the post/comment and sends it to the modqueue for review)
    - Remove (Directly removes the post/comment)

### Advanced Configuration:

- You can customize the report/removal reason.
    - We recommend keeping {{LangName}}, as this displays which language was detected.

- If you use Filter or Remove, you can enable a removal notification.
    - The notification can either be sent as a comment or through modmail.
    - The removal message can be adjusted to fit your subreddit.
    - You can use these wildcards to customize the message:
        - {{type}} - Displays either "post" or "comment".
        - {{subredditName}} - The name of your subreddit without the "r/" prefix.
        - {{userName}} - The username of the author.
        - {{PermaLink}} - The URL to the actioned item.
        - {{LangName}} - The written out name of the detected language.

- The App has two detection modes:
    - Lenient (Recommended) - Tries to avoid false positives but could lead to missed detections.
    - Strict - More likely to detect uses of disallowed languages but risks additional false positives.

- The Custom Whitelisted Words can be adjusted to decrease false positives.
    - Any words added to the list will be treated as part of the allowed languages, increasing the chance of correct detection.
    - It is recommended to add words to this list which are commonly used in your community.

---

## How the app works:
The app uses a hybrid pipeline combining high-frequency word lists (stopwords), script analysis, and statistical language identification (using [tinyld](https://www.npmjs.com/package/tinyld?activeTab=readme)) to analyze posts and comments.

Quick Filters & Whitelists: It first strips formatting, URLs, and quotes, checking against built-in and custom whitelists (such as internet slang) to quickly pass normal messages.

Script & Statistical Analysis: It examines character alphabets and linguistic patterns to determine the source language.

Safety Nets: Multiple fallback layers ensure that ambiguous or short text isn't wrongfully flagged.

**Note: While automated language detection cannot be 100% precise, this app requires no external API keys or additional costs.**

---

## Feedback:
By providing feedback on false positives, incorrectly identified languages and similar occurences we can make adjustments to improve the detection in the future.
If you want to send feedback you can always contact me [here](https://www.reddit.com/message/compose/?to=_GLAD0S_)

---

## Benchmarking:
Currently the system is benchmarked on roughly 35.000 texts of various length.
The exact list used in benchmarking can be found on [GitHub](https://github.com/laserman120/devvit-language-detector).
Any reported false positives are added to this list.

---

## Changelog:
- 0.00.22
    - Improved detection accuracy with a focus on short text.

- 0.00.21
    - Added {{PermaLink}} Wildcard to Link to the removed or filtered item.
    - Wildcard {{LangName}} is now also supported in removal notifications.
    - Further improved detection accuracy.

- 0.00.20
    - Adjusted detection thresholds
    - Added Modmail as a notification method.
    - Fixed incorrect wildcard for username.
    - Added update notification system.
    - Fixed missing languages in the detection system.

- 0.00.17
    - Switched from Franc-min to [tinyld](https://www.npmjs.com/package/tinyld?activeTab=readme).
    - Added additional fallbacks and detection systems.
    - Adjusted detection thresholds
        - The changes increased the detection accuracy by ~20% with a massive reduction in false positives.

- 0.00.13
    - Added Custom Whitelist setting.
    - Adjusted internal Whitelist.
    - Improved Text cleanup before detection.

- 0.00.11
    - Updated Word Whitelist to include GIF and IMAGE

- 0.00.10
    - Public Release

- 0.00.07
    - Initial Release