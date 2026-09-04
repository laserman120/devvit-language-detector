// Whitelisted words are added to the StopWords list to prevent false positives in language detection.
// Global words apply to all languages and are primarily internet slang, abbreviations, and common expressions.
// Individual language words are added to the StopWords list for that specific language.

export const whitelistedWords: Record<string, string[]> = {
    global: [
        'lol', 'lmao', 'lmfao', 'wtf', 'omg', 'ok', 'okay', 'yes', 'no', 
        'idk', 'im', 'ur', 'gg', 'wp', 'ty', 'thx', 'pls', 'plz', 'xd', 
        'bro', 'bruh', 'GIF', 'IMAGE', 'VIDEO', 'oof', 'yikes', 'rip', 
        'vs', 'versus', 'op', 'dm', 'pm', 'irl', 'ama', 'tl', 'dr', 
        'eli5', 'nsfw', 'sfw', 'fyi', 'btw', 'asap', 'faq', 'edit', "subreddit", "lfo", 
        '¯\\_(ツ)_/¯', '¯\_(ツ)_/¯', '( ͡° ͜ʖ ͡°)', 'ಠ_ಠ', '(╯°□°）╯︵ ┻━┻', '┬─┬ノ( º _ ºノ)', 
        'ʕ•ᴥ•ʔ', '(◕‿◕✿)', 'ಥ_ಥ', '(ง\'̀-\'́)ง', '(* ^ ω ^)', '(´･ω･`)', '＼(＾O＾)／',
        "alexa", "soundbar", "spotify", "youtube", "netflix", "hulu", "prime", "disney", "twitch",
        "twitter", "instagram", "facebook", "snapchat", "tiktok", "reddit", "linkedin", "discord", "slack",
        "bluetooth", "wifi", "ethernet", "usb", "hdmi", "vga", "displayport", "thunderbolt", "lightning",
        "apple", "samsung", "google", "microsoft", "amazon", "nvidia", "amd", "intel", "qualcomm",
        "ps5", "xbox", "switch", "pc", "laptop", "tablet", "smartphone", "smartwatch", "earbuds",
        "smart", "home", "assistant", "cortana", "siri", "bixby", "gemini",
        "GPT", "ChatGPT", "Bard", "Claude", "LLaMA", "Mistral", "Falcon", "Orca", "Pythia", "MPT",
        "app", "update", "bug", "lag", "patch", "server", "online", "offline", "stream", "email",
        "internet", "web", "link", "url", "browser", "hardware", "software", "pixel", "router",
        "npc", "afk", "dlc", "fps", "rpg", "mmo", "pvp", "pve", "noob", "bot", "ping", "buff", "nerf", "rng",
        "admin", "mod", "upvote", "downvote", "repost", "karma", "troll", "meme", "hashtag", "fomo",
        "crypto", "bitcoin", "btc", "eth", "nft", "hodl", "tom"
    ],
    eng: [
        'user', 'play', 'nope', 'yep', 'yeah', 'nah', 'tbh', 'imo',
        'nice', 'popcorn', 'underrated', 'movie', 
        'breaking', 'bad', 'terminally', 'cool', 'dope', 'badass', 
        'awesome', 'yall', 'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 
        'agree', 'wow', 'yay', 'dude', 'guy', 'girl', 'shit', 
        'damn', 'fuck', 'bro', 'worst', 'stuff', 'time', 'life', 'people', 
        'person', 'day', 'feel', 'leave', 'subreddit', 'mods', 'mod', 
        'post', 'comment', 'upvote', 
        'downvote', 'karma', 'thread', 'link', 'source', 'edit', 'based', 
        'cringe', 'oof', 'yikes', 'pog', 'poggers', 'pepe', 'meta', 'nsfw', 
        'sfw', 'fam', 'homie', 'giga', 'sigma', 'chad', 'simp', 'flex', 
        'goat', 'goated', 'sus', 'cap', 'nocap', 'bet', 'slaps',
        'lit', 'lowkey', 'highkey', 'Vibe', 'vibes', 'mood', 'periodt', 
        'rn', 'asap', 'gimme', 'lemme', 'dunno', 'gotcha', 'folks', 
        "folk", "songs", "song", "hate", "need", 
        "fake", "real", "true", "false", "right", "wrong", "help", 
        "question", "works", "looks", "stopped", "girls"
    ],
    spa: [
        'jaja', 'jajaja', 'gracias', 'hola', 'wey', 'we', 
        'jajajaja', 'jeje', 'jihi', 'casa', 'vida', 'mundo', 
        'forma', 'caso', 'palabra', 'problema',
        'nmms', 'alv', 'xq', 'pq', 'tkm', 'tqm', 'dnd', 'vdd', 'ctm', 'wea',
        'xfa', 'pta', 'pto', 'chido', 'guay', 'hostia', 'wn'
    ],
    fra: [
        'mdr', 'ptdr', 'ouais', 'oui', 'slt', 'salut', 'svp', 
        'stp', 'bcp', 'tg', 'haha', 'hihi', 
        'faire', 'voir', 'savoir', 
        'pouvoir', 'vouloir', 'venir', 'falloir', 'temps', 'homme', 'jour', 
        'chose', 'vie', 'monde', 'moment', 'ans', 'place', 'cas',
        'bjr', 'dsl', 'tkt', 'tfq', 'oklm', 'bg', 'bof', 'chiant', 
        'wesh', 'mec', 'meuf', 'relou', 'deg', "c'est", "j'ai"
    ],
    deu: [
        'ne', 'nee', 'danke', 'bitte', 'moin', 
        'servus', 'haha', 'geil', 'lg', 'hallo', 'tach', 'guten',
        'abend', 'nacht', 'kind',
        'haus', 'hand', 'auge', 'welt', 'land', 
        'schule', 'platz', 'problem', 'seite', 'geschichte', 'punkt', 
        "still", "blieb",
        'kp', 'ka', 'nh', 'vllt', 'digga', 'alter', 'mmn', 'mfg', 'ez', 
        'lel', 'krass', 'halt', 'quasi', 'bzw', 'bzgl', 'nix', 
        'gut', 'leider', 'deswegen', 'nur', 'rein', 'passen', 'artikel', 
        'extra', 'irgendwie', 'wecke', 'vermisse', 'nervt', 'kam', 
        'vorbereitet', 'wunderbar', 'nochmal'
    ],
    por: [
        'kkk', 'kkkk', 'rs', 'vlw', 'obg', 'vdd', 
        'ss', 'tbm', 'vc', 'ai', 'ja', 'alguma', 'homem', 'vida', 'mundo', 'caso',
        'pdc', 'fds', 'pqp', 'crl', 'mano', 'véi', 'slc', 'tmj', 'mds',
        'cara', 'foda', 'top', 'vdd', 'pdp', 'sdds', 'gosta', 'adora'
    ],
    ita: [
        'sì', 'ciao', 'prego', 'cmq', 'xk', 'xke', 
        'buongiorno', 'buonasera', 'notte', 'lavoro', 'problema',
        'raga', 'boh', 'tvb', 'qnd', 'pk', 'aspe', 'vbb',
        'minchia', 'cazzo', 'figo', 'amo', 'odio', 'presto',
        "l'ho", "vidi", "porta", "domani", 'fra', 'raga', 'boh', 'tvb',
         'qnd', 'pk', 'aspe', 'vbb', 'dai',
        'minchia', 'cazzo', 'figo', 'cioe', 'cioè', 'amo', 'sii', 
        'portate', 'porti'
    ],
    nld: [
        'dank', 'bedankt', 'hoi', 'hallo', 'doei', 'idd', 
        'sws', 'gwn', 'goed', 'nou', 
        'tijd', 'mens', 'jaar', 'dag', 'huis', 'hand', 
        'deel', 'oog', 'wereld', 'land', 'school', 'plaats', 'probleem',
        'ff', 'fml', 'gast', 'pff', 'joh', 'mss', 'kut', 'lekker', 
        'super', 'echt', 'leuk', 'boeie', 'speelt'
    ],
    heb: [
        'אנו', 'שלום', 'תודה', 'טוב', 'בסדר', 'יפה', 'לך', 'נראה', 
        'תום', 'חחח', 'חחחח', 'יום', 'ממש', 'עכשיו', 'ביי', 'חיים', 
        'תגיד', 'וואלה'
    ],
    urd: [
        'hah', 'hai', 'hain', 'ho', 'kya', 'ki', 'ka', 'ko', 'aur', 
        'yeh', 'woh', 'nahi', 'haan', 'ji', 'acha', 'theek', 'bhi', 
        'mein', 'se', 'tha', 'thi', 'tum', 'aap', 'hum', 'yaar', 
        'bhai', 'kese', 'kaise', 'bohat', 'kuch', 'ab', 'jab', 'tab',
        'ہاں', 'جی', 'اچھا', 'بھی', 'یار'
    ],
    pol: [
        'kobieta', 'cześć', 'hej', 'dzięki', 'spoko',
        'proszę', 'jutro', 'super', 'fajnie', 
        'człowiek', 'dziewczyna', 'dzień', 'czas'
    ],
    swa: [
        'siku', 'mtu', 'ndege', 'asante', 'sawa', 'nzuri', 
        'ndiyo', 'hapana', 'habari', 'jambo', 'vizuri', 
        'leo', 'mambo', 'poa', 'wenye'
    ]
};