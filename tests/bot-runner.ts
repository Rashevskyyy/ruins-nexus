/**
 * Bot Runner - CLI tool to run bot games for testing
 * 
 * Usage: 
 *   npm run test:bot              - Run single game with full logs
 *   npm run test:bot batch 50     - Run 50 games with statistics
 *   npm run test:bot stress       - Run stress test (100 games, various configs)
 */

import { Game } from "../src/core/Game";
import { createInitialState } from "../src/core/GameState";
import { BotGameRunner, type BotDifficulty } from "../src/ai/BotPlayer";
import { Logger } from "../src/core/Logger";
import { validateGameState, type ValidationResult } from "../src/core/StateValidator";

// Types for detailed statistics
interface GameStats {
    gameId: number;
    completed: boolean;
    winner: string | null;
    turns: number;
    rounds: number;
    tilesExplored: number;
    totalCombats: number;
    combatWins: number;
    combatLosses: number;
    finalTrialReached: boolean;
    errors: string[];
    validationErrors: string[];
    duration: number; // ms
}

interface BatchResults {
    totalGames: number;
    completed: number;
    timedOut: number;
    errored: number;
    completionRate: number;
    avgTurns: number;
    avgRounds: number;
    minTurns: number;
    maxTurns: number;
    avgDuration: number;
    winDistribution: Map<string, number>;
    finalTrialRate: number;
    avgTilesExplored: number;
    avgCombatWinRate: number;
    validationFailures: number;
    commonErrors: Map<string, number>;
}

// Configure logger for CLI
Logger.configure({
    enabled: true,
    minLevel: "info",
    consoleOutput: true,
});

function runSingleGame(options: {
    playerCount: number;
    difficulty: BotDifficulty;
    turnLimit: number;
    verbose: boolean;
    collectStats?: boolean;
}): GameStats {
    const startTime = Date.now();
    const errors: string[] = [];
    const validationErrors: string[] = [];

    // Create game
    const state = createInitialState(options.playerCount);
    const game = new Game(state);
    game.onToast = null;

    // Track combat stats
    let totalCombats = 0;
    let combatWins = 0;

    // Create and run bot game
    const runner = new BotGameRunner(game, options.difficulty, options.turnLimit);
    
    // Wrap runGame to catch errors
    let result;
    try {
        result = runner.runGame();
    } catch (e) {
        errors.push(`Game crashed: ${e}`);
        result = { winner: null, turns: 0, reason: "Error" };
    }

    // Validate final state
    const validation = validateGameState(game.state);
    if (!validation.valid) {
        validationErrors.push(...validation.errors);
    }

    const stats = runner.getStats();
    const duration = Date.now() - startTime;

    // Count tiles explored
    const tilesExplored = game.state.board.getAllTiles().filter(t => t.discovered).length;

    // Estimate combat stats from event log
    const eventLog = game.state.eventLog || [];
    for (const event of eventLog) {
        if (event.includes("defeated") || event.includes("PUSHBACK")) {
            totalCombats++;
            if (event.includes("defeated")) {
                combatWins++;
            }
        }
    }

    return {
        gameId: 0,
        completed: result.reason === "Game completed",
        winner: result.winner,
        turns: result.turns,
        rounds: stats.round,
        tilesExplored,
        totalCombats,
        combatWins,
        combatLosses: totalCombats - combatWins,
        finalTrialReached: game.state.phase === "GAME_OVER" || stats.round >= 15,
        errors,
        validationErrors,
        duration,
    };
}

async function runBotGame(options: {
    playerCount: number;
    difficulty: BotDifficulty;
    turnLimit: number;
    verbose: boolean;
}) {
    // Only show AI and turn logs for single game
    Logger.disableAll();
    Logger.setNamespaceEnabled("ai", true);
    Logger.setNamespaceEnabled("turn", true);
    Logger.setNamespaceEnabled("combat", true);

    console.log("\n" + "=".repeat(60));
    console.log("🤖 RUINS NEXUS - BOT GAME SIMULATION");
    console.log("=".repeat(60));
    console.log(`Players: ${options.playerCount}`);
    console.log(`Difficulty: ${options.difficulty}`);
    console.log(`Turn Limit: ${options.turnLimit}`);
    console.log("=".repeat(60) + "\n");

    const stats = runSingleGame(options);

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📊 GAME RESULTS");
    console.log("=".repeat(60));
    console.log(`Completed: ${stats.completed ? "✅ Yes" : "❌ No"}`);
    console.log(`Winner: ${stats.winner || "None"}`);
    console.log(`Turns: ${stats.turns}`);
    console.log(`Rounds: ${stats.rounds}`);
    console.log(`Tiles Explored: ${stats.tilesExplored}`);
    console.log(`Combats: ${stats.totalCombats} (Won: ${stats.combatWins}, Lost: ${stats.combatLosses})`);
    console.log(`Final Trial: ${stats.finalTrialReached ? "✅ Reached" : "❌ Not reached"}`);
    console.log(`Duration: ${stats.duration}ms`);
    
    if (stats.errors.length > 0) {
        console.log("\n⚠️ Errors:");
        stats.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (stats.validationErrors.length > 0) {
        console.log("\n⚠️ Validation Errors:");
        stats.validationErrors.forEach(e => console.log(`  - ${e}`));
    }

    console.log("=".repeat(60) + "\n");

    return stats;
}

async function runMultipleGames(count: number, options?: { 
    playerCount?: number; 
    difficulty?: BotDifficulty;
    silent?: boolean;
}): Promise<BatchResults> {
    const playerCount = options?.playerCount || 2;
    const difficulty = options?.difficulty || "normal";
    const silent = options?.silent || false;

    if (!silent) {
        console.log(`\n🎮 Running ${count} bot games...`);
        console.log(`   Players: ${playerCount}, Difficulty: ${difficulty}\n`);
    }

    // Reduce log spam for batch runs
    Logger.configure({ minLevel: "error" });

    const allStats: GameStats[] = [];
    const commonErrors = new Map<string, number>();

    for (let i = 0; i < count; i++) {
        const stats = runSingleGame({
            playerCount,
            difficulty,
            turnLimit: 200,
            verbose: false,
            collectStats: true,
        });
        stats.gameId = i + 1;
        allStats.push(stats);

        // Track errors
        for (const err of [...stats.errors, ...stats.validationErrors]) {
            const shortErr = err.slice(0, 50);
            commonErrors.set(shortErr, (commonErrors.get(shortErr) || 0) + 1);
        }

        // Progress indicator
        if (!silent && (i + 1) % 10 === 0) {
            const completedSoFar = allStats.filter(s => s.completed).length;
            const rate = ((completedSoFar / (i + 1)) * 100).toFixed(0);
            console.log(`  [${i + 1}/${count}] Completion rate: ${rate}%`);
        }
    }

    // Calculate aggregate statistics
    const completed = allStats.filter(s => s.completed);
    const timedOut = allStats.filter(s => !s.completed && s.errors.length === 0);
    const errored = allStats.filter(s => s.errors.length > 0);

    const winDistribution = new Map<string, number>();
    for (const s of completed) {
        if (s.winner) {
            winDistribution.set(s.winner, (winDistribution.get(s.winner) || 0) + 1);
        }
    }

    const results: BatchResults = {
        totalGames: count,
        completed: completed.length,
        timedOut: timedOut.length,
        errored: errored.length,
        completionRate: (completed.length / count) * 100,
        avgTurns: allStats.reduce((sum, s) => sum + s.turns, 0) / count,
        avgRounds: allStats.reduce((sum, s) => sum + s.rounds, 0) / count,
        minTurns: Math.min(...allStats.map(s => s.turns)),
        maxTurns: Math.max(...allStats.map(s => s.turns)),
        avgDuration: allStats.reduce((sum, s) => sum + s.duration, 0) / count,
        winDistribution,
        finalTrialRate: (allStats.filter(s => s.finalTrialReached).length / count) * 100,
        avgTilesExplored: allStats.reduce((sum, s) => sum + s.tilesExplored, 0) / count,
        avgCombatWinRate: allStats.reduce((sum, s) => 
            sum + (s.totalCombats > 0 ? s.combatWins / s.totalCombats : 0), 0) / count * 100,
        validationFailures: allStats.filter(s => s.validationErrors.length > 0).length,
        commonErrors,
    };

    if (!silent) {
        printBatchResults(results);
    }

    return results;
}

function printBatchResults(results: BatchResults) {
    console.log("\n" + "=".repeat(70));
    console.log("📊 BATCH TEST RESULTS");
    console.log("=".repeat(70));
    
    // Overview
    console.log("\n📈 OVERVIEW:");
    console.log(`  Total Games:     ${results.totalGames}`);
    console.log(`  Completed:       ${results.completed} (${results.completionRate.toFixed(1)}%)`);
    console.log(`  Timed Out:       ${results.timedOut}`);
    console.log(`  Errored:         ${results.errored}`);
    
    // Performance
    console.log("\n⏱️ PERFORMANCE:");
    console.log(`  Avg Duration:    ${results.avgDuration.toFixed(0)}ms per game`);
    console.log(`  Avg Turns:       ${results.avgTurns.toFixed(1)}`);
    console.log(`  Avg Rounds:      ${results.avgRounds.toFixed(1)}`);
    console.log(`  Turn Range:      ${results.minTurns} - ${results.maxTurns}`);
    
    // Game Progress
    console.log("\n🎯 GAME PROGRESS:");
    console.log(`  Final Trial Rate: ${results.finalTrialRate.toFixed(1)}%`);
    console.log(`  Avg Tiles:        ${results.avgTilesExplored.toFixed(1)}`);
    console.log(`  Combat Win Rate:  ${results.avgCombatWinRate.toFixed(1)}%`);
    
    // Win Distribution
    console.log("\n🏆 WIN DISTRIBUTION:");
    if (results.winDistribution.size === 0) {
        console.log("  No completed games");
    } else {
        for (const [player, wins] of results.winDistribution) {
            const pct = ((wins / results.completed) * 100).toFixed(1);
            console.log(`  ${player}: ${wins} wins (${pct}%)`);
        }
    }
    
    // Validation
    console.log("\n🔍 VALIDATION:");
    console.log(`  State Failures:  ${results.validationFailures}`);
    
    // Common Errors
    if (results.commonErrors.size > 0) {
        console.log("\n⚠️ COMMON ERRORS:");
        const sorted = [...results.commonErrors.entries()].sort((a, b) => b[1] - a[1]);
        for (const [err, count] of sorted.slice(0, 5)) {
            console.log(`  [${count}x] ${err}`);
        }
    }
    
    console.log("\n" + "=".repeat(70));
    
    // Summary verdict
    if (results.completionRate >= 95 && results.validationFailures === 0) {
        console.log("✅ HEALTHY: Game systems working correctly");
    } else if (results.completionRate >= 80) {
        console.log("⚠️ WARNING: Some issues detected, review errors above");
    } else {
        console.log("❌ CRITICAL: Major issues detected, investigation needed");
    }
    console.log("=".repeat(70) + "\n");
}

async function runStressTest() {
    console.log("\n" + "=".repeat(70));
    console.log("🔥 STRESS TEST - Multiple Configurations");
    console.log("=".repeat(70));

    const configs = [
        { playerCount: 2, difficulty: "easy" as BotDifficulty, count: 25 },
        { playerCount: 2, difficulty: "normal" as BotDifficulty, count: 25 },
        { playerCount: 2, difficulty: "aggressive" as BotDifficulty, count: 25 },
        { playerCount: 3, difficulty: "normal" as BotDifficulty, count: 15 },
        { playerCount: 4, difficulty: "normal" as BotDifficulty, count: 10 },
    ];

    const allResults: { config: string; results: BatchResults }[] = [];

    for (const config of configs) {
        const configName = `${config.playerCount}P ${config.difficulty}`;
        console.log(`\n▶️ Testing: ${configName} (${config.count} games)...`);
        
        const results = await runMultipleGames(config.count, {
            playerCount: config.playerCount,
            difficulty: config.difficulty,
            silent: true,
        });
        
        allResults.push({ config: configName, results });
        
        console.log(`   ✓ Completed: ${results.completionRate.toFixed(0)}%, Avg turns: ${results.avgTurns.toFixed(0)}`);
    }

    // Summary table
    console.log("\n" + "=".repeat(70));
    console.log("📋 STRESS TEST SUMMARY");
    console.log("=".repeat(70));
    console.log("| Config          | Games | Complete | Avg Turns | Avg Time | Errors |");
    console.log("|-----------------|-------|----------|-----------|----------|--------|");
    
    for (const { config, results } of allResults) {
        const complete = `${results.completionRate.toFixed(0)}%`.padStart(8);
        const turns = results.avgTurns.toFixed(0).padStart(9);
        const time = `${results.avgDuration.toFixed(0)}ms`.padStart(8);
        const errors = `${results.errored}`.padStart(6);
        console.log(`| ${config.padEnd(15)} | ${String(results.totalGames).padStart(5)} | ${complete} | ${turns} | ${time} | ${errors} |`);
    }
    
    console.log("=".repeat(70) + "\n");

    // Overall health
    const avgCompletion = allResults.reduce((sum, r) => sum + r.results.completionRate, 0) / allResults.length;
    const totalErrors = allResults.reduce((sum, r) => sum + r.results.errored, 0);
    
    if (avgCompletion >= 95 && totalErrors === 0) {
        console.log("✅ STRESS TEST PASSED: All configurations healthy\n");
    } else if (avgCompletion >= 80) {
        console.log("⚠️ STRESS TEST WARNING: Some issues detected\n");
    } else {
        console.log("❌ STRESS TEST FAILED: Major issues in one or more configurations\n");
    }
}

// Main CLI handler
const args = process.argv.slice(2);
const command = args[0] || "single";

if (command === "batch") {
    const count = parseInt(args[1] || "20");
    runMultipleGames(count);
} else if (command === "stress") {
    runStressTest();
} else if (command === "help") {
    console.log(`
🤖 Bot Runner - Test automation for Ruins Nexus

Commands:
  npm run test:bot              Run single game with full logs
  npm run test:bot batch 50     Run 50 games with statistics
  npm run test:bot stress       Run stress test (100 games, multiple configs)
  npm run test:bot help         Show this help

Examples:
  npm run test:bot batch 100    Run 100 games and get detailed stats
  npm run test:bot stress       Test 2P/3P/4P games with different difficulties
`);
} else {
    runBotGame({
        playerCount: 2,
        difficulty: "normal",
        turnLimit: 200,
        verbose: true,
    });
}
