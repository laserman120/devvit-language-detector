import { iso6393 } from 'iso-639-3';
import { Devvit, TriggerContext, Post, Comment } from "@devvit/public-api";
import { stopwords } from '../helpers/stopwords-iso.js';
import { whitelistedWords } from '../helpers/word-whitelist.js';
import { stripFormattingAndUrls } from '../helpers/textCleanupHelper.js';
import { detectAll } from 'tinyld';

const supportedLanguages = [
    'eng', 'cmn', 'hin', 'spa', 'fra', 'arb', 'ben', 'rus', 'por', 'urd', 
    'ind', 'deu', 'jpn', 'mar', 'tel', 'tur', 'tam', 'vie', 'tgl', 'kor', 
    'pes', 'pol', 'ita', 'nld', 'ron', 'ell', 'ces', 'swe', 'hun', 'fin', 
    'dan', 'pan', 'guj', 'mal', 'kan', 'ori', 'sin', 'nep', 'tha', 'mya', 
    'khm', 'jav', 'swa', 'hau', 'yor', 'ibo', 'zul', 'afr', 'amh', 'som', 
    'ukr', 'bul', 'srp', 'hrv', 'slk', 'nor', 'cat', 'heb', 'kaz', 'uzb', 
    'lit', 'lav', 'est'
];

// Detection Settings:

// Word Count for detailed detection. 
const minWordCountLenient = 3; // Minimum word count for lenient mode
const minWordCountStrict = 2; // Minimum word count for strict mode

// Quick Stopword Settings
// The quick stopword check is a fast pre-check to catch obvious allowed languages before running more expensive detection methods.
const QuickStopwordMaxWordsForShortText = 12; // Maximum word count for a text to be considered "short" for quick stopword checks
const QuickStopwordDensityShort = 0.60; // Required stopword density for short texts to pass the quick check
const QuickStopwordDensityMedium = 0.50; // Required stopword density for medium-length texts to pass the quick check

// Script Analysis Settings
// Quick script analysis to catch non-latin scripts without running the full detection.
const MinLetterDensityForScript = 0.4; // Minimum letter to non-whitespace ratio to avoid kaomoji false positives
const MinScriptMatchPercentageLenient = 0.6; // Minimum percentage of characters matching a script for short text detection
const MinScriptMatchPercentageStrict = 0.4; // Minimum percentage of characters matching a script for short text detection

// TinyLd Settings & Safety Nets
// TinyLd is only used if enough text is present. Safety net is used to prevent false positives on short texts. Rejection favored over mistakes.
const MinTextLengthForDetection = 35; // Minimum text length for language detection
const MinConfidenceStrict = 0.1; // Minimum confidence for strict mode
const MinConfidenceLenient = 0.6; // Minimum confidence for lenient mode
const LenientLangCheckCount = 3; // Number of top results to check for lenient mode
const TinyLdMinScoreForAllowedMatch = 0.10; // Minimum score for an allowed language to be accepted from top results
const TinyLdReverseSafetyNetMinWords = 5; // Minimum word count for the safety net to apply
const TinyLdReverseSafetyNetMaxDensity = 0.15; // Maximum allowed stopword density for the safety net to apply
const SafetyNetMaxWords = 25; // Max word count for the safety net to apply
const SafetyNetConfidenceExtreme = 0.90; // Minimum confidence for extremely confident guesses
const SafetyNetConfidenceHigh = 0.60; // Minimum confidence for highly confident guesses
const SafetyNetDensityExtreme = 0.50; // Required density to overrule extremely high confidence
const SafetyNetDensityHigh = 0.40; // Required density to overrule highly confident guesses
const SafetyNetDensityDefault = 0.28; // Required density to overrule unsure guesses

// Dictionary Fallback Settings
// Fallback for short texts or when tinyld fails. Uses stopword density to determine the most likely language.
const DictionaryBiasExtremelyShortMaxWords = 5; // Maximum Word count for the text to be considered Extremely Short
const DictionaryBiasShortMaxWords = 12; // Maximum Word count for the text to be considered Short
const StopwordDensityThresholdLenient = 0.40; // % of words must be valid stopwords to pass the check
const StopwordDensityThresholdStrict = 0.60; // % of words must be valid stopwords to pass the check
const StopwordDensityThresholdFallback = 0.50; // % of words must be valid stopwords to pass the check for short texts fallback
const DictionaryRejectStrictThreshold = 0.60; // Required density to accept a non-allowed language in strict mode for short texts

export async function handleDetection(itemId: string, context: TriggerContext, text: string) {
    const trace: string[] = [];
    const finish = (msg: string) => {
        trace.push(msg);
        console.log(`[${itemId}] ${trace.join(' -> ')}`);
    };

    // Redis Deduplication Check
    const redisKey = `processed:${itemId}`;
    const alreadyProcessed = await context.redis.get(redisKey);
    
    if (alreadyProcessed) 
    {
        return finish('Already processed recently');
    }

    text = stripFormattingAndUrls(text);

    await context.redis.set(redisKey, 'true');
    await context.redis.expire(redisKey, 60);

    const strictnessSetting = await context.settings.get<string[]>('STRICTNESS') ?? ['strict'];
    const allowedLanguages = await context.settings.get<string[]>('ALLOWED_LANGUAGES') || ['eng'];

    let langCode = "und";

    // Quick Stopword Check
    const words = text.toLowerCase().replace(/[^\p{Letter}\p{Number}\s']/gu, '').split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    const minWords = strictnessSetting[0] === 'lenient' ? minWordCountLenient : minWordCountStrict;

    // Add global whitelisted words to the allowed set
    const allowedWords = new Set<string>(whitelistedWords.global || []);

    // Fetch and parse the custom whitelist from settings
    const customWhitelistStr = await context.settings.get<string>('CUSTOM_WHITELIST') ?? '';
    if (customWhitelistStr.trim().length > 0) {
        const customWords = customWhitelistStr
            .split(/[,;]+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0);
            
        customWords.forEach(w => allowedWords.add(w));
        
        if (customWords.length > 0) {
            trace.push(`Loaded ${customWords.length} custom whitelisted words`);
        }
    }

    for (const code3 of allowedLanguages) {
        // Add whitelisted words for the specific language code
        if (whitelistedWords[code3]) 
        {
            whitelistedWords[code3].forEach(w => allowedWords.add(w));
        }

        const langData = iso6393.find(l => l.iso6393 === code3);
        if (langData?.iso6391 && (stopwords as any)[langData.iso6391]) 
        {
            (stopwords as any)[langData.iso6391].forEach((w: string) => allowedWords.add(w));
        }
    }

    let validWordCount = 0;
    for (const word of words) {
        if (allowedWords.has(word)){
            validWordCount++;
        } 
    }

    // Short texts have high variance and accidental overlaps; require a stricter density to bypass tinyld entirely
    const quickThreshold = totalWords <= QuickStopwordMaxWordsForShortText ? QuickStopwordDensityShort : QuickStopwordDensityMedium;

    if (totalWords > 0 && (validWordCount / totalWords) >= quickThreshold) {
        return finish(`Passed Quick Stopwords [${validWordCount}/${totalWords}]`);
    }

    trace.push(`Stopwords [${validWordCount}/${totalWords}]`);

    // Script Analysis (Runs on all lengths to quickly catch non-Latin alphabets)
    const textLetters = [...text].filter(char => /\p{Letter}/u.test(char));
    const totalLetters = textLetters.length;
    const nonWhitespaceCount = [...text].filter(char => !/\s/.test(char)).length;
    let scriptFound = false;

    if (totalLetters > 0 && (totalLetters / nonWhitespaceCount >= MinLetterDensityForScript)) {
        const scriptMappings = [
            { regex: /\p{Script=Cyrillic}/u, code: 'rus' },
            { regex: /\p{Script=Han}/u, code: 'cmn' },
            { regex: /\p{Script=Hiragana}|\p{Script=Katakana}/u, code: 'jpn' },
            { regex: /\p{Script=Hangul}/u, code: 'kor' },
            { regex: /\p{Script=Arabic}/u, code: 'arb' },
            { regex: /\p{Script=Devanagari}/u, code: 'hin' },
            { regex: /\p{Script=Greek}/u, code: 'ell' },
            { regex: /\p{Script=Bengali}/u, code: 'ben' },
            { regex: /\p{Script=Tamil}/u, code: 'tam' },
            { regex: /\p{Script=Telugu}/u, code: 'tel' }
        ];

        for (const script of scriptMappings) {
            const matchCount = textLetters.filter(char => script.regex.test(char)).length;
            const minScriptMatchPercentage = strictnessSetting[0] === 'lenient' ? MinScriptMatchPercentageLenient : MinScriptMatchPercentageStrict;
            
            if (matchCount / totalLetters > minScriptMatchPercentage) {
                langCode = script.code;
                scriptFound = true;
                trace.push(`Mode: Script Analysis -> Detected ${script.code}`);
                break;
            }
        }
    }

    if (scriptFound) {
        if (allowedLanguages.includes(langCode)) {
            return finish(`Passed: Script check allowed (${langCode})`);
        }
        trace.push(`Script check rejected: ${langCode}`);
    } 
    else 
    {

        // Word check after script analysis to ensure we have enough words for further detection
        if (totalWords < minWords) {
            return finish(`Skipped: Text contains less than ${minWords} words`);
        }

        // Latin/Mixed Script Handling
        let tinyldSuccess = false;
        
        if (text.trim().length >= MinTextLengthForDetection) {
            trace.push('Mode: tinyld');
            const minConfidence = strictnessSetting[0] === 'lenient' ? MinConfidenceLenient : MinConfidenceStrict;
            const rawResults = detectAll(text);

            const results = rawResults.map(r => {
                const langData = iso6393.find(l => l.iso6391 === r.lang || l.iso6393 === r.lang);
                return { code: langData ? langData.iso6393 : 'und', score: r.accuracy };
            }).filter(r => r.code !== 'und' && supportedLanguages.includes(r.code));

            if (results.length > 0 && results[0].score >= minConfidence) {
                tinyldSuccess = true;
                langCode = results[0].code;
                
                const numToCheck = strictnessSetting[0] === 'lenient' ? LenientLangCheckCount : 1;
                const topResultsToCheck = results.slice(0, numToCheck);
                const topResultsString = topResultsToCheck.map(r => `${r.code}:${r.score.toFixed(3)}`).join(', ');

                const allowedMatch = topResultsToCheck.find(r => allowedLanguages.includes(r.code) && r.score >= TinyLdMinScoreForAllowedMatch);

                if (allowedMatch) {
                    if (totalWords >= TinyLdReverseSafetyNetMinWords && (validWordCount / totalWords) < TinyLdReverseSafetyNetMaxDensity) {
                        trace.push(`tinyld matched allowed (${allowedMatch.code}:${allowedMatch.score.toFixed(3)}) but overridden due to low stopword density`);
                        tinyldSuccess = false; // Force fallback
                    } else {
                        return finish(`Passed: tinyld matched allowed lang in top ${numToCheck} (${topResultsString})`);
                    }
                } else {
                    // Scale the required density based on tinyld's confidence in the foreign language.
                    const isExtremelyConfident = results[0].score >= SafetyNetConfidenceExtreme;
                    const isHighlyConfident = results[0].score >= SafetyNetConfidenceHigh;
                    
                    let requiredDensity = SafetyNetDensityDefault;
                    if (isExtremelyConfident) requiredDensity = SafetyNetDensityExtreme; // Do not overrule 90%+ confidence without overwhelming evidence
                    else if (isHighlyConfident) requiredDensity = SafetyNetDensityHigh;

                    if (strictnessSetting[0] === 'lenient' && totalWords <= SafetyNetMaxWords && (validWordCount / totalWords) >= requiredDensity) {
                        return finish(`Passed (Safety Net): tinyld rejected (${topResultsString}) but found ${validWordCount}/${totalWords} allowed stopwords`);
                    }
                    trace.push(`tinyld rejected: Top results (${topResultsString})`);
                }
            } else {
                if(!results || results.length === 0) {
                    trace.push(`tinyld rejected: No results returned`);
                } else {
                    trace.push(`tinyld rejected: No results met confidence threshold (${results[0].score} < ${minConfidence})`);
                }
                
            }
        } 
        
        if (!tinyldSuccess) 
            {
                // Stopword Fallback (Runs for short texts OR long texts where tinyld lacked confidence)
                let bestLang = 'und';
                let bestMatch = 0;
                
                let bestAllowedLang = 'und';
                let bestAllowedMatch = 0;
    
                for (const code3 of supportedLanguages) {
                    let matchCount = 0;
                    const langData = iso6393.find(l => l.iso6393 === code3);
                    const stopwordList = langData?.iso6391 ? (stopwords as any)[langData.iso6391] : [];
                    const whitelist = whitelistedWords[code3] || [];
                    const langWords = new Set([...(stopwordList || []), ...whitelist]);
                    
                    for (const word of words) {
                        if (langWords.has(word)) matchCount++;
                    }
    
                    if (allowedLanguages.includes(code3) && matchCount > bestAllowedMatch) {
                        bestAllowedMatch = matchCount;
                        bestAllowedLang = code3;
                    }
    
                    if (matchCount > bestMatch) {
                        bestMatch = matchCount;
                        bestLang = code3;
                    }
                }
    
                const biasAllowance = totalWords <= DictionaryBiasExtremelyShortMaxWords ? 0 : (totalWords <= DictionaryBiasShortMaxWords ? 1 : 2);
                if (bestAllowedMatch > 0 && (bestMatch - bestAllowedMatch <= biasAllowance)) {
                    bestLang = bestAllowedLang;
                    bestMatch = bestAllowedMatch;
                }
    
                let fallbackThreshold;
                if (allowedLanguages.includes(bestLang)) {
                    fallbackThreshold = totalWords > 10 ? StopwordDensityThresholdLenient : StopwordDensityThresholdFallback;
                } else {
                    fallbackThreshold = totalWords > 10 ? StopwordDensityThresholdStrict : DictionaryRejectStrictThreshold; 
                }
    
                if (totalWords > 0 && (bestMatch / totalWords) >= fallbackThreshold) {
                    langCode = bestLang;
                    trace.push(`Mode: Dictionary Fallback -> Detected ${langCode} (${bestMatch}/${totalWords})`);
                    if (allowedLanguages.includes(langCode)) return finish(`Passed: Dictionary fallback allowed (${langCode})`);
                    trace.push(`Dictionary Fallback rejected: ${langCode}`);
                } else {
                    return finish(`Skipped: Language could not be determined (${bestMatch}/${totalWords} words matched)`);
                }
            }
    }

    if(langCode === "und"){
        return finish(`Skipped: Language could not be determined`);
    }

    let item;
    let actionSetting;
    if(itemId.startsWith("t3_")) 
    {
        // It's a post
        item = await context.reddit.getPostById(itemId);
        actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_POST') ?? ['report'];
    } 
    else if(itemId.startsWith("t1_")) 
    {
        // It's a comment
        item = await context.reddit.getCommentById(itemId);
        actionSetting = await context.settings.get<string[]>('ACTION_ON_UNSUPPORTED_COMMENT') ?? ['report'];
    } 
    else 
    {
        return finish(`Skipped: Neither post nor comment`);
    }

    // Check if already removed.
    if(item.isRemoved())
    {
        return finish(`Skipped: Already removed`);
    }

    // Take action
    const langData = iso6393.find(l => l.iso6393 === langCode);
    const langName = langData?.name || langCode;

    const action = actionSetting[0];
    const rawReason = await context.settings.get<string>('ACTION_REASON') ?? 'Language not allowed: {{LangName}}';
    const reason = rawReason.replace('{{LangName}}', langName);

    if (action === 'report') 
    {
        await context.reddit.report(item, { reason: reason });
        finish(`Action: Reported (${langCode})`);
    } 
    else if (action === 'filter') 
    {
        await context.reddit.filter(item.id, { reason: reason });
        finish(`Action: Filtered (${langCode})`);
        await sendRemovalNotification(context, item, "filter");
    } 
    else if (action === 'remove') 
    {
        await context.reddit.remove(item.id, false);
        await context.reddit.addRemovalNote({ itemIds: [item.id], reasonId: "", modNote: reason });
        finish(`Action: Removed (${langCode})`);
        await sendRemovalNotification(context, item, "removal");
    }
}

async function sendRemovalNotification(context: TriggerContext, item: Post | Comment, type: String) {
    let notifyAuthor;
    let rawMessage;
    if(type === "filter") {
        notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR_FILTER');
        rawMessage = await context.settings.get<string>('FILTER_MESSAGE') ?? '';
    } else if(type === "removal") {
        notifyAuthor = await context.settings.get<boolean>('NOTIFY_AUTHOR_REMOVAL');
        rawMessage = await context.settings.get<string>('REMOVAL_MESSAGE') ?? '';
    }

    if (!notifyAuthor) return;

    const authorName = item.authorName;
    const subredditName = item.subredditName;
    const itemType = item.id.startsWith("t3_") ? 'post' : 'comment';
    
    if(!rawMessage){
        return;
    }
    const message = rawMessage.replace(/{{type}}/gi, itemType).replace(/{{subredditName}}/gi, subredditName).replace(/{{UserName}}/gi, authorName);

    const notificationMethod = await context.settings.get<string[]>('NOTIFICATION_METHOD') ?? ['comment'];
    if (notificationMethod[0] === 'modmail') {
        const modmailSubjectRaw = await context.settings.get<string>('MODMAIL_SUBJECT') ?? `Notice regarding your recent ${itemType} in r/${subredditName}`;
        const modmailSubject = modmailSubjectRaw.replace(/{{type}}/gi, itemType).replace(/{{subredditName}}/gi, subredditName).replace(/{{userName}}/gi, authorName);
        await context.reddit.modMail.createConversation({
            subredditName: subredditName,
            subject: modmailSubject,
            body: message,
            to: authorName,
            isAuthorHidden: true,
        });
        console.log(`[${item.id}] Sent modmail notification (${type})`);
    } else {
        const comment = await context.reddit.submitComment({
            id: item.id,
            text: message,
        });
        await comment.distinguish(true);
        console.log(`[${item.id}] Left comment notification (${type})`);
    }
}