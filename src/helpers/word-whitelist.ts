// Whitelisted words are added to the StopWords list to prevent false positives in language detection.
// Global words apply to all languages and are primarily internet slang, abbreviations, and common expressions.
// Individual language words are added to the StopWords list for that specific language.

export const whitelistedWords: Record<string, string[]> = {
    global: ['lol', 'lmao', 'lmfao', 'wtf', 'omg', 'ok', 'okay', 'yes', 'no', 'idk', 'im', 'ur', 'gg', 'wp', 'ty', 'thx', 'pls', 'plz', 'xd', 'bro', 'bruh'],
    eng: ['user', 'play', 'nope', 'yep', 'yeah', 'nah', 'tbh', 'imo', 'fr', 'thanks', 'please'],
    spa: ['jaja', 'jajaja', 'si', 'sí', 'q', 'que', 'k', 'gracias', 'hola', 'buen', 'bien', 'wey', 'we', 'por'],
    fra: ['mdr', 'ptdr', 'ouais', 'oui', 'merci', 'slt', 'salut', 'svp', 'stp', 'bcp', 'tg'],
    deu: ['ja', 'nein', 'ne', 'nee', 'doch', 'danke', 'bitte', 'moin', 'servus', 'haha', 'geil', 'lg'],
    por: ['kkk', 'kkkk', 'rs', 'sim', 'nao', 'não', 'vlw', 'obg', 'vdd', 'ss', 'tbm', 'vc'],
    ita: ['si', 'sì', 'grazie', 'ciao', 'prego', 'cmq', 'xk', 'xke'],
    nld: ['ja', 'nee', 'dank', 'bedankt', 'hoi', 'hallo', 'doei', 'idd', 'sws', 'gwn']
};