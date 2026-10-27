// @ts-ignore
import fs from 'node:fs';
import {
    DetectionConfig,
    LENIENT_DETECTION_CONFIG,
    STRICT_DETECTION_CONFIG
} from '../src/handlers/detectionHandler.js';
import { runBenchmark, buildPrecomputedTestCases, BenchmarkResult } from './benchmark.js';

// @ts-ignore
const cliArgs: string[] = typeof process !== 'undefined' && process.argv ? process.argv.slice(2) : [];
const MODE: 'lenient' | 'strict' = cliArgs.find(a => a.startsWith('--mode='))?.split('=')[1] === 'strict' ? 'strict' : 'lenient';
const maxCritArg = cliArgs.find(a => a.startsWith('--max-critical='))?.split('=')[1];
const DEFAULT_MAX_CRITICAL = MODE === 'strict' ? 25 : 0; // Default 0 for lenient, 25 (~0.07%) for strict
const MAX_ALLOWED_CRITICAL = maxCritArg !== undefined ? Number(maxCritArg) : DEFAULT_MAX_CRITICAL;

const SAVE_PATH = `./scripts/best-config-${MODE}.json`;
const BASE_CONFIG = MODE === 'strict' ? STRICT_DETECTION_CONFIG : LENIENT_DETECTION_CONFIG;

interface ParameterSpec {
    key: keyof DetectionConfig;
    min: number;
    max: number;
    steps: number[];
    isInt?: boolean;
}

// Tunable parameters for lenient mode
const TUNABLE_PARAMETERS: ParameterSpec[] = [
    { key: 'QUICK_CHECK_SHORT_TEXT_MAX_WORDS', min: 6, max: 16, steps: [2, 1], isInt: true },
    { key: 'QUICK_CHECK_REQUIRED_DENSITY_SHORT', min: 0.55, max: 0.85, steps: [0.05, 0.02, 0.01] },
    { key: 'QUICK_CHECK_REQUIRED_DENSITY_MEDIUM', min: 0.45, max: 0.75, steps: [0.05, 0.02, 0.01] },
    { key: 'SCRIPT_MIN_LETTER_DENSITY', min: 0.25, max: 0.60, steps: [0.05, 0.02, 0.01] },
    { key: 'SCRIPT_REQUIRED_MATCH', min: 0.30, max: 0.60, steps: [0.05, 0.02, 0.01] },
    { key: 'TINYLD_MIN_CHAR_LENGTH', min: 10, max: 25, steps: [2, 1], isInt: true },
    { key: 'TINYLD_REQUIRED_CONFIDENCE', min: 0.40, max: 0.75, steps: [0.05, 0.02, 0.01] },
    { key: 'TINYLD_TOP_RESULTS_TO_CHECK', min: 1, max: 4, steps: [1], isInt: true },
    { key: 'TINYLD_MIN_SCORE_FOR_ALLOWED_MATCH', min: 0.15, max: 0.40, steps: [0.05, 0.02, 0.01] },
    { key: 'SAFETY_NET_REVOKE_MIN_WORDS', min: 4, max: 10, steps: [1], isInt: true },
    { key: 'SAFETY_NET_REVOKE_MAX_DENSITY', min: 0.10, max: 0.35, steps: [0.05, 0.02, 0.01] },
    { key: 'SAFETY_NET_OVERRIDE_MAX_WORDS', min: 10, max: 35, steps: [2, 1], isInt: true },
    { key: 'SAFETY_NET_OVERRIDE_TINYLD_CONF_EXTREME', min: 0.68, max: 0.95, steps: [0.05, 0.02, 0.01] },
    { key: 'SAFETY_NET_OVERRIDE_TINYLD_CONF_HIGH', min: 0.45, max: 0.74, steps: [0.05, 0.02, 0.01] },
    { key: 'SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME', min: 0.45, max: 0.75, steps: [0.05, 0.02, 0.01] },
    { key: 'SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH', min: 0.35, max: 0.60, steps: [0.05, 0.02, 0.01] },
    { key: 'SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT', min: 0.25, max: 0.50, steps: [0.05, 0.02, 0.01] },
    { key: 'FALLBACK_BIAS_EXTREMELY_SHORT_MAX_WORDS', min: 3, max: 7, steps: [1], isInt: true },
    { key: 'FALLBACK_BIAS_SHORT_MAX_WORDS', min: 8, max: 22, steps: [2, 1], isInt: true },
    { key: 'FALLBACK_BIAS_ALLOWANCE_EXTREMELY_SHORT', min: 0, max: 1, steps: [1], isInt: true },
    { key: 'FALLBACK_BIAS_ALLOWANCE_SHORT', min: 0, max: 2, steps: [1], isInt: true },
    { key: 'FALLBACK_BIAS_ALLOWANCE_DEFAULT', min: 1, max: 3, steps: [1], isInt: true },
    { key: 'FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED', min: 0.22, max: 0.45, steps: [0.05, 0.02, 0.01] },
    { key: 'FALLBACK_REQUIRED_DENSITY_LONG_REJECTED', min: 0.26, max: 0.50, steps: [0.05, 0.02, 0.01] },
    { key: 'FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED', min: 0.28, max: 0.55, steps: [0.05, 0.02, 0.01] },
    { key: 'FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED', min: 0.25, max: 0.60, steps: [0.05, 0.02, 0.01] },
    { key: 'FALLBACK_MIN_MATCHES_FOR_REJECTION', min: MODE === 'strict' ? 1 : 2, max: 3, steps: [1], isInt: true }
];

function isValidConfig(cfg: DetectionConfig): boolean {
    if (cfg.QUICK_CHECK_REQUIRED_DENSITY_MEDIUM > cfg.QUICK_CHECK_REQUIRED_DENSITY_SHORT) return false;
    if (cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_DEFAULT > cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH) return false;
    if (cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_HIGH > cfg.SAFETY_NET_OVERRIDE_REQ_DENSITY_EXTREME) return false;
    if (cfg.FALLBACK_REQUIRED_DENSITY_LONG_ALLOWED > cfg.FALLBACK_REQUIRED_DENSITY_LONG_REJECTED) return false;
    if (cfg.FALLBACK_REQUIRED_DENSITY_SHORT_ALLOWED > cfg.FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED) return false;
    if (cfg.FALLBACK_REQUIRED_DENSITY_LONG_REJECTED > cfg.FALLBACK_REQUIRED_DENSITY_SHORT_REJECTED) return false;
    return true;
}

function roundVal(val: number, isInt?: boolean): number {
    return isInt ? Math.round(val) : Math.round(val * 1000) / 1000;
}

function clamp(val: number, min: number, max: number, isInt?: boolean): number {
    const clamped = Math.max(min, Math.min(max, val));
    return roundVal(clamped, isInt);
}

function isBetterResult(candidate: BenchmarkResult, currentBest: BenchmarkResult, maxAllowedCritical: number): boolean {
    if (candidate.failed > maxAllowedCritical) return false;

    if (MODE === 'lenient') {
        if (candidate.failed < currentBest.failed) return true;
        if (candidate.passed > currentBest.passed) return true;
        if (candidate.passed === currentBest.passed && candidate.slipped < currentBest.slipped) return true;
        return false;
    }

    // Strict mode: penalize each Critical fail by 10 Correct cases and each Slipped by 2
    const candidateScore = candidate.passed - (candidate.failed * 10) - (candidate.slipped * 2);
    const currentScore = currentBest.passed - (currentBest.failed * 10) - (currentBest.slipped * 2);
    return candidateScore > currentScore;
}

function saveBestConfig(config: DetectionConfig, result: BenchmarkResult) {
    const payload = {
        updatedAt: new Date().toISOString(),
        metrics: {
            accuracy: Number(result.accuracy.toFixed(4)),
            passed: result.passed,
            undefinedCount: result.undefinedCount,
            slipped: result.slipped,
            critical: result.failed,
            total: result.total
        },
        config
    };
    fs.writeFileSync(SAVE_PATH, JSON.stringify(payload, null, 4), 'utf-8');
}

function loadInitialConfig(): DetectionConfig {
    if (fs.existsSync(SAVE_PATH)) {
        try {
            const raw = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf-8'));
            if (raw && raw.config) {
                console.log(`Loaded previous best configuration from ${SAVE_PATH}`);
                return { ...BASE_CONFIG, ...raw.config };
            }
        } catch {
            console.log(`Could not parse ${SAVE_PATH}, starting from DEFAULT_DETECTION_CONFIG.`);
        }
    }
    return { ...BASE_CONFIG };
}

async function runOptimizer() {
    console.log(`Starting optimizer in ${MODE.toUpperCase()} mode with max allowed critical fails: ${MAX_ALLOWED_CRITICAL}`);
    console.log('Pre-computing test cases and caching tinyld outputs...');
    const precomputeStart = Date.now();
    buildPrecomputedTestCases(true);
    console.log(`Pre-computation finished in ${((Date.now() - precomputeStart) / 1000).toFixed(2)}s.\n`);

    let bestConfig = loadInitialConfig();
    let bestResult = await runBenchmark(bestConfig, { silent: true, usePrecomputed: true, mode: MODE });

    console.log(`=== BASELINE ===`);
    console.log(
        `Accuracy: ${bestResult.accuracy.toFixed(2)}% | Correct: ${bestResult.passed} | Undefined: ${bestResult.undefinedCount} | Slipped: ${bestResult.slipped} | Critical: ${bestResult.failed} | Run time: ${bestResult.durationSeconds.toFixed(2)}s\n`
    );
    saveBestConfig(bestConfig, bestResult);

    let totalEvaluations = 1;

    // Coordinate Ascent Function
    async function runCoordinateAscent(): Promise<boolean> {
        let improvedInCycle = false;

        for (let stepIdx = 0; stepIdx < 3; stepIdx++) {
            let improvedInPass = true;
            while (improvedInPass) {
                improvedInPass = false;

                for (const spec of TUNABLE_PARAMETERS) {
                    const step = spec.steps[Math.min(stepIdx, spec.steps.length - 1)];
                    const currentVal = bestConfig[spec.key];

                    for (const direction of [1, -1]) {
                        const candidateVal = clamp(currentVal + direction * step, spec.min, spec.max, spec.isInt);
                        if (candidateVal === bestConfig[spec.key]) continue;

                        const candidateConfig: DetectionConfig = {
                            ...bestConfig,
                            [spec.key]: candidateVal
                        };

                        if (!isValidConfig(candidateConfig)) continue;
                        const result = await runBenchmark(candidateConfig, { silent: true, usePrecomputed: true, mode: MODE });
                        totalEvaluations++;

                        if (isBetterResult(result, bestResult, MAX_ALLOWED_CRITICAL)) {
                            const oldVal = bestConfig[spec.key];
                            bestConfig = candidateConfig;
                            bestResult = result;
                            improvedInPass = true;
                            improvedInCycle = true;

                            saveBestConfig(bestConfig, bestResult);
                            console.log(
                                `[NEW BEST #${totalEvaluations}] Acc: ${bestResult.accuracy.toFixed(2)}% (Pass: ${bestResult.passed}, Undef: ${bestResult.undefinedCount}, Slip: ${bestResult.slipped}, Crit: ${bestResult.failed}) | ${spec.key}: ${oldVal} -> ${candidateVal}`
                            );
                        }
                    }
                }
            }
        }

        return improvedInCycle;
    }

    console.log('Starting Phase 1: Coordinate Ascent across all parameters...');
    await runCoordinateAscent();

    console.log('\nSingle-parameter optimum reached. Entering Phase 2: Multi-parameter random perturbation...');
    let perturbationRound = 0;

    while (true) {
        perturbationRound++;
        const candidateConfig: DetectionConfig = { ...bestConfig };

        // Randomly perturb 2 or 3 parameters simultaneously to escape local optima
        const numToPerturb = Math.random() < 0.7 ? 2 : 3;
        const changesDesc: string[] = [];

        for (let i = 0; i < numToPerturb; i++) {
            const spec = TUNABLE_PARAMETERS[Math.floor(Math.random() * TUNABLE_PARAMETERS.length)];
            const step = spec.steps[Math.floor(Math.random() * spec.steps.length)];
            const multiplier = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? 1 : -1);
            const newVal = clamp(candidateConfig[spec.key] + step * multiplier, spec.min, spec.max, spec.isInt);

            if (newVal !== candidateConfig[spec.key]) {
                changesDesc.push(`${spec.key}: ${candidateConfig[spec.key]}->${newVal}`);
                candidateConfig[spec.key] = newVal;
            }
        }

        if (changesDesc.length === 0) continue;

        if (!isValidConfig(candidateConfig)) continue;
        const result = await runBenchmark(candidateConfig, { silent: true, usePrecomputed: true, mode: MODE });
        totalEvaluations++;

        if (isBetterResult(result, bestResult, MAX_ALLOWED_CRITICAL)) {
            bestConfig = candidateConfig;
            bestResult = result;
            saveBestConfig(bestConfig, bestResult);

            console.log(
                `\n[PERTURBATION HIT #${totalEvaluations}] Acc: ${bestResult.accuracy.toFixed(2)}% (Pass: ${bestResult.passed}, Undef: ${bestResult.undefinedCount}, Slip: ${bestResult.slipped}, Crit: ${bestResult.failed}) | ${changesDesc.join(', ')}`
            );
            console.log('Running Coordinate Ascent from new peak...');
            await runCoordinateAscent();
        } else if (perturbationRound % 100 === 0) {
            console.log(
                `[Status - Eval #${totalEvaluations}] Current Best: ${bestResult.accuracy.toFixed(2)}% (Pass: ${bestResult.passed}, Slip: ${bestResult.slipped}, Crit: ${bestResult.failed})`
            );
        }
    }
}

runOptimizer();