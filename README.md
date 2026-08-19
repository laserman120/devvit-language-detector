# Language Detector

An easy to use Moderation App to automatically report, filter or remove posts and comments written in various languages.

## Setup and installation:

### Installing the app in your subreddit:
- To add an App to a subreddit you need to be a moderator with sufficient permissions.
- You can then add the app by going to the App Page and pressing "Add to community"
- This will install it in the selected Subreddit and will open the App settings shortly after.

### Basic Configuration:

- To get started first select any **allowed** languages for your community.
    - If you notice false positives, for example the system might incorrectly confuse German and Dutch, it is recommended to select both options.

- Next select what action the app should take if it encounters a disallowed language. You can select between:
    - Report (This will Report the post/comment)
    - Filter (This will remove the post/comment and put it into the modqueue for review)
    - Remove (This will directly remove the post/comment)

### Advanced Configuration:

- You can also customize or adjust the Report/Removal reason.
    - It is recommended to keep {{LangName}}, this will show you which language was detected.

- If you use Filter or Remove you can enable a removal notification.
    - This will create a comment below the removed post/comment informing the author of the removal.
    - The removal message can be adjusted to fit your subreddit.
    - You can use these wildcards to further customize the message:
        - {{type}} - This is either post/comment
        - {{subredditName}} - the name of your subreddit without r/
        - {{authorName}} - the name of the author

## How the App works:

The app primarily relies on [franc-min](https://github.com/wooorm/franc) to detect different languages.
For reliable results longer text is required, this means the app will disregard very short comments.


## Changelog:
- 0.00.04
    - Initial Release