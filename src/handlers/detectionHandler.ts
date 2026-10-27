import { iso6393 } from 'iso-639-3';
import { Devvit, TriggerContext, Post, Comment } from "@devvit/public-api";
import { stopwords } from '../helpers/stopwords-iso.js';
import { whitelistedWords } from '../helpers/word-whitelist.js';
import { stripFormattingAndUrls } from '../helpers/textCleanupHelper.js';
import { detectAll } from 'tinyld';
import { replaceWildcards, sendRemovalNotification } from './notificationHandler.js';
import { stopwordBigrams } from '../helpers/stopword-bigrams.js';
import { actionedKey } from './dataHandler.js';

const supportedLanguages = new Set([
    'eng', 'cmn', 'hin', 'spa', 'fra', 'arb', 'ben', 'rus', 'por', 'urd', 
    'ind', 'deu', 'jpn', 'mar', 'tel', 'tur', 'tam', 'vie', 'tgl', 'kor', 
    'pes', 'pol', 'ita', 'nld', 'ron', 'ell', 'ces', 'swe', 'hun', 'fin', 
    'dan', 'pan', 'guj', 'mal', 'kan', 'ori', 'sin', 'nep', 'tha', 'mya', 
    'khm', 'jav', 'swa', 'hau', 'yor', 'ibo', 'zul', 'afr', 'amh', 'som', 
    'ukr', 'bul', 'srp', 'hrv', 'slk', 'nor', 'cat', 'heb', 'kaz', 'uzb', 
    'lit', 'lav', 'est'
]);

// Pre-computed ISO Maps and Language Word Sets
const isoBy6393 = new Map(iso6393.map(l => [l.iso6393, l]));
const isoBy6391 = new Map(iso6393.filter(l => l.iso6391).map(l => [l.iso6391!, l]));

const globalWhitelistedSet = new Set<string>(
    (whitelistedWords.global || []).map(w => w.toLowerCase())
);

const languageWordSets = new Map<string, Set<string>>();
for (const code3 of supportedLanguages) {
    const set = new Set<string>();
    if (whitelistedWords[code3]) {
        for (const w of whitelistedWords[code3]) set.add(w.toLowerCase());
    }
    const langData = isoBy6393.get(code3);
    const stopwordList = langData?.iso6391 ? (stopwords as any)[langData.iso6391] : undefined;
    if (stopwordList) {
        for (const w of stopwordList) set.add(w.toLowerCase());
    }
    languageWordSets.set(code3, set);
}

const SCRIPT_MAPPINGS = [
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
    { regex: /\p{Script=Hebrew}/u, code: 'heb' }
];

// Detection Settings:

export interface DetectionConfig {
    BASE_MIN_WORDS: number;
    QUICK_CHECK_SHORT_TEXT_MAX_WORDS: number;
    QUICK_CHECK_REQUIRED_DENSITY_SHORT: number;
    QUICK_CHECK_REQUIRED_DENSITY_MEDIUM: number;
    SCRIPT_MIN_LETTER_DENSITY: number;
    SCRIPT_REQUIRED_MATCH: number;
    TINYLD_MIN_CHAR_LENGTH: number;
    TINYLD_REQUIRED_CONFIDENCE: number;
    TINYLD_TOP_RESULTS_TO_CHECK: number;
    TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH: number;
    SAFETY_NET_REVOKE_MIN_WORDS: number;
    SAFETY_NET_REVOKE_MAX_DENSITY: number;
    SAFETY_NET_OVERRIDE_MAX_WORDS: number;
    SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME: number;
    SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH: number;
    SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME: number;
    SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH: number;
    SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT: number;
    FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS: number;
    FALLBACK_BIAS_SHORT_MAX_WORDS: number;
    FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT: number;
    FALLBACK_BIAS_ALLOWANCE_SHORT: number;
    FALLBACK_BIAS_ALLOWANCE_DEFAULT: number;
    FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED: number;
    FALLBACK_REQUIRED_DENSITY_LONG_REJECTED: number;
    FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED: number;
    FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED: number;
    FALLBACK_MIN_MATCHES_FOR_REJECTION: number;
}

export const LENIENT_DETECTION_CONFIG: DetectionConfig = {
    // Word Count for detailed detection. 
    BASE_MIN_WORDS: 2, // Minimum word count for lenient mode

    // Quick Stopword Settings
    // The quick stopword check is a fast pre-check to catch obvious allowed languages before running more expensive detection methods.
    QUICK_CHECK_SHORT_TEXT_MAX_WORDS: 10, // Maximum word count for a text to be considered "short" for quick stopword checks
    QUICK_CHECK_REQUIRED_DENSITY_SHORT: 0.80, // Required stopword density for short texts to pass the quick check
    QUICK_CHECK_REQUIRED_DENSITY_MEDIUM: 0.75, // Required stopword density for medium-length texts to pass the quick check
    // Script Analysis Settings
    // Quick script analysis to catch non-latin scripts without running the full detection.
    SCRIPT_MIN_LETTER_DENSITY: 0.42, // Minimum letter to non-whitespace ratio to avoid kaomoji false positives
    SCRIPT_REQUIRED_MATCH: 0.40, // Minimum percentage of characters matching a script for short text detection
    // TinyLd Settings & Safety Nets
    // TinyLd is only used if enough text is present. Safety net is used to prevent false positives on short texts. Rejection favored over mistakes.
    TINYLD_MIN_CHAR_LENGTH: 10, // Minimum text length for language detection
    TINYLD_REQUIRED_CONFIDENCE: 0.42, // Minimum confidence for lenient mode
    TINYLD_TOP_RESULTS_TO_CHECK: 3, // Number of top results to check for lenient mode
    TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH: 0.30, // Minimum score for an allowed language to be accepted from top results
    // TinyLD Safety Net Settings
    SAFETY_NET_REVOKE_MIN_WORDS: 6, // Minimum word count for the safety net to apply
    SAFETY_NET_REVOKE_MAX_DENSITY: 0.35, // Maximum allowed stopword density for the safety net to apply
    SAFETY_NET_OVERRIDE_MAX_WORDS: 21,  // Max word count for the safety net to apply
    SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME: 0.75, // Minimum confidence for extremely confident guesses
    SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH: 0.45, // Minimum confidence for highly confident guesses
    SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME: 0.54, // Required density to overrule extremely high confidence
    SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH: 0.52, // Required density to overrule highly confident guesses
    SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT: 0.38, // Required density to overrule unsure guesses
    // Dictionary Fallback Settings
    // Fallback for short texts or when tinyld fails. Uses stopword density to determine the most likely language.
    FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS: 6, // Bias tie-breakers heavily towards allowed languages for <= 5 words
    FALLBACK_BIAS_SHORT_MAX_WORDS: 22, // Bias tie-breakers slightly towards allowed languages for <= 12 words
    FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT: 0, // Extra stopword match advantage given to allowed languages for extremely short texts
    FALLBACK_BIAS_ALLOWANCE_SHORT: 0, // Extra stopword match advantage given to allowed languages for short texts
    FALLBACK_BIAS_ALLOWANCE_DEFAULT: 1, // Extra stopword match advantage given to allowed languages for long texts
    // Fallback density thresholds required to trust the result.
    FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED: 0.26, // % of words must be valid stopwords to pass the check
    FALLBACK_REQUIRED_DENSITY_LONG_REJECTED: 0.26,
    FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED: 0.28,
    FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED: 0.28,
    FALLBACK_MIN_MATCHES_FOR_REJECTION: 2, // Minimum number of stopword matches required to reject a language in the fallback check
};

export const STRICT_DETECTION_CONFIG: DetectionConfig = {
    ...LENIENT_DETECTION_CONFIG,
    BASE_MIN_WORDS: 2,
    QUICK_CHECK_SHORT_TEXT_MAX_WORDS: 7,
    QUICK_CHECK_REQUIRED_DENSITY_SHORT: 0.8,
    QUICK_CHECK_REQUIRED_DENSITY_MEDIUM: 0.54,
    SCRIPT_MIN_LETTER_DENSITY: 0.43,
    SCRIPT_REQUIRED_MATCH: 0.3,
    TINYLD_MIN_CHAR_LENGTH: 10,
    TINYLD_REQUIRED_CONFIDENCE: 0.35,
    TINYLD_TOP_RESULTS_TO_CHECK: 1,
    TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH: 0.3,
    SAFETY_NET_REVOKE_MIN_WORDS: 4,
    SAFETY_NET_REVOKE_MAX_DENSITY: 0.35,
    SAFETY_NET_OVERRIDE_MAX_WORDS: 10,
    SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME: 0.89,
    SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH: 0.45,
    SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME: 0.74,
    SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH: 0.55,
    SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT: 0.55,
    FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS: 4,
    FALLBACK_BIAS_SHORT_MAX_WORDS: 22,
    FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT: 0,
    FALLBACK_BIAS_ALLOWANCE_SHORT: 0,
    FALLBACK_BIAS_ALLOWANCE_DEFAULT: 1,
    FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED: 0.26,
    FALLBACK_REQUIRED_DENSITY_LONG_REJECTED: 0.26,
    FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED: 0.28,
    FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED: 0.28,
    FALLBACK_MIN_MATCHES_FOR_REJECTION: 1
};

export const DEFAULT_DETECTION_CONFIG = LENIENT_DETECTION_CONFIG;

const TINYLD_BLACKLIST = new Set(['lat', 'vol', 'gle', 'epo', 'ido', 'ina', 'ile', 'san', 'jbo', 'tlh']);

export interface PreparedText {
    cleanedText: string;
    words: string[];
    textLetters: string[];
    nonWhitespaceCount: number;
    rawTinyldScores?: Array<{ code: string; score: number }>;
}

function parseCustomSet(rawStr: string): Set<string> {
    const set = new Set<string>();
    if (rawStr.trim().length > 0) {
        const tokens = rawStr
            .split(/[,;]+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0);
        for (const t of tokens) set.add(t);
    }
    return set;
}

export function preprocessText(rawText: string, ignoreCodeBlocks: boolean, customIgnored: Set<string>, trace?: string[]): PreparedText {
    let text = stripFormattingAndUrls(rawText, ignoreCodeBlocks).replace(/[\u2018\u2019\u00B4\u0060]/g, "'");

    if (customIgnored.size > 0) {
        trace?.push(`Loaded ${customIgnored.size} ignored`);
        text = text.toLowerCase();
        for (const ignored of customIgnored) {
            const escaped = ignored.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'gu');
            text = text.replace(regex, ' ');
        }
    } else {
        text = text.toLowerCase();
    }

    const cleanedText = text.split(/\s+/).filter(w => !/\d/.test(w)).join(' ');
    const words = cleanedText.replace(/[^\p{Letter}\p{Number}\s']/gu, ' ').split(/\s+/).filter(w => w.length > 0);

    const chars = [...cleanedText];
    const textLetters = chars.filter(char => /\p{Letter}/u.test(char));
    const nonWhitespaceCount = chars.filter(char => !/\s/.test(char)).length;

    return { cleanedText, words, textLetters, nonWhitespaceCount };
}

function countAllowedWords(words: string[], allowedLanguages: string[], customAllowedWords: Set<string>): number {
    let count = 0;
    for (const word of words) {
        if (globalWhitelistedSet.has(word) || customAllowedWords.has(word)) {
            count++;
            continue;
        }
        for (const code3 of allowedLanguages) {
            if (languageWordSets.get(code3)?.has(word)) {
                count++;
                break;
            }
        }
    }
    return count;
}

function checkQuickPass(
    words: string[],
    validWordCount: number,
    allowedLanguages: string[],
    cfg: DetectionConfig
): { passed: boolean; code: string; reason: string } {
    const totalWords = words.length;
    const quickThreshold = totalWords <= cfg.QUICK_CHECK_SHORT_TEXT_MAX_WORDS
        ? cfg.QUICK_CHECK_REQUIRED_DENSITY_SHORT
        : cfg.QUICK_CHECK_REQUIRED_DENSITY_MEDIUM;

    if (totalWords > 0 && (validWordCount / totalWords) >= quickThreshold) {
        return {
            passed: true,
            code: allowedLanguages[0] || 'und',
            reason: `Passed Quick Stopwords [${validWordCount}/${totalWords}]`
        };
    }

    if (totalWords <= cfg.QUICK_CHECK_SHORT_TEXT_MAX_WORDS) {
        const joinedText = ` ${words.join(' ')} `;
        for (const code3 of allowedLanguages) {
            const bigrams = stopwordBigrams[code3];
            if (bigrams) {
                for (const bigram of bigrams) {
                    if (joinedText.includes(` ${bigram} `)) {
                        return {
                            passed: true,
                            code: code3,
                            reason: `Passed Quick Bigrams [${code3}: "${bigram}"]`
                        };
                    }
                }
            }
        }
    }

    return { passed: false, code: 'und', reason: '' };
}

function analyzeScript(
    prepared: PreparedText,
    cfg: DetectionConfig,
    trace: string[]
): { scriptFound: boolean; code: string } {
    const totalLetters = prepared.textLetters.length;
    if (totalLetters > 0 && (totalLetters / prepared.nonWhitespaceCount >= cfg.SCRIPT_MIN_LETTER_DENSITY)) {
        for (const script of SCRIPT_MAPPINGS) {
            const matchCount = prepared.textLetters.filter(char => script.regex.test(char)).length;
            if (matchCount / totalLetters > cfg.SCRIPT_REQUIRED_MATCH) {
                trace.push(`Mode: Script Analysis -> Detected ${script.code}`);
                return { scriptFound: true, code: script.code };
            }
        }
    }
    return { scriptFound: false, code: 'und' };
}

function evaluateTinyLd(
    prepared: PreparedText,
    validWordCount: number,
    allowedLanguages: string[],
    cfg: DetectionConfig,
    trace: string[]
): { status: 'allowed' | 'rejected' | 'fallback'; code: string; reason?: string } {
    if (prepared.cleanedText.trim().length < cfg.TINYLD_MIN_CHAR_LENGTH) {
        return { status: 'fallback', code: 'und' };
    }

    trace.push('Mode: tinyld');
    const minConfidence = cfg.TINYLD_REQUIRED_CONFIDENCE;

    const results = prepared.rawTinyldScores ?? detectAll(prepared.cleanedText).map(r => {
        const langData = isoBy6391.get(r.lang) || isoBy6393.get(r.lang);
        return { code: langData ? langData.iso6393 : 'und', score: r.accuracy };
    }).filter(r => supportedLanguages.has(r.code) && !TINYLD_BLACKLIST.has(r.code));

    if (results.length === 0 || results[0].score < minConfidence) {
        if (results.length === 0) {
            trace.push('tinyld rejected: No results returned');
        } else {
            trace.push(`tinyld rejected: No results met confidence threshold (${results[0].score} < ${minConfidence})`);
        }
        return { status: 'fallback', code: 'und' };
    }

    const totalWords = prepared.words.length;
    const numToCheck = cfg.TINYLD_TOP_RESULTS_TO_CHECK;
    const topResultsToCheck = results.slice(0, numToCheck);
    const topResultsString = topResultsToCheck.map(r => `${r.code}:${r.score.toFixed(3)}`).join(', ');

    const allowedMatch = topResultsToCheck.find(
        r => allowedLanguages.includes(r.code) && r.score >= cfg.TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH
    );

    if (allowedMatch) {
        if (totalWords >= cfg.SAFETY_NET_REVOKE_MIN_WORDS && (validWordCount / totalWords) < cfg.SAFETY_NET_REVOKE_MAX_DENSITY) {
            trace.push(`tinyld matched allowed (${allowedMatch.code}:${allowedMatch.score.toFixed(3)}) but overridden due to low stopword density`);
            return { status: 'fallback', code: 'und' };
        }
        return {
            status: 'allowed',
            code: allowedMatch.code,
            reason: `Passed: tinyld matched allowed lang in top ${numToCheck} (${topResultsString})`
        };
    }

    const isExtremelyConfident = results[0].score >= cfg.SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME;
    const isHighlyConfident = results[0].score >= cfg.SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH;

    let requiredDensity = cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT;
    if (isExtremelyConfident) requiredDensity = cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME;
    else if (isHighlyConfident) requiredDensity = cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH;

    if (totalWords <= cfg.SAFETY_NET_OVERRIDE_MAX_WORDS && (validWordCount / totalWords) >= requiredDensity) {
        return {
            status: 'allowed',
            code: allowedLanguages[0] || 'und',
            reason: `Passed (Safety Net): tinyld rejected (${topResultsString}) but found ${validWordCount}/${totalWords} allowed stopwords`
        };
    }

    trace.push(`tinyld rejected: Top results (${topResultsString})`);
    return { status: 'rejected', code: results[0].code };
}

function evaluateDictionaryFallback(
    words: string[],
    allowedLanguages: string[],
    cfg: DetectionConfig,
    trace: string[]
): { status: 'allowed' | 'rejected' | 'undetermined'; code: string; reason: string } {
    const totalWords = words.length;
    let bestLang = 'und';
    let bestMatch = 0;
    let bestAllowedLang = 'und';
    let bestAllowedMatch = 0;

    for (const code3 of supportedLanguages) {
        const langWords = languageWordSets.get(code3);
        if (!langWords || langWords.size === 0) continue;

        let matchCount = 0;
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

    const biasAllowance = totalWords <= cfg.FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS
        ? cfg.FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT
        : (totalWords <= cfg.FALLBACK_BIAS_SHORT_MAX_WORDS ? cfg.FALLBACK_BIAS_ALLOWANCE_SHORT : cfg.FALLBACK_BIAS_ALLOWANCE_DEFAULT);

    if (bestAllowedMatch > 0 && (bestMatch - bestAllowedMatch <= biasAllowance)) {
        bestLang = bestAllowedLang;
        bestMatch = bestAllowedMatch;
    }

    const isBestAllowed = allowedLanguages.includes(bestLang);
    const fallbackThreshold = isBestAllowed
        ? (totalWords > 10 ? cfg.FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED : cfg.FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED)
        : (totalWords > 10 ? cfg.FALLBACK_REQUIRED_DENSITY_LONG_REJECTED : cfg.FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED);

    if (!isBestAllowed && bestMatch < cfg.FALLBACK_MIN_MATCHES_FOR_REJECTION) {
        return {
            status: 'undetermined',
            code: 'und',
            reason: `Skipped: Insufficient matches for rejection (${bestMatch}/${totalWords} words matched for ${bestLang})`
        };
    }

    if (totalWords > 0 && (bestMatch / totalWords) >= fallbackThreshold) {
        trace.push(`Mode: Dictionary Fallback -> Detected ${bestLang} (${bestMatch}/${totalWords})`);
        if (isBestAllowed) {
            return {
                status: 'allowed',
                code: bestLang,
                reason: `Passed: Dictionary fallback allowed (${bestLang})`
            };
        }
        trace.push(`Dictionary Fallback rejected: ${bestLang}`);
        return { status: 'rejected', code: bestLang, reason: '' };
    }

    return {
        status: 'undetermined',
        code: 'und',
        reason: `Skipped: Language could not be determined (${bestMatch}/${totalWords} words matched)`
    };
}

async function executeModerationAction(
    itemId: string,
    langCode: string,
    allSettings: Record<string, any>,
    context: TriggerContext,
    trace: string[],
    finish: (msg: string, returnCode?: string) => string
): Promise<string> {
    let item: Post | Comment;
    let actionSetting: string[];

    if (itemId.startsWith("t3_")) {
        item = await context.reddit.getPostById(itemId);
        actionSetting = (allSettings['ACTION_ON_UNSUPPORTED_POST'] as string[]) ?? ['report'];
    } else if (itemId.startsWith("t1_")) {
        item = await context.reddit.getCommentById(itemId);
        actionSetting = (allSettings['ACTION_ON_UNSUPPORTED_COMMENT'] as string[]) ?? ['report'];
    } else {
        return finish('Skipped: Neither post nor comment');
    }

    const scanModerators = (allSettings['SCAN_MODERATORS'] as boolean) ?? false;
    if (!scanModerators) {
        const subreddit = await context.reddit.getCurrentSubreddit();
        const moderators = await context.reddit.getModerators({ subredditName: subreddit.name, username: item.authorName }).all();
        if (moderators.length === 1) {
            return finish('Skipped: Author is a moderator');
        }
    }

    const isRemoved = await checkIfRemoved(item, itemId, context);
    if (isRemoved) {
        return finish('Skipped: Already removed');
    }

    const langData = isoBy6393.get(langCode);
    const langName = langData?.name || langCode;
    const action = actionSetting[0];
    const rawReason = (allSettings['ACTION_REASON'] as string) ?? 'Language not allowed: {{LangName}}';
    const reason = await replaceWildcards(rawReason, item, langName);

    if (action === 'report') {
        await context.reddit.report(item, { reason });
        finish(`Action: Reported (${langCode})`, langCode);
    } else if (action === 'filter') {
        await context.reddit.filter(item.id, { reason });
        finish(`Action: Filtered (${langCode})`, langCode);
        await sendRemovalNotification(context, item, "filter", langName, trace.join(' -> '));
    } else if (action === 'remove') {
        await context.reddit.remove(item.id, false);
        await context.reddit.addRemovalNote({ itemIds: [item.id], reasonId: "", modNote: reason });
        finish(`Action: Removed (${langCode})`, langCode);
        await sendRemovalNotification(context, item, "removal", langName, trace.join(' -> '));
    }

    const dataCollectionEnabled = (allSettings['DATA_COLLECTION'] as boolean) ?? false;
    if (dataCollectionEnabled) {
        const dataRedisKey = `${actionedKey}${item.id}`;
        await context.redis.set(dataRedisKey, 'true');
        await context.redis.expire(dataRedisKey, 604800);
        console.log("[Data Collection] Logged flagged item to Redis for data collection: " + dataRedisKey);
    }

    const editChecksEnabled = (allSettings['REPORT_EDITS'] as boolean) ?? false;
    if (editChecksEnabled) {
        const editRedisKey = `actioned:${item.id}`;
        await context.redis.set(editRedisKey, 'true');
        await context.redis.expire(editRedisKey, 43200);
        console.log("[EditChecks] Logged flagged item to Redis for edit checks: " + editRedisKey);
    }

    return langCode;
}

export async function handleDetection(
    itemId: string,
    context: TriggerContext,
    text: string,
    redditLangCode?: string,
    takeAction: boolean = true,
    configOverrides?: Partial<DetectionConfig>,
    precomputed?: PreparedText
): Promise<string> {
    const allSettings = await context.settings.getAll();
    const strictnessSetting = (allSettings['STRICTNESS'] as string[]) ?? ['lenient'];
    const isLenient = strictnessSetting[0] === 'lenient';
    const baseConfig = isLenient ? LENIENT_DETECTION_CONFIG : STRICT_DETECTION_CONFIG;
    const cfg: DetectionConfig = configOverrides
        ? { ...baseConfig, ...configOverrides }
        : baseConfig;

    const trace: string[] = [];
    const finish = (msg: string, returnCode: string = 'und') => {
        trace.push(msg);
        console.log(`[${itemId}] ${trace.join(' -> ')}`);
        return returnCode;
    };

    const redisKey = `processed:${itemId}`;
    if (takeAction) {
        const alreadyProcessed = await context.redis.get(redisKey);
        if (alreadyProcessed) {
            return finish('Already processed recently');
        }
        await context.redis.set(redisKey, 'true');
        await context.redis.expire(redisKey, 60);
    }

    trace.push("Original: " + text);

    const allowedLanguages = (allSettings['ALLOWED_LANGUAGES'] as string[]) || ['eng'];
    const ignoreCodeBlocks = (allSettings['IGNORE_CODE_BLOCKS'] as boolean) ?? false;
    const increaseMinWords = (allSettings['INCREASE_MIN_WORDS'] as boolean) ?? false;

    const customIgnored = parseCustomSet((allSettings['CUSTOM_IGNORED'] as string) ?? '');
    const customAllowedWords = parseCustomSet((allSettings['CUSTOM_WHITELIST'] as string) ?? '');
    if (customAllowedWords.size > 0) {
        trace.push(`Loaded ${customAllowedWords.size} whitelisted`);
    }

    const prepared = precomputed ?? preprocessText(text, ignoreCodeBlocks, customIgnored, trace);
    const { words } = prepared;
    const totalWords = words.length;

    trace.push("Cleaned: " + words.join(' '));

    let minWords = cfg.BASE_MIN_WORDS;
    if (increaseMinWords) minWords += 1;

    const hasAnyAllowedWords = globalWhitelistedSet.size > 0 || customAllowedWords.size > 0 || allowedLanguages.some(c => (languageWordSets.get(c)?.size ?? 0) > 0);
    if (!hasAnyAllowedWords) {
        return finish("Skipped: Allowed Words list is empty! Critical!");
    }

    const validWordCount = countAllowedWords(words, allowedLanguages, customAllowedWords);

    // Quick Stopword & Bigram Check
    const quickResult = checkQuickPass(words, validWordCount, allowedLanguages, cfg);
    if (quickResult.passed) {
        return finish(quickResult.reason, quickResult.code);
    }
    trace.push(`Stopwords [${validWordCount}/${totalWords}]`);

    // Non-Latin Script Analysis
    let langCode = 'und';
    const scriptResult = analyzeScript(prepared, cfg, trace)

    if (scriptResult.scriptFound) {
        langCode = scriptResult.code;
        if (allowedLanguages.includes(langCode)) {
            return finish(`Passed: Script check allowed (${langCode})`, langCode);
        }
        trace.push(`Script check rejected: ${langCode}`);
    } else {
        if (totalWords < minWords) {
            return finish(`Skipped: Text contains less than ${minWords} words`);
        }

        // TinyLD N-gram Evaluation
        const tinyldResult = evaluateTinyLd(prepared, validWordCount, allowedLanguages, cfg, trace)
        if (tinyldResult.status === 'allowed') {
            return finish(tinyldResult.reason!, tinyldResult.code);
        } else if (tinyldResult.status === 'rejected') {
            langCode = tinyldResult.code;
        } else {
            // Dictionary Stopword Fallback
            const fallbackResult = evaluateDictionaryFallback(words, allowedLanguages, cfg, trace);
            if (fallbackResult.status === 'allowed') {
                return finish(fallbackResult.reason, fallbackResult.code);
            } else if (fallbackResult.status === 'undetermined') {
                return finish(fallbackResult.reason);
            }
            langCode = fallbackResult.code;
        }
    }

    if (langCode === 'und') {
        return finish('Skipped: Language could not be determined');
    }

    if (!takeAction) {
        return finish(`Action Skipped (takeAction=false) (${langCode})`, langCode);
    }

    return executeModerationAction(itemId, langCode, allSettings, context, trace, finish);
}

async function checkIfRemoved(item: Post | Comment, itemId: string, context: TriggerContext): Promise<boolean> {
    let isPost = false;
    if(itemId.startsWith("t3_")){
        isPost = true;
    }

    if (isPost) {
        const post = item as Post;
        if(post.removedByCategory || post.isRemoved()) {
            return true;
        }
    } else {
        // Its a comment check for removal state through modlog
        const subreddit = await context.reddit.getCurrentSubreddit();
        if(!subreddit) {
            return false;
        }
        const modlog = await context.reddit.getModerationLog({ subredditName: subreddit.name, limit: 100, type: "removecomment" }).all();

        for (const entry of modlog) {
            if(entry.target && entry.target.id === itemId) {
                return true;
            }
        }
    }
    
    return false;
}
