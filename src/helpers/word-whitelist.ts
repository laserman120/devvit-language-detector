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
        "crypto", "bitcoin", "btc", "eth", "nft", "hodl"
    ],
    eng: [
        'user', 'play', 'nope', 'yep', 'yeah', 'nah', 'tbh', 'imo', 'fr', 
        'thanks', 'please', 'nice', 'popcorn', 'underrated', 'movie', 
        'breaking', 'bad', 'terminally', 'cool', 'dope', 'badass', 
        'awesome', 'yall', 'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 
        'agree', 'wow', 'yay', 'dude', 'man', 'guy', 'girl', 'shit', 
        'damn', 'fuck', 'hell', 'bro', 'best', 'worst', 'thing', 'stuff', 
        'time', 'life', 'people', 'person', 'year', 'day', 'way', 'look', 
        'see', 'come', 'think', 'know', 'want', 'give', 'use', 'find', 
        'tell', 'ask', 'seem', 'feel', 'try', 'leave', 'call',
        'sub', 'subreddit', 'mods', 'mod', 'post', 'comment', 'upvote', 
        'downvote', 'karma', 'thread', 'link', 'source', 'edit', 'based', 
        'cringe', 'oof', 'yikes', 'pog', 'poggers', 'pepe', 'meta', 'nsfw', 
        'sfw', 'fam', 'homie', 'giga', 'sigma', 'chad', 'simp', 'flex', 
        'goat', 'goated', 'sus', 'cap', 'nocap', 'bet', 'slaps', 'fire', 
        'lit', 'lowkey', 'highkey', 'Vibe', 'vibes', 'mood', 'periodt', 
        'rn', 'asap', 'aint', 'gimme', 'lemme', 'dunno', 'gotcha', 'folks', 
        "folk", "songs", "song"
    ],
    spa: [
        'jaja', 'jajaja', 'si', 'sí', 'q', 'que', 'k', 'gracias', 'hola', 
        'buen', 'bien', 'wey', 'we', 'por', 'jajajaja', 'jeje', 'jihi', 
        'no', 'mas', 'más', 'pero', 'tambien', 'también', 'nada', 'todo', 
        'algo', 'casa', 'tiempo', 'dia', 'día', 'vez', 'vida', 'mundo', 
        'momento', 'forma', 'caso', 'lugar', 'trabajo', 'palabra', 'problema'
    ],
    fra: [
        'mdr', 'ptdr', 'ouais', 'oui', 'merci', 'slt', 'salut', 'svp', 
        'stp', 'bcp', 'tg', 'haha', 'hihi', 'non', 'mais', 'bien', 
        'rien', 'tout', 'plus', 'comme', 'faire', 'dire', 'voir', 'savoir', 
        'pouvoir', 'vouloir', 'venir', 'falloir', 'temps', 'homme', 'jour', 
        'chose', 'vie', 'monde', 'moment', 'ans', 'place', 'cas'
    ],
    deu: [
        'ja', 'nein', 'ne', 'nee', 'doch', 'danke', 'bitte', 'moin', 
        'servus', 'haha', 'geil', 'lg', 'hallo', 'tach', 'guten', 'tag', 
        'abend', 'nacht', 'morgen', 'zeit', 'mensch', 'kind', 'jahr', 
        'tag', 'weg', 'haus', 'hand', 'teil', 'auge', 'welt', 'land', 
        'schule', 'platz', 'problem', 'seite', 'geschichte', 'punkt', 
        "still", "blieb", "er", "sie", "es", "der", "die", "das"
    ],
    por: [
        'kkk', 'kkkk', 'rs', 'sim', 'nao', 'não', 'vlw', 'obg', 'vdd', 
        'ss', 'tbm', 'vc', 'bom', 'bem', 'agora', 'entao', 'então', 
        'assim', 'aqui', 'ai', 'aí', 'ja', 'já', 'muito', 'pouco', 'nada', 
        'tudo', 'alguma', 'coisa', 'dia', 'tempo', 'ano', 'vez', 'homem', 
        'vida', 'mundo', 'momento', 'parte', 'caso', 'lugar', 'trabalho'
    ],
    ita: [
        'si', 'sì', 'grazie', 'ciao', 'prego', 'cmq', 'xk', 'xke', 
        'buongiorno', 'buonasera', 'notte', 'bene', 'male', 'cosa', 
        'tutto', 'niente', 'tempo', 'uomo', 'anno', 'giorno', 'vita', 
        'mondo', 'momento', 'parte', 'caso', 'luogo', 'lavoro', 'problema'
    ],
    nld: [
        'ja', 'nee', 'dank', 'bedankt', 'hoi', 'hallo', 'doei', 'idd', 
        'sws', 'gwn', 'goed', 'wel', 'niet', 'geen', 'toch', 'nou', 
        'dan', 'tijd', 'mens', 'jaar', 'dag', 'weg', 'huis', 'hand', 
        'deel', 'oog', 'wereld', 'land', 'school', 'plaats', 'probleem'
    ]
};