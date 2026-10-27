import casesData from '../testData/cases.json';
const cases = casesData as Array<{ text: string; expected: string }>;
import {
    handleDetection,
    DetectionConfig,
    DEFAULT_DETECTION_CONFIG,
    PreparedText,
    preprocessText
} from '../src/handlers/detectionHandler.js';
import { TriggerContext } from '@devvit/public-api';
import { iso6393 } from 'iso-639-3';
import { stopwords } from '../src/helpers/stopwords-iso.js';
import { whitelistedWords } from '../src/helpers/word-whitelist.js';
import { detectAll } from 'tinyld';

const mockSettings: Record<string, any> = {
    'STRICTNESS': ['lenient'],
    'ALLOWED_LANGUAGES': ['eng'],
    'CUSTOM_WHITELIST': '',
    'ACTION_ON_UNSUPPORTED_POST': ['report'],
    'ACTION_ON_UNSUPPORTED_COMMENT': ['report'],
    'ACTION_REASON': 'Language not allowed: {{LangName}}',
    'SCAN_MODERATORS': true
};

const mockContext = {
    redis: {
        get: async () => null,
        set: async () => {},
        expire: async () => {}
    },
    settings: {
        get: async (key: string) => mockSettings[key],
        getAll: async () => mockSettings
    },
    reddit: {
        getPostById: async () => ({ isRemoved: () => false, authorName: 'test', subredditName: 'test', id: 't3_test' }),
        getCommentById: async () => ({ isRemoved: () => false, authorName: 'test', subredditName: 'test', id: 't1_test' }),
        report: async () => {},
        filter: async () => {},
        remove: async () => {},
        addRemovalNote: async () => {},
        getCurrentSubreddit: async () => (undefined),
    }
} as unknown as TriggerContext;




const isoBy6393 = new Map(iso6393.map(l => [l.iso6393, l]));
const isoBy6391 = new Map(iso6393.filter(l => l.iso6391).map(l => [l.iso6391!, l]));
const supportedLanguagesSet = new Set([
    'eng', 'cmn', 'hin', 'spa', 'fra', 'arb', 'ben', 'rus', 'por', 'urd',
    'ind', 'deu', 'jpn', 'mar', 'tel', 'tur', 'tam', 'vie', 'tgl', 'kor',
    'pes', 'pol', 'ita', 'nld', 'ron', 'ell', 'ces', 'swe', 'hun', 'fin',
    'dan', 'pan', 'guj', 'mal', 'kan', 'ori', 'sin', 'nep', 'tha', 'mya',
    'khm', 'jav', 'swa', 'hau', 'yor', 'ibo', 'zul', 'afr', 'amh', 'som',
    'ukr', 'bul', 'srp', 'hrv', 'slk', 'nor', 'cat', 'heb', 'kaz', 'uzb',
    'lit', 'lav', 'est'
]);
const TINYLD_BLACKLIST = new Set(['lat', 'vol', 'gle', 'epo', 'ido', 'ina', 'ile', 'san', 'jbo', 'tlh']);

export interface PrecomputedTestCase {
    index: number;
    text: string;
    expected: string;
    isExpectedAllowed: boolean;
    prepared: PreparedText;
}

export interface BenchmarkResult {
    passed: number;
    undefinedCount: number;
    slipped: number;
    failed: number;
    total: number;
    accuracy: number;
    durationSeconds: number;
}

let cachedTestCases: PrecomputedTestCase[] | null = null;

export function buildPrecomputedTestCases(silent: boolean = false): PrecomputedTestCase[] {
    if (cachedTestCases) return cachedTestCases;

    const allowedLanguages = mockSettings['ALLOWED_LANGUAGES'] as string[];
    const emptyCustomSet = new Set<string>();
    const precomputedList: PrecomputedTestCase[] = [];

    for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        const rawLang = testCase.expected?.trim().toLowerCase();
        const langData = rawLang ? (isoBy6391.get(rawLang) || isoBy6393.get(rawLang)) : undefined;

        if (!langData) {
            if (!silent) {
                console.log(`\nINVALID TEST CASE: "${testCase.text}"`);
                console.log(`   Expected label "${testCase.expected}" is not a valid ISO 639-1 or 639-3 code.`);
            }
            continue;
        }

        const expected = langData.iso6393;
        const prepared = preprocessText(testCase.text, false, emptyCustomSet);

        // Pre-compute raw tinyld scores once per case
        if (prepared.cleanedText.trim().length > 0) {
            prepared.rawTinyldScores = detectAll(prepared.cleanedText).map(r => {
                const ld = isoBy6391.get(r.lang) || isoBy6393.get(r.lang);
                return { code: ld ? ld.iso6393 : 'und', score: r.accuracy };
            }).filter(r => supportedLanguagesSet.has(r.code) && !TINYLD_BLACKLIST.has(r.code));
        } else {
            prepared.rawTinyldScores = [];
        }

        precomputedList.push({
            index: i,
            text: testCase.text,
            expected,
            isExpectedAllowed: allowedLanguages.includes(expected),
            prepared
        });
    }

    cachedTestCases = precomputedList;
    return precomputedList;
}

export async function runBenchmark(
    configOverrides?: Partial<DetectionConfig>,
    options: { silent?: boolean; usePrecomputed?: boolean; mode?: 'lenient' | 'strict' } = {}
): Promise<BenchmarkResult> {
    const { silent = false, usePrecomputed = false, mode = 'lenient' } = options;
    mockSettings['STRICTNESS'] = [mode];
    const originalLog = console.log;

    const allKnownWords = new Set<string>();
    if (!silent) {
        Object.values(whitelistedWords).forEach(list => list.forEach(w => allKnownWords.add(w.toLowerCase())));
        Object.values(stopwords as Record<string, string[]>).forEach(list => list.forEach(w => allKnownWords.add(w.toLowerCase())));

        for (const [langCode, list] of Object.entries(whitelistedWords)) {
            const langData = isoBy6393.get(langCode);
            const code2 = langData?.iso6391;
            const rawStopwords: string[] = code2 && (stopwords as any)[code2] ? (stopwords as any)[code2] : [];
            const langStopwords = new Set(rawStopwords.map(w => w.toLowerCase()));
            const duplicates = list.filter(w => langStopwords.has(w.toLowerCase()));

            if (duplicates.length > 0) {
                originalLog(`[WARN] whitelistedWords.${langCode} contains words already present in stopwords (${code2}): ${duplicates.join(', ')}`);
            }
        }
        originalLog(`Running ${cases.length} test cases...`);
    }

    const precomputedCases = usePrecomputed ? buildPrecomputedTestCases(silent) : null;
    const allowedLanguages = mockSettings['ALLOWED_LANGUAGES'] as string[];

    let passed = 0;
    let failed = 0;
    let slipped = 0;
    let undefinedCount = 0;
    const undefinedReasons: Record<string, number> = {};
    const missingWordCounts: Record<string, number> = {};

    const startTime = Date.now();
    const totalToRun = precomputedCases ? precomputedCases.length : cases.length;

    for (let i = 0; i < totalToRun; i++) {
        let traceOutput = '';
        console.log = silent ? () => {} : (msg: string) => { traceOutput = msg; };

        let text: string;
        let expected: string;
        let isExpectedAllowed: boolean;
        let prepared: PreparedText | undefined;

        if (precomputedCases) {
            const item = precomputedCases[i];
            text = item.text;
            expected = item.expected;
            isExpectedAllowed = item.isExpectedAllowed;
            prepared = item.prepared;
        } else {
            const testCase = cases[i];
            const rawLang = testCase.expected?.trim().toLowerCase();
            const langData = rawLang ? (isoBy6391.get(rawLang) || isoBy6393.get(rawLang)) : undefined;

            if (!langData) {
                if (!silent) {
                    originalLog(`\nINVALID TEST CASE: "${testCase.text}"`);
                    originalLog(`   Expected label "${testCase.expected}" is not a valid ISO 639-1 or 639-3 code.`);
                }
                failed++;
                continue;
            }
            text = testCase.text;
            expected = langData.iso6393;
            isExpectedAllowed = allowedLanguages.includes(expected);
        }

        const actual = await handleDetection(`t1_test_${i}`, mockContext, text, undefined, false, configOverrides, prepared);
        const isActualAllowed = allowedLanguages.includes(actual);

        if (actual === expected || (!isExpectedAllowed && !isActualAllowed && actual !== 'und')) {
            passed++;
        } else if (actual === 'und') {
            undefinedCount++;
            if (!silent) {
                const finalReason = traceOutput.split('->').pop()?.trim() || 'Unknown';
                const groupKey = finalReason
                    .replace(/\([a-z]{3}:[\d.]+\)/g, '([lang]:[score])')
                    .replace(/rejected: [a-z]{3}/g, 'rejected: [lang]')
                    .replace(/Detected [a-z]{3}/g, 'Detected [lang]')
                    .replace(/\(\d+\/\d+\)/g, '(#/#)');

                undefinedReasons[groupKey] = (undefinedReasons[groupKey] || 0) + 1;

                const textWords = text
                    .toLowerCase()
                    .replace(/[\u2018\u2019\u00B4\u0060]/g, "'")
                    .replace(/[^\p{Letter}\p{Number}\s']/gu, ' ')
                    .split(/\s+/)
                    .filter(w => w.length > 0);

                for (const word of textWords) {
                    if (!allKnownWords.has(word)) {
                        const key = `${word} (${expected})`;
                        missingWordCounts[key] = (missingWordCounts[key] || 0) + 1;
                    }
                }
            }
        } else if (!isExpectedAllowed && isActualAllowed) {
            slipped++;
            if (!silent) {
                const textWords = text
                    .toLowerCase()
                    .replace(/[\u2018\u2019\u00B4\u0060]/g, "'")
                    .replace(/[^\p{Letter}\p{Number}\s']/gu, ' ')
                    .split(/\s+/)
                    .filter(w => w.length > 0);

                for (const word of textWords) {
                    if (!allKnownWords.has(word)) {
                        const key = `${word} (${expected})`;
                        missingWordCounts[key] = (missingWordCounts[key] || 0) + 1;
                    }
                }
            }
        } else {
            failed++;
            if (!silent) {
                originalLog(`\nCRITICAL FAIL (False Positive): "${text}"`);
                originalLog(`   Expected: ${expected}, Got: ${actual}`);
                originalLog(`   Trace: ${traceOutput}`);
            }
        }
    }

    console.log = originalLog;

    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    const accuracy = (passed / cases.length) * 100;

    if (!silent) {
        const averageTime = (durationSeconds / cases.length).toFixed(5);
        console.log(`\n--- TEST SUMMARY ---`);
        console.log(`Correct:   ${passed}`);
        console.log(`Undefined: ${undefinedCount}`);
        console.log(`Slipped:   ${slipped} (Foreign text allowed by mistake)`);
        console.log(`Critical:  ${failed} (Allowed text removed by mistake)`);
        console.log(`Total:     ${cases.length}`);
        console.log(`Accuracy:  ${accuracy.toFixed(2)}%`);
        console.log(`Duration:  ${durationSeconds.toFixed(2)} seconds`);
        console.log(`Average:   ${averageTime} seconds per case`);

        console.log(`\n--- TOP UNDEFINED REASONS ---`);
        Object.entries(undefinedReasons)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([reason, count]) => {
                console.log(`${count.toString().padEnd(5)} | ${reason}`);
            });

        console.log(`\n--- TOP MISSED WORDS ---`);
        Object.entries(missingWordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([wordLang, count]) => {
                console.log(`${count.toString().padEnd(5)} | ${wordLang}`);
            });
    }

    return {
        passed,
        undefinedCount,
        slipped,
        failed,
        total: cases.length,
        accuracy,
        durationSeconds
    };
}

function parseCliOverrides(): Partial<DetectionConfig> {
    const overrides: Partial<DetectionConfig> = {};
    // @ts-ignore
    const args: string[] = typeof process !== 'undefined' && process.argv ? process.argv.slice(2) : [];

    for (const arg of args) {
        if (!arg.startsWith('--')) continue;
        const [rawKey, rawVal] = arg.slice(2).split('=');
        if (rawKey && rawVal !== undefined && rawKey in DEFAULT_DETECTION_CONFIG) {
            const numVal = Number(rawVal);
            if (!Number.isNaN(numVal)) {
                (overrides as any)[rawKey] = numVal;
            }
        }
    }
    return overrides;
}

// Only auto-run when executed directly (not when imported by the optimizer)
// @ts-ignore
const isDirectRun = typeof process !== 'undefined' && process.argv?.[1] && !process.argv[1].includes('optimizeConfig');
if (isDirectRun) {
    // @ts-ignore
    const args: string[] = typeof process !== 'undefined' && process.argv ? process.argv.slice(2) : [];
    const modeArg = args.find(a => a.startsWith('--mode='))?.split('=')[1];
    const mode: 'lenient' | 'strict' = modeArg === 'strict' ? 'strict' : 'lenient';
    const cliOverrides = parseCliOverrides();
    console.log(`Running in [${mode.toUpperCase()}] mode${Object.keys(cliOverrides).length ? ' with overrides: ' + JSON.stringify(cliOverrides) : ''}`);
    runBenchmark(cliOverrides, { silent: false, usePrecomputed: false, mode });
}
