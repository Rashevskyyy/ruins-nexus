/**
 * AI Bot Player for Ruins Nexus
 * 
 * Can play the game automatically for testing and simulation purposes.
 * Uses simple heuristics to make decisions.
 */

import type { Game } from "../core/Game";
import type { GameState } from "../core/GameState";
import type { Player } from "../entities/Player";
import type { HexCoord } from "../board/Hex";
import { neighbors, hexDistance } from "../board/Hex";
import { Phase } from "../core/Phase";
import { Logger } from "../core/Logger";
import type { Tile } from "../board/Tile";
import { TileType } from "../board/TileTypes";
import { canMoveBetween } from "../board/BlockedEdges";

export type BotDifficulty = "random" | "easy" | "normal" | "aggressive";

export type BotAction = 
    | { type: "move"; target: HexCoord }
    | { type: "explore" }
    | { type: "place_tile"; target: HexCoord }
    | { type: "gather" }
    | { type: "heal" }
    | { type: "build_base" }
    | { type: "build_modules"; modules: string[] }
    | { type: "craft"; recipeId: string }
    | { type: "hire_unit"; unitType: string }
    | { type: "end_turn" }
    | { type: "choose_reward"; choice: "standard" | "recover" | "push" }
    | { type: "recall" }
    | { type: "final_trial"; prestigeSpend: number };

export interface BotDecision {
    action: BotAction;
    reason: string;
    score: number;
}

export class BotPlayer {
    private difficulty: BotDifficulty;
    private playerId: string;
    private actionCount = 0;
    private maxActionsPerTurn = 50; // Safety limit

    constructor(playerId: string, difficulty: BotDifficulty = "normal") {
        this.playerId = playerId;
        this.difficulty = difficulty;
    }

    /**
     * Decide what action to take
     */
    decideAction(game: Game): BotDecision {
        const state = game.state;
        const player = state.players.find(p => p.id === this.playerId);
        
        if (!player) {
            return { action: { type: "end_turn" }, reason: "Player not found", score: 0 };
        }

        // Safety check
        this.actionCount++;
        if (this.actionCount > this.maxActionsPerTurn) {
            Logger.ai.warn(`Bot ${this.playerId} hit max actions limit, forcing end turn`);
            return { action: { type: "end_turn" }, reason: "Max actions reached", score: 0 };
        }

        // Handle TILE_PLACEMENT mode - need to place a tile!
        if (state.uiMode === "TILE_PLACEMENT") {
            return this.decideTilePlacement(game, player, state);
        }

        // Check for pending reward choice
        if (state.pendingRewardChoice && state.pendingRewardChoice.playerId === this.playerId) {
            return this.decideRewardChoice(player, state.pendingRewardChoice);
        }

        // Final Trial phase
        if (state.finalTrialStarted && player.finalTrialScore === null) {
            return this.decideFinalTrial(player, state);
        }

        // Check if we're in the right phase
        if (state.phase !== Phase.AwaitInput) {
            return { action: { type: "end_turn" }, reason: "Not our turn", score: 0 };
        }

        // If no action points, end turn
        if (state.actionPoints <= 0) {
            return { action: { type: "end_turn" }, reason: "No action points", score: 0 };
        }

        // Generate all possible actions
        const candidates: BotDecision[] = [];

        // Explore
        if (!state.isFinalPreparation && state.uiMode !== "TILE_PLACEMENT") {
            candidates.push(this.evaluateExplore(game, player, state));
        }

        // Gather
        candidates.push(this.evaluateGather(game, player, state));

        // Heal
        candidates.push(this.evaluateHeal(player));

        // Build base
        candidates.push(this.evaluateBuildBase(game, player));

        // Build modules
        candidates.push(this.evaluateBuildModules(game, player));

        // Craft
        candidates.push(this.evaluateCraft(game, player));

        // Movement to interesting tiles
        candidates.push(...this.evaluateMovements(game, player, state));

        // Recall during orbital phase
        if (state.isFinalPreparation && game.canRecallToBase()) {
            candidates.push({
                action: { type: "recall" },
                reason: "Recall to base during orbital phase",
                score: 50,
            });
        }

        // If we've tried many actions this turn without progress, prefer ending turn
        const endTurnBonus = this.actionCount > 10 ? 50 : 0;

        // End turn (always an option)
        candidates.push({
            action: { type: "end_turn" },
            reason: "No better options",
            score: (this.difficulty === "random" ? Math.random() * 10 : 1) + endTurnBonus,
        });

        // Sort by score
        candidates.sort((a, b) => b.score - a.score);

        // Pick action based on difficulty
        const decision = this.pickAction(candidates);
        
        Logger.ai.debug(`Bot ${this.playerId} decided: ${decision.action.type}`, {
            reason: decision.reason,
            score: decision.score,
            candidates: candidates.slice(0, 5).map(c => ({ type: c.action.type, score: c.score })),
        });

        return decision;
    }

    /**
     * Reset action counter (call at start of turn)
     */
    resetTurn(): void {
        this.actionCount = 0;
    }

    private pickAction(candidates: BotDecision[]): BotDecision {
        if (candidates.length === 0) {
            return { action: { type: "end_turn" }, reason: "No options", score: 0 };
        }

        switch (this.difficulty) {
            case "random":
                return candidates[Math.floor(Math.random() * candidates.length)];
            
            case "easy":
                // Pick from top 3
                const top3 = candidates.slice(0, 3);
                return top3[Math.floor(Math.random() * top3.length)];
            
            case "aggressive":
            case "normal":
            default:
                // Pick best
                return candidates[0];
        }
    }

    private evaluateExplore(game: Game, player: Player, state: GameState): BotDecision {
        if (state.isFinalPreparation) {
            return { action: { type: "explore" }, reason: "Final preparation", score: 0 };
        }

        // Find unexplored neighbors
        const pos = player.position;
        const unexplored = neighbors(pos).filter(n => !state.board.getTile(n));
        
        if (unexplored.length === 0) {
            return { action: { type: "explore" }, reason: "No unexplored neighbors", score: 0 };
        }

        // Check if we're stuck (no valid movements)
        const currentTile = state.board.getTile(pos);
        let canMoveAnywhere = false;
        if (currentTile) {
            for (const neighbor of neighbors(pos)) {
                const neighborTile = state.board.getTile(neighbor);
                if (neighborTile && canMoveBetween(currentTile, neighbor, neighborTile)) {
                    canMoveAnywhere = true;
                    break;
                }
            }
        }

        // BOOST explore priority significantly if stuck
        let score = unexplored.length * 10 + (this.difficulty === "aggressive" ? 20 : 10);
        
        if (!canMoveAnywhere) {
            score += 50; // High priority when stuck - explore to open new paths!
            Logger.ai.debug(`Bot ${this.playerId} is stuck, boosting explore priority`);
        }

        return {
            action: { type: "explore" },
            reason: canMoveAnywhere ? `${unexplored.length} unexplored neighbors` : `STUCK! Explore to open paths`,
            score,
        };
    }

    private evaluateGather(game: Game, player: Player, state: GameState): BotDecision {
        const tile = state.board.getTile(player.position);
        if (!tile) {
            return { action: { type: "gather" }, reason: "No tile", score: 0 };
        }

        // Can't gather if encounter active
        if (tile.encounterActive) {
            return { action: { type: "gather" }, reason: "Encounter active", score: 0 };
        }

        // Check if can gather (tile type + resources)
        if (tile.type !== TileType.Resource && tile.type !== TileType.StartingSector) {
            return { action: { type: "gather" }, reason: "Not resource tile", score: 0 };
        }

        if (!tile.resources || Object.keys(tile.resources).length === 0) {
            return { action: { type: "gather" }, reason: "No resources", score: 0 };
        }

        // Check cooldown
        const cooldown = tile.cooldownUntilRoundByPlayer?.[player.id] ?? 0;
        if (cooldown > state.round) {
            return { action: { type: "gather" }, reason: "On cooldown", score: 0 };
        }

        // Score based on resources
        const totalResources = (tile.resources.biomass ?? 0) + 
                              (tile.resources.materials ?? 0) + 
                              (tile.resources.alloys ?? 0);
        
        const score = totalResources * 15 + 10;

        return {
            action: { type: "gather" },
            reason: `Gather ${totalResources} resources`,
            score,
        };
    }

    private evaluateHeal(player: Player): BotDecision {
        const missingHp = player.maxHp - player.hp;
        
        if (missingHp === 0) {
            return { action: { type: "heal" }, reason: "Full HP", score: 0 };
        }

        // Higher score if low HP
        const hpPercent = player.hp / player.maxHp;
        let score = missingHp * 10;
        
        if (hpPercent < 0.4) {
            score += 30; // Critical HP
        } else if (hpPercent < 0.6) {
            score += 15;
        }

        return {
            action: { type: "heal" },
            reason: `Heal ${Math.min(2, missingHp)} HP (${player.hp}/${player.maxHp})`,
            score,
        };
    }

    private evaluateBuildBase(game: Game, player: Player): BotDecision {
        if (!game.canBuildBase()) {
            return { action: { type: "build_base" }, reason: "Cannot build", score: 0 };
        }

        // High priority if we don't have a base
        const score = player.basePosition ? 0 : 60;

        return {
            action: { type: "build_base" },
            reason: "Build base for modules",
            score,
        };
    }

    private evaluateBuildModules(game: Game, player: Player): BotDecision {
        const available = game.getAvailableModules();
        
        if (available.length === 0) {
            return { action: { type: "build_modules", modules: [] }, reason: "No modules available", score: 0 };
        }

        // Pick modules based on current needs
        const selectedModules: string[] = [];
        let score = 0;

        for (const moduleType of available) {
            // Prioritize combat modules if low equipment
            if (moduleType === "AssaultBay" && player.inventory.weapons.filter(w => w).length < 2) {
                selectedModules.push(moduleType);
                score += 25;
            }
            // Prioritize defense if low HP
            else if (moduleType === "ShieldArray" && player.hp < player.maxHp * 0.6) {
                selectedModules.push(moduleType);
                score += 20;
            }
            // Generic modules
            else if (selectedModules.length < 2) {
                selectedModules.push(moduleType);
                score += 15;
            }
        }

        if (selectedModules.length === 0) {
            return { action: { type: "build_modules", modules: [] }, reason: "No good modules", score: 0 };
        }

        return {
            action: { type: "build_modules", modules: selectedModules },
            reason: `Build ${selectedModules.length} modules`,
            score,
        };
    }

    private evaluateCraft(game: Game, player: Player): BotDecision {
        if (!game.canCraft()) {
            return { action: { type: "craft", recipeId: "" }, reason: "Cannot craft", score: 0 };
        }

        const recipes = game.getAvailableCraftRecipes();
        if (recipes.length === 0) {
            return { action: { type: "craft", recipeId: "" }, reason: "No recipes available", score: 0 };
        }

        // Pick best recipe based on current inventory
        let bestRecipe = recipes[0];
        let bestScore = 10;

        for (const recipe of recipes) {
            let score = 10;

            // Weapons if we don't have any
            if (recipe.category === "weapon" && player.inventory.weapons.filter(w => w).length === 0) {
                score += 30;
            }
            // Armor/utility if we don't have amulet
            if (recipe.category === "amulet" && !player.inventory.amulet) {
                score += 20;
            }

            if (score > bestScore) {
                bestScore = score;
                bestRecipe = recipe;
            }
        }

        return {
            action: { type: "craft", recipeId: bestRecipe.id },
            reason: `Craft ${bestRecipe.name}`,
            score: bestScore,
        };
    }

    private evaluateMovements(game: Game, player: Player, state: GameState): BotDecision[] {
        const decisions: BotDecision[] = [];
        const pos = player.position;
        const currentTile = state.board.getTile(pos);
        const adjacentTiles = neighbors(pos);

        if (!currentTile) return decisions;

        for (const target of adjacentTiles) {
            const tile = state.board.getTile(target);
            if (!tile) continue;

            // CHECK IF MOVEMENT IS ACTUALLY POSSIBLE (blocked edges / mountains)
            if (!canMoveBetween(currentTile, target, tile)) {
                continue; // Skip blocked paths - don't even consider them
            }

            let score = 5;
            let reason = "Move to tile";

            // Move towards resources
            if (tile.type === TileType.Resource && tile.resources) {
                const cooldown = tile.cooldownUntilRoundByPlayer?.[player.id] ?? 0;
                if (cooldown <= state.round) {
                    score += 20;
                    reason = "Move to resource tile";
                }
            }

            // Move towards monsters (aggressive)
            if (tile.encounterActive && this.difficulty === "aggressive") {
                score += 15;
                reason = "Move to fight monster";
            }

            // Avoid toxic tiles unless aggressive
            if (tile.riskyEffect === "toxic" && this.difficulty !== "aggressive") {
                score -= 10;
            }

            // Move towards unexplored areas
            const unexploredNearTarget = neighbors(target).filter(n => !state.board.getTile(n)).length;
            if (unexploredNearTarget > 0 && !state.isFinalPreparation) {
                score += unexploredNearTarget * 3;
                reason = "Move towards unexplored";
            }

            // Move towards base if need to craft/build
            if (player.basePosition && player.components >= 3) {
                const distToBase = hexDistance(target, player.basePosition);
                const currentDistToBase = hexDistance(pos, player.basePosition);
                if (distToBase < currentDistToBase) {
                    score += 10;
                    reason = "Move towards base";
                }
            }

            decisions.push({
                action: { type: "move", target },
                reason,
                score,
            });
        }

        return decisions;
    }

    private decideRewardChoice(player: Player, pending: NonNullable<GameState["pendingRewardChoice"]>): BotDecision {
        const hpPercent = player.hp / player.maxHp;

        // Recover if low HP
        if (hpPercent < 0.5) {
            return {
                action: { type: "choose_reward", choice: "recover" },
                reason: "Low HP, need healing",
                score: 100,
            };
        }

        // Push if low prestige and not at limit
        if (player.prestige < 10 && this.difficulty === "aggressive") {
            return {
                action: { type: "choose_reward", choice: "push" },
                reason: "Push for more prestige",
                score: 100,
            };
        }

        // Standard otherwise
        return {
            action: { type: "choose_reward", choice: "standard" },
            reason: "Standard reward",
            score: 100,
        };
    }

    private decideFinalTrial(player: Player, state: GameState): BotDecision {
        // Spend some prestige if we have a lot
        const prestigeSpend = player.prestige > 5 ? Math.floor(player.prestige / 2) : 0;

        return {
            action: { type: "final_trial", prestigeSpend },
            reason: `Final trial with ${prestigeSpend} prestige spent`,
            score: 100,
        };
    }

    /**
     * Handle TILE_PLACEMENT mode - select position and place tile
     */
    private decideTilePlacement(game: Game, player: Player, state: GameState): BotDecision {
        // Find valid placement positions (empty hexes adjacent to discovered tiles)
        const validPositions: HexCoord[] = [];
        
        for (const tile of state.board.getAllTiles()) {
            if (!tile.discovered) continue;
            
            // Check all neighbors of discovered tiles
            for (const neighbor of neighbors(tile.coord)) {
                const existingTile = state.board.getTile(neighbor);
                if (!existingTile) {
                    // Check if already in list
                    if (!validPositions.some(p => p.q === neighbor.q && p.r === neighbor.r)) {
                        validPositions.push(neighbor);
                    }
                }
            }
        }

        if (validPositions.length === 0) {
            // No valid positions - cancel explore
            Logger.ai.warn(`Bot ${this.playerId} - no valid tile placement positions`);
            return {
                action: { type: "explore" }, // Toggle off explore mode
                reason: "No valid placement positions",
                score: 100,
            };
        }

        // Pick position closest to player
        let bestPos = validPositions[0];
        let bestDist = hexDistance(player.position, bestPos);
        
        for (const pos of validPositions) {
            const dist = hexDistance(player.position, pos);
            if (dist < bestDist) {
                bestDist = dist;
                bestPos = pos;
            }
        }

        return {
            action: { type: "place_tile", target: bestPos },
            reason: `Place tile at ${bestPos.q},${bestPos.r}`,
            score: 100,
        };
    }

    /**
     * Execute the decided action
     */
    executeAction(game: Game, decision: BotDecision): boolean {
        const action = decision.action;
        
        Logger.ai.info(`Bot ${this.playerId} executing: ${action.type}`, { reason: decision.reason });

        try {
            switch (action.type) {
                case "move": {
                    const prevPos = { ...game.currentPlayer.position };
                    game.handleHexClick(action.target);
                    // Check if position actually changed
                    const newPos = game.currentPlayer.position;
                    if (prevPos.q === newPos.q && prevPos.r === newPos.r) {
                        Logger.ai.debug(`Bot ${this.playerId} move failed - position unchanged`);
                        return false;
                    }
                    return true;
                }

                case "explore":
                    return game.doExplore();

                case "place_tile": {
                    // Select position and place tile
                    game.selectPlacementPosition(action.target);
                    const placed = game.placeTileAtSelected();
                    if (!placed) {
                        Logger.ai.debug(`Bot ${this.playerId} failed to place tile at ${action.target.q},${action.target.r}`);
                    }
                    return placed;
                }

                case "gather":
                    return game.doGather();

                case "heal":
                    return game.doHeal();

                case "build_base":
                    return game.doBuildBase();

                case "build_modules":
                    if (action.modules.length > 0) {
                        return game.doBuildModules(action.modules as any);
                    }
                    return false;

                case "craft":
                    if (action.recipeId) {
                        return game.doCraft(action.recipeId);
                    }
                    return false;

                case "choose_reward":
                    game.chooseReward(action.choice);
                    return true;

                case "recall":
                    return game.doRecallToBase();

                case "final_trial":
                    return game.doFinalTrial(action.prestigeSpend);

                case "end_turn":
                    game.endTurn();
                    return true;

                default:
                    Logger.ai.warn(`Unknown action type: ${(action as any).type}`);
                    return false;
            }
        } catch (error) {
            Logger.ai.error(`Error executing action: ${action.type}`, error);
            return false;
        }
    }
}

/**
 * Bot Game Runner - runs a full game with bots
 */
export class BotGameRunner {
    private game: Game;
    private bots: Map<string, BotPlayer> = new Map();
    private turnLimit: number;
    private currentTurn = 0;

    constructor(game: Game, difficulty: BotDifficulty = "normal", turnLimit = 200) {
        this.game = game;
        this.turnLimit = turnLimit;

        // Create bot for each player
        for (const player of game.state.players) {
            this.bots.set(player.id, new BotPlayer(player.id, difficulty));
        }
    }

    /**
     * Run full game until completion or turn limit
     */
    runGame(): { winner: string | null; turns: number; reason: string } {
        Logger.ai.info("Starting bot game simulation", {
            players: this.game.state.players.map(p => p.id),
            turnLimit: this.turnLimit,
        });

        while (!this.game.state.gameOver && this.currentTurn < this.turnLimit) {
            this.runTurn();
            this.currentTurn++;
        }

        const result = {
            winner: this.game.state.winnerId,
            turns: this.currentTurn,
            reason: this.game.state.gameOver ? "Game completed" : "Turn limit reached",
        };

        Logger.ai.info("Bot game finished", result);
        return result;
    }

    /**
     * Run a single turn
     */
    runTurn(): void {
        const currentPlayer = this.game.currentPlayer;
        const playerIndex = this.game.state.players.indexOf(currentPlayer);
        const bot = this.bots.get(currentPlayer.id);

        if (!bot) {
            Logger.ai.error(`No bot for player ${currentPlayer.id}`);
            this.game.endTurn();
            return;
        }

        bot.resetTurn();

        // Execute actions until turn ends
        let actionCount = 0;
        let failedActions = 0;
        const maxActions = 20;
        const maxFailedActions = 5;

        while (
            this.game.state.currentPlayerIndex === playerIndex &&
            !this.game.state.gameOver &&
            actionCount < maxActions &&
            failedActions < maxFailedActions
        ) {
            const decision = bot.decideAction(this.game);
            const success = bot.executeAction(this.game, decision);

            if (decision.action.type === "end_turn") {
                break;
            }
            
            if (!success) {
                failedActions++;
                // If too many failed actions, force end turn
                if (failedActions >= maxFailedActions) {
                    Logger.ai.warn(`Bot ${currentPlayer.id} - too many failed actions, forcing end turn`);
                    this.game.endTurn();
                    break;
                }
                continue;
            }

            actionCount++;
            failedActions = 0; // Reset on success
        }
    }

    /**
     * Get game statistics
     */
    getStats() {
        return {
            turns: this.currentTurn,
            round: this.game.state.round,
            gameOver: this.game.state.gameOver,
            winner: this.game.state.winnerId,
            players: this.game.state.players.map(p => ({
                id: p.id,
                hp: p.hp,
                prestige: p.prestige,
                components: p.components,
                tilesExplored: p.tilesExplored,
                monstersDefeated: p.monstersDefeatedTier2Plus,
            })),
        };
    }
}
