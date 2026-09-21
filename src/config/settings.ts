const languageOptions = [
    { label: 'English', value: 'eng' },
    { label: 'Mandarin Chinese', value: 'cmn' },
    { label: 'Hindi', value: 'hin' },
    { label: 'Spanish', value: 'spa' },
    { label: 'French', value: 'fra' },
    { label: 'Arabic', value: 'arb' },
    { label: 'Bengali', value: 'ben' },
    { label: 'Russian', value: 'rus' },
    { label: 'Portuguese', value: 'por' },
    { label: 'Urdu', value: 'urd' },
    { label: 'Indonesian', value: 'ind' },
    { label: 'German', value: 'deu' },
    { label: 'Japanese', value: 'jpn' },
    { label: 'Marathi', value: 'mar' },
    { label: 'Telugu', value: 'tel' },
    { label: 'Turkish', value: 'tur' },
    { label: 'Tamil', value: 'tam' },
    { label: 'Vietnamese', value: 'vie' },
    { label: 'Tagalog', value: 'tgl' },
    { label: 'Korean', value: 'kor' },
    { label: 'Persian', value: 'pes' },
    { label: 'Polish', value: 'pol' },
    { label: 'Italian', value: 'ita' },
    { label: 'Dutch', value: 'nld' },
    { label: 'Romanian', value: 'ron' },
    { label: 'Greek', value: 'ell' },
    { label: 'Czech', value: 'ces' },
    { label: 'Swedish', value: 'swe' },
    { label: 'Hungarian', value: 'hun' },
    { label: 'Finnish', value: 'fin' }
];

export const languageDetectionGroup = {
    type: 'group' as const,
    label: 'Language Detection',
    helpText: 'Configure automatic actions for content in non-permitted languages.',
    fields: [
        {
            type: 'select' as const,
            name: 'ALLOWED_LANGUAGES',
            label: 'Allowed Languages',
            options: languageOptions,
            multiSelect: true,
            defaultValue: ['eng'],
            scope: 'installation' as const,
            helpText: 'Select the languages that are permitted.',
            onValidate: ({ value }: { value?: string[] }) => {
                if (!value || value.length === 0) {
                    return 'You must select at least one allowed language. If you want to disable the app, change the Actions below to "None".';
                }
            }
        },
        {
            type: 'select' as const,
            name: 'ACTION_ON_UNSUPPORTED_POST',
            label: 'Action on Posts',
            options: [
                { label: 'None', value: 'none' },
                { label: 'Report', value: 'report' },
                { label: 'Filter', value: 'filter' },
                { label: 'Remove', value: 'remove' }
            ],
            defaultValue: ['report'],
            multiSelect: false,
            scope: 'installation' as const,
            helpText: 'Select the action to take when an unsupported language is detected on a post.',
            onValidate: ({ value }: { value?: string[] }) => {
                if (!value || value.length === 0) {
                    return 'You must select an action. Select "None" to disable.';
                }
            }
        },
        {
            type: 'select' as const,
            name: 'ACTION_ON_UNSUPPORTED_COMMENT',
            label: 'Action on Comments',
            options: [
                { label: 'None', value: 'none' },
                { label: 'Report', value: 'report' },
                { label: 'Filter', value: 'filter' },
                { label: 'Remove', value: 'remove' }
            ],
            defaultValue: ['report'],
            multiSelect: false,
            scope: 'installation' as const,
            helpText: 'Select the action to take when an unsupported language is detected on a comment.',
            onValidate: ({ value }: { value?: string[] }) => {
                if (!value || value.length === 0) {
                    return 'You must select an action. Select "None" to disable.';
                }
            }
        }
    ]
};

export const notificationSettingsGroup = {
    type: 'group' as const,
    label: 'Notification Settings',
    helpText: 'Configure how users are notified when their content is filtered or removed.',
    fields: [
        {
            type: 'select' as const,
            name: 'NOTIFICATION_METHOD',
            label: 'Notification Method',
            options: [
                { label: 'Comment', value: 'comment' },
                { label: 'Modmail', value: 'modmail' }
            ],
            defaultValue: ['comment'],
            multiSelect: false,
            scope: 'installation' as const,
            helpText: 'Select how the user should be notified if their content is filtered or removed.',
            onValidate: ({ value }: { value?: string[] }) => {
                if (!value || value.length === 0) {
                    return 'You must select a notification method.';
                }
            }
        },
        {
            type: 'string' as const,
            name: 'MODMAIL_SUBJECT',
            label: 'ModMail Subject',
            defaultValue: `Notice regarding your recent {{type}} in r/{{subredditName}}`,
            scope: 'installation' as const,
            helpText: 'The subject used when sending a modmail to the user regarding their filtered or removed content. (Only used in ModMail)',
            onValidate: ({ value }:{ value?: string }) => {
                if (!value || value.length === 0) {
                    return 'Reason cannot be empty.';
                }
            }
        },
        {
            type: 'string' as const,
            name: 'ACTION_REASON',
            label: 'Report/Removal Reason',
            defaultValue: 'Language not allowed: {{LangName}}',
            scope: 'installation' as const,
            helpText: 'The reason shown in the ModQueue/RemovalQueue for the report or removal.',
            onValidate: ({ value }:{ value?: string }) => {
                if (!value || value.length === 0) {
                    return 'Reason cannot be empty.';
                }
            }
        },
        {
            type: 'boolean' as const,
            name: 'NOTIFY_AUTHOR_FILTER',
            label: 'Notify of Filtering',
            defaultValue: true,
            scope: 'installation' as const,
            helpText: 'Notify the Author by creating a comment or by sending a modmail (Only applies if Action is set to Filter).',
        },
        {
            type: 'paragraph' as const,
            name: 'FILTER_MESSAGE',
            label: 'Filter Notification Message',
            defaultValue: 'Hello {{UserName}}, your [{{type}}]({{permalink}}) has been put into a queue for manual approval.\nBe aware that only {{type}}s in english are allowed on r/{{subredditName}}.\nIf your {{type}} follows the rules it will be approved as soon as possible\n\n*This action was performed automatically if you believe this is an error please reach out through our [modmail](https://www.reddit.com/message/compose?to=r/{{subredditName}}).*',
            scope: 'installation' as const,
            helpText: 'The message sent to the user when their content is filtered.',
            onValidate: ({ value }:{ value?: string }) => {
                if (!value || value.length === 0) {
                    return 'Message cannot be empty. If you do not want to notify users, disable the toggle above.';
                }
            }
        },
        {
            type: 'boolean' as const,
            name: 'NOTIFY_AUTHOR_REMOVAL',
            label: 'Notify of Removal',
            defaultValue: true,
            scope: 'installation' as const,
            helpText: 'Notify the Author by creating a comment or by sending a modmail (Only applies if Action is set to Remove).',
        },
        {
            type: 'paragraph' as const,
            name: 'REMOVAL_MESSAGE',
            label: 'Removal Notification Message',
            defaultValue: 'Hello {{userName}}, your [{{type}}]({{permalink}}) has been removed as it broke our rules.\nOnly {{type}}s in english are allowed on r/{{subredditName}}.\n\n*This action was performed automatically if you believe this is an error please reach out through our [modmail](https://www.reddit.com/message/compose?to=r/{{subredditName}}).*',
            scope: 'installation' as const,
            helpText: 'The message sent to the user when their content is removed.',
            onValidate: ({ value }:{ value?: string }) => {
                if (!value || value.length === 0) {
                    return 'Message cannot be empty. If you do not want to notify users, disable the toggle above.';
                }
            }
        }
    ]
};

export const languageSettingsGroup = {
    type: 'group' as const,
    label: 'Detection Settings',
    helpText: 'Configure the detection system itself.',
    fields: [
        {
            type: 'select' as const,
            name: 'STRICTNESS',
            label: 'Detection Strictness',
            options: [
                { label: 'Aggressive Filtering', value: 'strict' },
                { label: 'High Accuracy (Recommended)', value: 'lenient' }
            ],
            defaultValue: ['lenient'],
            multiSelect: false,
            scope: 'installation' as const,
            helpText: 'High Accuracy is recommended. Aggressive Filtering may result in false positives, but can catch more non-permitted languages.',
            onValidate: ({ value }: { value?: string[] }) => {
                if (!value || value.length === 0) {
                    return 'You must select a strictness level. Lenient is recommended to avoid false positives.';
                }
            }
        },
        {
            type: 'boolean' as const,
            name: 'IGNORE_CODE_BLOCKS',
            label: 'Ignore code blocks and inline code',
            defaultValue: false,
            scope: 'installation' as const,
            helpText: 'Will, if enabled ignore code blocks and inline code. Only recommended for subreddits that use code blocks frequently for their intended purpose',
        },
        {
            type: 'boolean' as const,
            name: 'INCREASE_MIN_WORDS',
            label: 'Increase minimum word count for detection',
            defaultValue: false,
            scope: 'installation' as const,
            helpText: 'By default the system requires at least 2 words to perform a complete scan. Enabling this option will increase the minimum to 3, reducing the chance of false positives further.',
        },
        {
            type: 'string' as const,
            name: 'CUSTOM_WHITELIST',
            label: 'Custom Whitelisted Words (StopWords)',
            defaultValue: '',
            scope: 'installation' as const,
            helpText: 'Add custom words to the allowed languages. Separate words with commas or semicolons (e.g., Forest; Cake; Banana).',
            onValidate: ({ value }: { value?: string }) => {
                if (value) {
                    if (value.length > 1000) {
                        return 'Custom whitelist is too long. Please keep it under 1000 characters.';
                    }
                    const words = value.split(/[,;]+/);
                    for (const word of words) {
                        const trimmed = word.trim();
                        if (trimmed.length > 0 && /\s/.test(trimmed)) {
                            return `Invalid entry "${trimmed}". Only single words are allowed, no spaces.`;
                        }
                    }
                }
            }
        },
        {
            type: 'string' as const,
            name: 'CUSTOM_IGNORED',
            label: 'Custom Ignored Words',
            defaultValue: '',
            scope: 'installation' as const,
            helpText: 'Any words added here are completely ignored by the detection system. Separate words with commas or semicolons (e.g., Forest; Cake; Banana).',
            onValidate: ({ value }: { value?: string }) => {
                if (value) {
                    if (value.length > 1000) {
                        return 'Custom whitelist is too long. Please keep it under 1000 characters.';
                    }
                    const words = value.split(/[,;]+/);
                    for (const word of words) {
                        const trimmed = word.trim();
                        if (trimmed.length > 0 && /\s/.test(trimmed)) {
                            return `Invalid entry "${trimmed}". Only single words are allowed, no spaces.`;
                        }
                    }
                }
            }
        },
    ]
};

export const miscSettingsGroup = {
    type: 'group' as const,
    label: 'General Settings',
    helpText: 'Configure miscellaneous settings for app',
    fields: [
        {
            type: 'boolean' as const,
            name: 'IGNORE_UPDATE_NOTIFICATIONS',
            label: 'Ignore Update Notifications',
            defaultValue: false,
            scope: 'installation' as const,
            helpText: 'If enabled, the app will not notify moderators of new updates. It is recommended to keep the app up to date to ensure high accuracy.',
        },
        {
            type: 'boolean' as const,
            name: 'DATA_COLLECTION',
            label: 'Help Improve the App (False Positive Collection)',
            defaultValue: false,
            scope: 'installation' as const,
            helpText: 'Please read the information regarding this system in the apps directory page before enabling! If enabled, the app will keep track of detections which were approved later on. This data will be completely anonymized and then sent to the developer for analysis.',
        },
    ]
};