import { iso6393 } from 'iso-639-3';
import { Devvit, TriggerContext, Post, Comment } from "@devvit/public-api";
import { stopwords } from '../helpers/stopwords-iso.js';
import { whitelistedWords } from '../helpers/word-whitelist.js';
import { stripFormattingAndUrls } from '../helpers/textCleanupHelper.js';
import { detectAll } from 'tinyld';
import { replaceWildcards, sendRemovalNotification } from './notificationHandler.js';

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
const BASE_MIN_WORDS_LENIENT = 2; // Minimum word count for lenient mode
const BASE_MIN_WORDS_STRICT = 2; // Minimum word count for strict mode

// Quick Stopword Settings
// The quick stopword check is a fast pre-check to catch obvious allowed languages before running more expensive detection methods.
const QUICK_CHECK_SHORT_TEXT_MAX_WORDS = 12; // Maximum word count for a text to be considered "short" for quick stopword checks
const QUICK_CHECK_REQUIRED_DENSITY_SHORT = 0.60; // Required stopword density for short texts to pass the quick check
const QUICK_CHECK_REQUIRED_DENSITY_MEDIUM = 0.50; // Required stopword density for medium-length texts to pass the quick check

// Script Analysis Settings
// Quick script analysis to catch non-latin scripts without running the full detection.
const SCRIPT_MIN_LETTER_DENSITY = 0.4; // Minimum letter to non-whitespace ratio to avoid kaomoji false positives
const SCRIPT_REQUIRED_MATCH_LENIENT = 0.40; // Minimum percentage of characters matching a script for short text detection
const SCRIPT_REQUIRED_MATCH_STRICT = 0.30; // Minimum percentage of characters matching a script for short text detection

// TinyLd Settings & Safety Nets
// TinyLd is only used if enough text is present. Safety net is used to prevent false positives on short texts. Rejection favored over mistakes.
const TINYLD_MIN_CHAR_LENGTH = 15; // Minimum text length for language detection
const TINYLD_REQUIRED_CONFIDENCE_STRICT = 0.1; // Minimum confidence for strict mode
const TINYLD_REQUIRED_CONFIDENCE_LENIENT = 0.55; // Minimum confidence for lenient mode
const TINYLD_LENIENT_TOP_RESULTS_TO_CHECK = 3; // Number of top results to check for lenient mode
const TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH = 0.20; // Minimum score for an allowed language to be accepted from top results

// TinyLD Safety Net Settings
const SAFETY_NET_REVOKE_MIN_WORDS = 5; // Minimum word count for the safety net to apply
const SAFETY_NET_REVOKE_MAX_DENSITY = 0.15; // Maximum allowed stopword density for the safety net to apply
const SAFETY_NET_OVERRIDE_MAX_WORDS = 25; // Max word count for the safety net to apply

const SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME = 0.85; // Minimum confidence for extremely confident guesses
const SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH = 0.60; // Minimum confidence for highly confident guesses

const SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME = 0.52; // Required density to overrule extremely high confidence
const SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH = 0.40; // Required density to overrule highly confident guesses
const SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT = 0.28; // Required density to overrule unsure guesses

// Dictionary Fallback Settings
// Fallback for short texts or when tinyld fails. Uses stopword density to determine the most likely language.
const FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS = 5; // Bias tie-breakers heavily towards allowed languages for <= 5 words
const FALLBACK_BIAS_SHORT_MAX_WORDS = 12; // Bias tie-breakers slightly towards allowed languages for <= 12 words
const FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT = 0; // Extra stopword match advantage given to allowed languages for extremely short texts
const FALLBACK_BIAS_ALLOWANCE_SHORT = 1; // Extra stopword match advantage given to allowed languages for short texts
const FALLBACK_BIAS_ALLOWANCE_DEFAULT = 2; // Extra stopword match advantage given to allowed languages for long texts

// Fallback density thresholds required to trust the result.
const FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED = 0.32; // % of words must be valid stopwords to pass the check
const FALLBACK_REQUIRED_DENSITY_LONG_REJECTED = 0.35; 
const FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED = 0.38;
const FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED = 0.40; 



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

    const minWords = strictnessSetting[0] === 'lenient' ? BASE_MIN_WORDS_LENIENT : BASE_MIN_WORDS_STRICT;

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

    // Quick short text check
    const quickThreshold = totalWords <= QUICK_CHECK_SHORT_TEXT_MAX_WORDS ? QUICK_CHECK_REQUIRED_DENSITY_SHORT : QUICK_CHECK_REQUIRED_DENSITY_MEDIUM;

    if (totalWords > 0 && (validWordCount / totalWords) >= quickThreshold) {
        return finish(`Passed Quick Stopwords [${validWordCount}/${totalWords}]`);
    }

    trace.push(`Stopwords [${validWordCount}/${totalWords}]`);

    // Script Analysis 
    const textLetters = [...text].filter(char => /\p{Letter}/u.test(char));
    const totalLetters = textLetters.length;
    const nonWhitespaceCount = [...text].filter(char => !/\s/.test(char)).length;
    let scriptFound = false;

    if (totalLetters > 0 && (totalLetters / nonWhitespaceCount >= SCRIPT_MIN_LETTER_DENSITY)) {
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
            { regex: /\p{Script=Telugu}/u, code: 'tel' },
            { regex: /\p{Script=Tamil}/u, code: 'tam' },
            { regex: /\p{Script=Telugu}/u, code: 'tel' },
            { regex: /\p{Script=Hebrew}/u, code: 'heb' }
        ];

        for (const script of scriptMappings) {
            const matchCount = textLetters.filter(char => script.regex.test(char)).length;
            const minScriptMatchPercentage = strictnessSetting[0] === 'lenient' ? SCRIPT_REQUIRED_MATCH_LENIENT : SCRIPT_REQUIRED_MATCH_STRICT;
            
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
        
        if (text.trim().length >= TINYLD_MIN_CHAR_LENGTH) {
            trace.push('Mode: tinyld');
            const minConfidence = strictnessSetting[0] === 'lenient' ? TINYLD_REQUIRED_CONFIDENCE_LENIENT : TINYLD_REQUIRED_CONFIDENCE_STRICT;
            const rawResults = detectAll(text);

            const results = rawResults.map(r => {
                const langData = iso6393.find(l => l.iso6391 === r.lang || l.iso6393 === r.lang);
                return { code: langData ? langData.iso6393 : 'und', score: r.accuracy };
            }).filter(r => r.code !== 'und');

            if (results.length > 0 && results[0].score >= minConfidence) {
                tinyldSuccess = true;
                langCode = results[0].code;
                
                const numToCheck = strictnessSetting[0] === 'lenient' ? TINYLD_LENIENT_TOP_RESULTS_TO_CHECK : 1;
                const topResultsToCheck = results.slice(0, numToCheck);
                const topResultsString = topResultsToCheck.map(r => `${r.code}:${r.score.toFixed(3)}`).join(', ');

                const allowedMatch = topResultsToCheck.find(r => allowedLanguages.includes(r.code) && r.score >= TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH);

                if (allowedMatch) {
                    if (totalWords >= SAFETY_NET_REVOKE_MIN_WORDS && (validWordCount / totalWords) < SAFETY_NET_REVOKE_MAX_DENSITY) {
                        trace.push(`tinyld matched allowed (${allowedMatch.code}:${allowedMatch.score.toFixed(3)}) but overridden due to low stopword density`);
                        tinyldSuccess = false; // Force fallback
                    } else {
                        return finish(`Passed: tinyld matched allowed lang in top ${numToCheck} (${topResultsString})`);
                    }
                } else {
                    // Scale the required density based on tinyld's confidence in the foreign language.
                    const isExtremelyConfident = results[0].score >= SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME;
                    const isHighlyConfident = results[0].score >= SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH;
                    
                    let requiredDensity = SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT;
                    if (isExtremelyConfident) requiredDensity = SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME; // Do not overrule extremely high confidence without overwhelming evidence
                    else if (isHighlyConfident) requiredDensity = SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH;

                    if (strictnessSetting[0] === 'lenient' && totalWords <= SAFETY_NET_OVERRIDE_MAX_WORDS && (validWordCount / totalWords) >= requiredDensity) {
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
    
                const biasAllowance = totalWords <= FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS ? FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT : (totalWords <= FALLBACK_BIAS_SHORT_MAX_WORDS ? FALLBACK_BIAS_ALLOWANCE_SHORT : FALLBACK_BIAS_ALLOWANCE_DEFAULT);
                if (bestAllowedMatch > 0 && (bestMatch - bestAllowedMatch <= biasAllowance)) {
                    bestLang = bestAllowedLang;
                    bestMatch = bestAllowedMatch;
                }
    
                let fallbackThreshold;
                if (allowedLanguages.includes(bestLang)) {
                    fallbackThreshold = totalWords > 10 ? FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED : FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED;
                } else {
                    fallbackThreshold = totalWords > 10 ? FALLBACK_REQUIRED_DENSITY_LONG_REJECTED : FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED; 
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
    const reason = await replaceWildcards(rawReason, item, langName)

    if (action === 'report') 
    {
        await context.reddit.report(item, { reason: reason });
        finish(`Action: Reported (${langCode})`);
    } 
    else if (action === 'filter') 
    {
        await context.reddit.filter(item.id, { reason: reason });
        finish(`Action: Filtered (${langCode})`);
        await sendRemovalNotification(context, item, "filter", langName);
    } 
    else if (action === 'remove') 
    {
        await context.reddit.remove(item.id, false);
        await context.reddit.addRemovalNote({ itemIds: [item.id], reasonId: "", modNote: reason });
        finish(`Action: Removed (${langCode})`);
        await sendRemovalNotification(context, item, "removal", langName);
    }
}

