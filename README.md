# Language Detector

An easy-to-use moderation app to automatically report, filter, or remove posts and comments written in unsupported languages.

## Setup and installation:

### Installing the app in your subreddit:
- To add the app to a subreddit, you must be a moderator with sufficient permissions.
- Go to the App Page and press "Add to community".
- This installs it in the selected subreddit and opens the app settings shortly after.

### Basic Configuration:

- First, select all **allowed** languages for your community.
    - If you notice a lot of false positives (e.g., the system incorrectly confuses German and Dutch), we recommend allowing both languages.

- Next, select the action the app should take if it encounters a disallowed language in a post or comment. You can select:
    - None (Do not scan for language)
    - Report (Reports the post/comment)
    - Filter (Removes the post/comment and sends it to the modqueue for review)
    - Remove (Directly removes the post/comment)

### Advanced Configuration:

- You can customize the report/removal reason.
    - We recommend keeping `{{LangName}}`, as this displays which language was detected.

- If you use Filter or Remove, you can enable a removal notification.
    - This replies to the removed post/comment, informing the author of the removal.
    - The removal message can be adjusted to fit your subreddit.
    - You can use these wildcards to customize the message:
        - `{{type}}` - Displays either "post" or "comment"
        - `{{subredditName}}` - The name of your subreddit without the "r/" prefix
        - `{{authorName}}` - The username of the author

- The App has two detection modes:
    - Lenient (Recommended) - Tries to avoid false positives but could lead to missed detections.
    - Strict - More likely to detect uses of disallowed languages but risks additional false positives.

- The Custom Whitelisted Words can be adjusted to decrease false positives.
    - Any words added to the list will be treated as part of the allowed languages, increasing the chance of correct detection.
    - It is recommended to add words to this list which are commonly used in your community.

## How the app works:

Each post/comment is first scanned for common [stopwords](https://github.com/stopwords-iso/stopwords-iso) in the allowed languages. This check also includes the custom whitelist.
If enough stopwords are found, the system skips further detection.
*Stopwords are commonly used words such as articles, pronouns and prepositions.*

When the stopword check fails, it runs the text through [franc-min](https://github.com/wooorm/franc). Because Franc is unreliable on very short text, this only runs if sufficient text is available.

Currently anything below 30 characters is considered "too short" for franc-min to handle. This might be adjusted in the future.

If the text is too short, the system falls back on basic script analysis. It checks if the text contains a high density of characters belonging to unsupported alphabets (e.g., Cyrillic, Han). 

If the script is allowed (like Latin in english) and cannot be immediately blocked, it performs one final, highly strict stopword density check across all languages. This allows the system to confidently identify and moderate even very short phrases before giving up.

**Note: While automated language detection cannot be 100% precise, this app requires no external API keys or additional costs.**

## Feedback:

By providing feedback on false positives, incorrectly identified languages and similar occurences we can make adjustments to improve the detection in the future.
If you want to send feedback you can always contact me [here](https://www.reddit.com/message/compose/?to=_GLAD0S_)

## Changelog:
- 0.00.12
    - Added Custom Whitelist setting.
    - Adjusted internal Whitelist.
- 0.00.11
    - Updated Word Whitelist to include GIF and IMAGE
- 0.00.10
    - Public Release
- 0.00.07
    - Initial Release