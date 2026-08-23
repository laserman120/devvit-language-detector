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
            helpText: 'Notify the Author by creating a comment below the original post/comment (Only applies if Action is set to Filter).',
        },
        {
            type: 'paragraph' as const,
            name: 'FILTER_MESSAGE',
            label: 'Filter Notification Message',
            defaultValue: 'Hello {{UserName}}, your {{type}} has been put into a queue for manual approval.\nBe aware that only {{type}}s in english are allowed on r/{{subredditName}}.\nIf your {{type}} follows the rules it will be approved as soon as possible\n\n*This action was performed automatically if you believe this is an error please reach out through our [modmail](https://www.reddit.com/message/compose?to=r/{{subredditName}}).*',
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
            helpText: 'Notify the Author by creating a comment below the original post/comment (Only applies if Action is set to Remove).',
        },
        {
            type: 'paragraph' as const,
            name: 'REMOVAL_MESSAGE',
            label: 'Removal Notification Message',
            defaultValue: 'Hello {{UserName}}, your {{type}} has been removed as it broke our rules.\nOnly {{type}}s in english are allowed on r/{{subredditName}}.\n\n*This action was performed automatically if you believe this is an error please reach out through our [modmail](https://www.reddit.com/message/compose?to=r/{{subredditName}}).*',
            scope: 'installation' as const,
            helpText: 'The message sent to the user when their content is removed.',
            onValidate: ({ value }:{ value?: string }) => {
                if (!value || value.length === 0) {
                    return 'Message cannot be empty. If you do not want to notify users, disable the toggle above.';
                }
            }
        },
        {
            type: 'select' as const,
            name: 'STRICTNESS',
            label: 'Detection Strictness',
            options: [
                { label: 'Strict', value: 'strict' },
                { label: 'Lenient', value: 'lenient' }
            ],
            defaultValue: ['lenient'],
            multiSelect: false,
            scope: 'installation' as const,
            helpText: 'Lenient (Default) tries to avoid false positives. Strict is more likely to create false positives but will more reliably catch non-permitted languages.',
            onValidate: ({ value }: { value?: string[] }) => {
                if (!value || value.length === 0) {
                    return 'You must select a strictness level. Lenient is recommended to avoid false positives.';
                }
            }
        },
    ]
};