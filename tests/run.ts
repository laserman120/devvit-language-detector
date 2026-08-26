import cases from './cases.json';
import { handleDetection } from '../src/handlers/detectionHandler.js';
import { TriggerContext } from '@devvit/public-api';
import { iso6393 } from 'iso-639-3';

const mockSettings: Record<string, any> = {
    'STRICTNESS': ['lenient'],
    'ALLOWED_LANGUAGES': ['eng'],
    'CUSTOM_WHITELIST': '',
    'ACTION_ON_UNSUPPORTED_POST': ['report'],
    'ACTION_ON_UNSUPPORTED_COMMENT': ['report'],
    'ACTION_REASON': 'Language not allowed: {{LangName}}'
};

const mockContext = {
    redis: {
        get: async () => null,
        set: async () => {},
        expire: async () => {}
    },
    settings: {
        get: async (key: string) => mockSettings[key]
    },
    reddit: {
        getPostById: async () => ({ isRemoved: () => false, authorName: 'test', subredditName: 'test', id: 't3_test' }),
        getCommentById: async () => ({ isRemoved: () => false, authorName: 'test', subredditName: 'test', id: 't1_test' }),
        report: async () => {},
        filter: async () => {},
        remove: async () => {},
        addRemovalNote: async () => {}
    }
} as unknown as TriggerContext;

async function runTests() {
    let passed = 0;
    let failed = 0;
    let slipped = 0;
    let undefinedCount = 0;

    
    // Override console.log to capture trace without printing it unless failed
    let originalLog = console.log;

    for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        let traceOutput = '';
        
        console.log = (msg: string) => { traceOutput = msg; };
        
        await handleDetection(`t1_test_${i}`, mockContext, testCase.text);

        // Convert the 2-letter code from "labels" to the expected 3-letter code
        const rawLang = testCase.labels.toLowerCase();
        const langData = iso6393.find(l => l.iso6391 === rawLang);
        const expected = langData ? langData.iso6393 : rawLang;
        
        const actual = traceOutput.includes('Passed') ? 'eng' : 
                       traceOutput.match(/Action:.*?\(([^)]+)\)/)?.[1] || 'und';

        const allowedLanguages = mockSettings['ALLOWED_LANGUAGES'] as string[];
        const isExpectedAllowed = allowedLanguages.includes(expected);
        const isActualAllowed = allowedLanguages.includes(actual);

        if (actual === expected || (!isExpectedAllowed && !isActualAllowed && actual !== 'und')) {
            passed++;
        } else if (actual === 'und') {
            undefinedCount++;
            //originalLog(`\nUNDEFINED: "${testCase.text}"`);
            //originalLog(`   Expected: ${expected}, Got: ${actual}`);
            //originalLog(`   Trace: ${traceOutput}`);
            
        } else if (!isExpectedAllowed && isActualAllowed) {
            slipped++;
            //originalLog(`\nSLIPPED (False Negative): "${testCase.text}"`);
            //originalLog(`   Expected: ${expected}, Got: ${actual}`);
            //originalLog(`   Trace: ${traceOutput}`);
        } else {
            failed++;
            originalLog(`\nCRITICAL FAIL (False Positive): "${testCase.text}"`);
            originalLog(`   Expected: ${expected}, Got: ${actual}`);
            originalLog(`   Trace: ${traceOutput}`);
        }
    }
    
    console.log = originalLog;
    console.log(`\n--- TEST SUMMARY ---`);
    console.log(`Correct:   ${passed}`);
    console.log(`Undefined: ${undefinedCount}`);
    console.log(`Slipped:   ${slipped} (Foreign text allowed by mistake)`);
    console.log(`Critical:  ${failed} (Allowed text removed by mistake)`);
    console.log(`Total:     ${cases.length}`);
    console.log(`Accuracy:  ${(passed / cases.length * 100).toFixed(2)}%`);
}

runTests();