// Whitelisted words are added to the StopWords list to prevent false positives in language detection.
// Global words apply to all languages and are primarily internet slang, abbreviations, and common expressions.
// Individual language words are added to the StopWords list for that specific language.

export const whitelistedWords: Record<string, string[]> = {
    global: [
        '( ͡° ͜ʖ ͡°)', '(* ^ ω ^)', '(´･ω･`)', '(╯°□°）╯︵ ┻━┻', '(◕‿◕✿)', "(ง'̀-'́)ง",
        '＼(＾o＾)／', '¯_(ツ)_/¯', '¯\\_(ツ)_/¯', '┬─┬ノ( º _ ºノ)', 'admin', 'afk', 'ai',
        'alexa', 'ama', 'amazon', 'amd', 'app', 'apple', 'argh', 'asap', 'assistant',
        'auto', 'automod', 'automoderator', 'aww', 'awww', 'bard', 'bitcoin', 'bixby',
        'bluetooth', 'bot', 'bro', 'browser', 'bruh', 'btc', 'btw', 'buff', 'bug',
        'chatgpt', 'claude', 'cortana', 'crypto', 'discord', 'disney', 'displayport',
        'dlc', 'dm', 'downvote', 'dr', 'earbuds', 'edit', 'eli5', 'email', 'eth',
        'ethernet', 'eww', 'facebook', 'falcon', 'faq', 'fomo', 'fps', 'fyi', 'gemini',
        'gg', 'gif', 'google', 'gpt', 'haha', 'hardware', 'hashtag', 'hdmi', 'hihi',
        'hmm', 'hmmm', 'hodl', 'home', 'hulu', 'idk', 'im', 'image', 'instagram',
        'intel', 'internet', 'irl', 'iso', 'karma', 'lag', 'laptop', 'lfo', 'lightning',
        'link', 'linkedin', 'llama', 'lmao', 'lmfao', 'lol', 'meme', 'microsoft',
        'mistral', 'mmo', 'mod', 'moderator', 'moderators', 'mods', 'mpt', 'nerf',
        'netflix', 'nft', 'no', 'noob', 'npc', 'nsfw', 'nvidia', 'offline', 'ok', 'okay',
        'omg', 'online', 'oof', 'op', 'orca', 'ouch', 'patch', 'pc', 'ping', 'pixel',
        'pls', 'plz', 'pm', 'prime', 'ps5', 'pve', 'pvp', 'pythia', 'qualcomm', 'reddit',
        'repost', 'rip', 'rng', 'router', 'rpg', 'samsung', 'server', 'sfw', 'siri',
        'slack', 'smart', 'smartphone', 'smartwatch', 'snapchat', 'software', 'soundbar',
        'spotify', 'stockholm', 'stream', 'subreddit', 'switch', 'tablet', 'thunderbolt',
        'thx', 'tiktok', 'tl', 'tom', 'troll', 'twitch', 'twitter', 'ty', 'uaalgh',
        'ueegh', 'ugh', 'update', 'upvote', 'ur', 'url', 'usb', 'versus', 'vga', 'video',
        'vs', 'wah', 'web', 'wifi', 'woho', 'wohoo', 'woohoo', 'wp', 'wtf', 'xbox', 'xd',
        'yes', 'yikes', 'youtube', 'ʕ•ᴥ•ʔ', 'ಠ_ಠ', 'ಥ_ಥ', "sidebar", "username"
    ],
    eng: [
        'acres', 'agree', 'amazed', 'amazing', 'amazingly', 'angeles', 'asap', 'awesome',
        'bad', 'badass', 'based', 'beloved', 'bet', 'botanical', 'bra', 'breaking',
        'bro', 'cam', 'cams', 'cannabis', 'cap', 'cargo', 'cave', 'chad', 'comment',
        'cool', 'cringe', 'damn', 'day', 'disrespect', 'diver', 'divers', 'dope',
        'downvote', 'drinkin', 'drive', 'dude', 'dunno', 'edit', 'exciting', 'fake',
        'false', 'fam', 'feel', 'fine', 'flex', 'folk', 'folks', 'fuck', 'fuckin',
        "fuckin'", 'fucking', 'garden', 'gateway', 'giga', 'gimme', 'girl', 'girls',
        'goat', 'goated', 'gonna', 'gotcha', 'gotta', 'guy', 'hate', 'highkey', 'hit',
        'homemade', 'homie', 'imo', 'karma', 'kinda', 'kit', 'leave', 'lemme', 'lens',
        'life', 'link', 'lit', 'lotta', 'loud', 'lowkey', 'lut', 'meta', 'metro', 'mid',
        'mod', 'mods', 'mold', 'moldiest', 'moldy', 'mood', 'movie', 'nah', 'nice',
        'nocap', 'node', 'nope', "northern", 'nsfw', 'obtuse', 'oof', 'ova', 'peak', 'people',
        'pepe', 'periodt', 'person', 'pic', 'picture', 'play', 'pog', 'poggers', "sesame",
        'popcorn', 'post', 'pretty', 'public', 'question', 'rack', 'ranges', 'real',
        'recipe', 'resolve', 'review', 'rn', 'seedlings', 'seeds', 'sfw', 'shelve',
        'shelves', 'shit', 'sigma', 'simp', 'slaps', 'slop', 'sneak', 'song', 'songs',
        'sorta', 'source', 'stations', 'stopped', 'stuff', 'subreddit', 'super', 'sus',
        'tbh', 'team', 'terminally', 'thread', 'time', 'true', 'underrated', 'user',
        'vibe', 'vibes', 'walking', 'wanna', 'weapon', 'weed', 'worst', 'wow', 'wrong',
        'yall', 'yay', 'yeah', 'yep', 'yikes', "voigtlander", " viltrox", "photos", "stunning", "menu", "sky", "harbor"
    ],
    spa: [
        'alv', 'casa', 'caso', 'chido', 'ctm', 'dnd', 'forma', 'gracias', 'guay', 'hola',
        'hostia', 'jaja', 'jajaja', 'jajajaja', 'jeje', 'jihi', 'mundo', 'nmms',
        'palabra', 'pq', 'problema', 'pta', 'pto', 'tkm', 'tqm', 'vdd', 'vida', 'we',
        'wea', 'wey', 'wn', 'xfa', 'xq'
    ],
    fra: [
        'ans', 'bcp', 'bg', 'bjr', 'bof', "c'est", 'cas', 'chiant', 'chose', 'deg',
        'dsl', 'faire', 'falloir', 'haha', 'hihi', 'homme', "j'ai", "j'étais", 'jour',
        'mdr', 'mec', 'meuf', 'moment', 'monde', 'oklm', 'ouais', 'oui', 'place',
        'pouvoir', 'ptdr', 'relou', 'salut', 'savoir', 'slt', 'stp', 'svp', 'temps',
        'tfq', 'tg', 'tkt', 'venir', 'vie', 'voir', 'vouloir', 'wesh', "estce",
    ],
    deu: [
        'abend', 'alter', 'artikel', 'auge', 'bitte', 'blieb', 'bzgl', 'bzw', 'danke',
        'digga', 'extra', 'ez', 'geil', 'geschichte', 'guten', 'haha', 'hallo', 'halt',
        'hand', 'haus', 'irgendwie', 'ka', 'kind', 'kp', 'krass', 'leider', 'lel', 'lg',
        'mfg', 'mmn', 'moin', 'nacht', 'ne', 'nee', 'nervt', 'nh', 'nix', 'nochmal',
        'passen', 'platz', 'problem', 'punkt', 'quasi', 'rein', 'schule', 'seite',
        'servus', 'still', 'tach', 'vermisse', 'vllt', 'vorbereitet', 'wecke', 'welt',
        'wunderbar'
    ],
    por: [
        'adora', 'alguma', 'cara', 'caso', 'crl', 'fds', 'foda', 'gosta', 'homem', 'ja',
        'kkk', 'kkkk', 'mano', 'mds', 'mundo', 'obg', 'pdc', 'pdp', 'pqp', 'rs', 'sdds',
        'slc', 'ss', 'tbm', 'tmj', 'top', 'vc', 'vdd', 'véi', 'vida', 'vlw', "mary",
    ],
    ita: [
        'amo', 'aspe', 'boh', 'buonasera', 'buongiorno', 'cazzo', 'ciao', 'cmq',
        'domani', 'figo', "l'ho", 'lavoro', 'lì', 'minchia', 'notte', 'odio', 'pk',
        'porta', 'portate', 'porti', 'prego', 'presto', 'problema', 'qnd', 'raga', 'sì',
        'sii', 'tvb', 'vbb', 'vidi', 'xk', 'xke', "prenderò", "andare", "venire",
    ],
    nld: [
        'bedankt', 'boeie', 'dag', 'dank', 'deel', 'doei', 'echt', 'ff', 'fml', 'gast',
        'goed', 'gwn', 'hallo', 'hand', 'hoi', 'huis', 'idd', 'jaar', 'joh', 'kut',
        'land', 'lekker', 'leuk', 'mens', 'mss', 'nou', 'oog', 'pff', 'plaats',
        'probleem', 'school', 'speelt', 'super', 'sws', 'tijd', 'wereld'
    ],
    heb: [
        'אנו', 'ביי', 'בסדר', 'וואלה', 'חחח', 'חחחח', 'חיים', 'טוב', 'יום', 'יפה', 'לך',
        'ממש', 'נראה', 'עכשיו', 'שלום', 'תגיד', 'תודה', 'תום'
    ],
    urd: [
        'اچھا', 'بھی', 'جی', 'ہاں', 'یار', 'aap', 'ab', 'acha', 'aur', 'bhai', 'bhi',
        'bohat', 'haan', 'hah', 'hai', 'hain', 'ho', 'hum', 'jab', 'ji', 'ka', 'kaise',
        'kese', 'ki', 'ko', 'kuch', 'kya', 'mein', 'nahi', 'se', 'tab', 'tha', 'theek',
        'thi', 'tum', 'woh', 'yaar', 'yeh'
    ],
    pol: [
        'czas', 'cześć', 'człowiek', 'dzień', 'dziewczyna', 'dzięki', 'fajnie', 'hej',
        'jutro', 'kobieta', 'proszę', 'spoko', 'super'
    ],
    swa: [
        'asante', 'habari', 'hapana', 'jambo', 'leo', 'mambo', 'mtu', 'ndege', 'ndiyo',
        'nzuri', 'poa', 'sawa', 'siku', 'vizuri', 'wenye', "ndio",
    ],
    tur: [
        'abi', 'abla', 'aga', 'akşamlar', 'amk', 'aq', 'as', 'billa', 'bosver', 'boşver',
        'evet', 'eyv', 'eyvallah', 'geceler', 'gunaydin', 'guzel', 'günaydın', 'güzel',
        'hadi', 'harika', 'hayır', 'hayir', 'hb', 'hg', 'hoşgeldin', 'insallah', 'inş',
        'inşallah', 'kanka', 'kardes', 'kardeş', 'knk', 'kral', 'lan', 'maşallah',
        'merhaba', 'mk', 'mrb', 'naber', 'nasil', 'nbr', 'ok', 'sa', 'sagol', 'sağol',
        'selam', 'sg', 'slm', 'süper', 'tesekkurler', 'teşekkürler', 'tm', 'tmm', 'tsk',
        'tşk', 'usta', 'valla'
    ]
};
