// @ts-ignore
import fs from 'node:fs';
import { iso6393 } from 'iso-639-3';
import { whitelistedWords } from '../src/helpers/word-whitelist.js';
import { stopwords } from '../src/helpers/stopwords-iso.js';

const OUTPUT_PATH = './src/helpers/word-whitelist.sorted.ts';
const MAX_LINE_LENGTH = 90;

const isoBy6393 = new Map(iso6393.map(l => [l.iso6393, l]));

function formatStringLiteral(word: string): string {
    if (word.includes("'") && !word.includes('"')) {
        return `"${word.replace(/\\/g, '\\\\')}"`;
    }
    return `'${word.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function run() {
    const cleanedData: Record<string, string[]> = {};
    let removedInListDupes = 0;
    let removedStopwordDupes = 0;

    const globalRaw = whitelistedWords.global || [];
    const globalSet = new Set<string>();
    for (const w of globalRaw) {
        const lower = w.trim().toLowerCase();
        if (!lower) continue;
        if (globalSet.has(lower)) {
            removedInListDupes++;
        } else {
            globalSet.add(lower);
        }
    }
    cleanedData.global = Array.from(globalSet).sort((a, b) => a.localeCompare(b, 'en'));

    for (const [langCode, list] of Object.entries(whitelistedWords)) {
        if (langCode === 'global') continue;

        const langData = isoBy6393.get(langCode);
        const code2 = langData?.iso6391;
        const rawStopwords: string[] = code2 && (stopwords as any)[code2] ? (stopwords as any)[code2] : [];
        const langStopwords = new Set(rawStopwords.map(w => w.toLowerCase()));

        const langSet = new Set<string>();

        for (const w of list) {
            const lower = w.trim().toLowerCase();
            if (!lower) continue;

            if (langSet.has(lower)) {
                removedInListDupes++;
                continue;
            }
            if (langStopwords.has(lower)) {
                removedStopwordDupes++;
                console.log(`[STOPWORD DUPE] Removed "${lower}" from ${langCode} (already in stopwords.${code2})`);
                continue;
            }

            langSet.add(lower);
        }

        cleanedData[langCode] = Array.from(langSet).sort((a, b) =>
            a.localeCompare(b, code2 || 'en')
        );
    }

    const lines: string[] = [
        '// Whitelisted words are added to the StopWords list to prevent false positives in language detection.',
        '// Global words apply to all languages and are primarily internet slang, abbreviations, and common expressions.',
        '// Individual language words are added to the StopWords list for that specific language.',
        '',
        'export const whitelistedWords: Record<string, string[]> = {'
    ];

    const entries = Object.entries(cleanedData);
    entries.forEach(([langCode, words], idx) => {
        lines.push(`    ${langCode}: [`);

        let currentLine = '        ';
        words.forEach((word, wordIdx) => {
            const formatted = formatStringLiteral(word);
            const isLastWord = wordIdx === words.length - 1;
            const token = `${formatted}${isLastWord ? '' : ', '}`;

            if (currentLine.length + token.length > MAX_LINE_LENGTH && currentLine.trim().length > 0) {
                lines.push(currentLine.trimEnd());
                currentLine = `        ${token}`;
            } else {
                currentLine += token;
            }
        });

        if (currentLine.trim().length > 0) {
            lines.push(currentLine.trimEnd());
        }

        const isLastLang = idx === entries.length - 1;
        lines.push(`    ]${isLastLang ? '' : ','}`);
    });

    lines.push('};', '');

    fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');

    console.log('\n--- WHITELIST FORMAT SUMMARY ---');
    console.log(`Removed in-list duplicates:   ${removedInListDupes}`);
    console.log(`Removed stopword overlaps:    ${removedStopwordDupes}`);
    console.log(`Saved formatted file to:      ${OUTPUT_PATH}`);
}

run();