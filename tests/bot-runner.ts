/**
 * Bot Runner - CLI tool to run bot games for testing
 * 
 * Usage: npm run test:bot
 */

import { Game } from "../src/core/Game";
import { createInitialState } from "../src/core/GameState";
import { BotGameRunner, type BotDifficulty } from "../src/ai/BotPlayer";
import { Logger } from "../src/core/Logger";

// Configure logger for CLI
Logger.configure({
    enabled: true,
    minLevel: "info",
    consoleOutput: true,
});

// Only show AI and turn logs
Logger.disableAll();
Logger.setNamespaceEnabled("ai", true);
Logger.setNamespaceEnabled("turn", true);
Logger.setNamespaceEnabled("combat", true);

async function runBotGame(options: {
    playerCount: number;
    difficulty: BotDifficulty;
    turnLimit: number;
    verbose: boolean;
}) {
    console.log("\n" + "=".repeat(60));
    console.log("🤖 RUINS NEXUS - BOT GAME SIMULATION");
    console.log("=".repeat(60));
    console.log(`Players: ${options.playerCount}`);
    console.log(`Difficulty: ${options.difficulty}`);
    console.log(`Turn Limit: ${options.turnLimit}`);
    console.log("=".repeat(60) + "\n");

    // Create game
    const state = createInitialState(options.playerCount);
    const game = new Game(state);

    // Suppress toast notifications
    game.onToast = null;

    // Create and run bot game
    const runner = new BotGameRunner(game, options.difficulty, options.turnLimit);
    const result = runner.runGame();

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📊 GAME RESULTS");
    console.log("=".repeat(60));
    console.log(`Reason: ${result.reason}`);
    console.log(`Turns: ${result.turns}`);
    console.log(`Winner: ${result.winner || "None"}`);
    
    const stats = runner.getStats();
    console.log(`\nFinal Round: ${stats.round}`);
    console.log("\nPlayer Stats:");
    console.log("-".repeat(50));
    
    for (const p of stats.players) {
        console.log(`  ${p.id}:`);
        console.log(`    HP: ${p.hp}`);
        console.log(`    Prestige: ${p.prestige}`);
        console.log(`    Components: ${p.components}`);
        console.log(`    Tiles Explored: ${p.tilesExplored}`);
        console.log(`    Monsters Defeated (T2+): ${p.monstersDefeated}`);
    }

    console.log("=".repeat(60) + "\n");

    return result;
}

async function runMultipleGames(count: number) {
    console.log(`\n🎮 Running ${count} bot games...\n`);

    const results = {
        completed: 0,
        timedOut: 0,
        winners: new Map<string, number>(),
        avgTurns: 0,
        totalTurns: 0,
    };

    // Reduce log spam for batch runs
    Logger.configure({ minLevel: "warn" });

    for (let i = 0; i < count; i++) {
        const state = createInitialState(2);
        const game = new Game(state);
        game.onToast = null;

        const runner = new BotGameRunner(game, "normal", 200);
        const result = runner.runGame();

        if (result.reason === "Game completed") {
            results.completed++;
            if (result.winner) {
                results.winners.set(result.winner, (results.winners.get(result.winner) || 0) + 1);
            }
        } else {
            results.timedOut++;
        }

        results.totalTurns += result.turns;
        
        // Progress indicator
        if ((i + 1) % 10 === 0) {
            console.log(`  Completed ${i + 1}/${count} games...`);
        }
    }

    results.avgTurns = results.totalTurns / count;

    console.log("\n" + "=".repeat(60));
    console.log("📊 BATCH RESULTS");
    console.log("=".repeat(60));
    console.log(`Games Run: ${count}`);
    console.log(`Completed: ${results.completed} (${(results.completed / count * 100).toFixed(1)}%)`);
    console.log(`Timed Out: ${results.timedOut} (${(results.timedOut / count * 100).toFixed(1)}%)`);
    console.log(`Average Turns: ${results.avgTurns.toFixed(1)}`);
    console.log("\nWin Distribution:");
    for (const [player, wins] of results.winners) {
        console.log(`  ${player}: ${wins} wins (${(wins / results.completed * 100).toFixed(1)}%)`);
    }
    console.log("=".repeat(60) + "\n");

    return results;
}

// Main
const args = process.argv.slice(2);
const command = args[0] || "single";

if (command === "batch") {
    const count = parseInt(args[1] || "10");
    runMultipleGames(count);
} else {
    runBotGame({
        playerCount: 2,
        difficulty: "normal",
        turnLimit: 200,
        verbose: true,
    });
}
