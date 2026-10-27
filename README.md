# Language Detector
An automated moderation app that detects the language of posts, comments, and user messages—allowing you to automatically **report, filter, or remove content written in foreign, non-English, or unsupported languages**.

Whether you run an **English only subreddit**, a regional community, or a multilingual space that allows several specific languages, Language Detector helps enforce your community's language rules without manual moderation or external API keys.

## Key Features & Use Cases
- **Enforce Community Language Rules:** Automatically catch and action posts or comments written in disallowed or foreign languages (supports 60+ languages, including English, Spanish, French, German, Portuguese, Russian, Chinese, Japanese, Arabic, Hindi, and more).
- **Flexible Moderation Actions:** Choose to **Report**, **Filter to the Modqueue**, or **Remove** messages that are not in your allowed languages—with separate settings for posts and comments.
- **Automated Removal Notifications:** Optionally notify users via a stickied reply comment or Modmail when their post or comment is removed or filtered, including customizable wildcards (`{{LangName}}`, `{{type}}`, `{{PermaLink}}`).
- **Non-Latin Script & Alphabet Detection:** Instantly identifies non-Latin alphabets and scripts (such as Cyrillic, Arabic, Hanzi/Kanji, Hangul, Devanagari, Greek, and Hebrew) even on short messages.
- **Built for Real Reddit Conversations:** Includes configurable **custom whitelists**, **ignored word lists** (for foreign loanwords or gaming/community terms), **code-block exclusions**, and **edit monitoring** so legitimate posts aren't caught by mistake.

---

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
    - High Accuracy (Recommended) - Tries to avoid false positives but could lead to missed detections.
    - Aggressive Filtering - More likely to detect uses of disallowed languages but risks additional false positives.

- Filter edits of flagged items:
    - This setting will keep track of items which were previously removed or filtered.
    - If the author edits the comment and is now in an allowed language, this system will filter it again.
    - That way the post or comment appears in the mod queue to be reviewed again.

- Ignore code blocks and inline code:
    - This will completely ignore code blocks as well as inline code in posts or comments.
    - For subreddits which have a focus on coding, this setting can be used to reduce false positives.

- Increase minimum word count for detection:
    - If you encounter a lot of false positives on very short comments, this setting can be enabled.
    - Very short text is only partially scanned for very obvious language identifiers. 
    - This setting will increase the amount of words required to perform a complete scan.

- Custom Whitelisted Words:
    - Any words added to the list will be treated as part of the allowed languages, increasing the chance of correct detection.
    - It is recommended to add words to this list which are commonly used in your community.
    - This is primarily meant for words already in the allowed language, but uncommon in average conversations.

- Custom Ignored Words:
    - Words added to this list will be completely ignored by the system. 
    - Unlike whitelisted words they are completely removed from the text before scanning.
    - If your subreddit commonly uses words from **another language** these should be added here.

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

### Automated False Positive Detection
The app has an optional setting to allow false positive detection.

Before enabling this system it is **highly recommended** to read this: [False Positive Detection](https://github.com/laserman120/devvit-language-detector/wiki/False-Positive-Detection-Information)

---

## Benchmarking:
Currently the system is benchmarked on roughly 35.000 texts of various length.
The exact list used in benchmarking can be found on [GitHub](https://github.com/laserman120/devvit-language-detector).
Any reported false positives are added to this list.

---

## Changelog:
- 0.00.xx
    - Rewrote the detection code to be roughly 45x faster.
    - Detection accuracy has been improved for both High Accuracy and Aggressive Filtering
    - Added seperate settings to enable/disable notifications on removal or filter for posts or comments.
        - For example this allows the system to only create a notification for posts, but not comments.

- 0.00.28
    - Added edit detection system which can be enabled in the setting.
        - When an item which was previously filtered or removed is edited and now detected as allowed, it will filter the item again to put it back into the queue.
        - This can only occur on posts which were automatically removed or filtered.
    - The app will no longer take action on moderator posts/comments.
        - This can be reenabled in the settings.
    - Improved accuracy.

- 0.00.26
    - Implemented setting to mute update notifications.
    - Implemented setting to automatically detect false positives (Opt-In only)
    - Renamed the Lenient and Strict settings for more clarity.
    - Improved detection accuracy.
    - Improved text pre-filtering to better exclude model numbers.
    - Improved detection of already removed content, preventing it from actioning already removed items.

Older patch notes can be viewed on [GitHub](https://github.com/laserman120/devvit-language-detector/wiki/Changelog)