/**
 * State Validator - Validates GameState consistency
 * 
 * Use this to catch bugs early by checking game state invariants.
 * Run after actions or periodically during bot games.
 */

import type { GameState } from "./GameState";
import type { Player } from "../entities/Player";
import { Logger } from "./Logger";
import { TileType } from "../board/TileTypes";
import { Phase } from "./Phase";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate entire game state
 */
export function validateGameState(state: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate players
    for (const player of state.players) {
        const playerErrors = validatePlayer(player, state);
        errors.push(...playerErrors.errors);
        warnings.push(...playerErrors.warnings);
    }

    // Validate board
    const boardErrors = validateBoard(state);
    errors.push(...boardErrors.errors);
    warnings.push(...boardErrors.warnings);

    // Validate game phase
    const phaseErrors = validatePhase(state);
    errors.push(...phaseErrors.errors);
    warnings.push(...phaseErrors.warnings);

    // Validate tile deck
    const deckErrors = validateTileDeck(state);
    errors.push(...deckErrors.errors);
    warnings.push(...deckErrors.warnings);

    // Log validation results
    if (errors.length > 0) {
        Logger.state.error(`State validation failed: ${errors.length} errors`, { errors });
    }
    if (warnings.length > 0) {
        Logger.state.warn(`State validation warnings: ${warnings.length}`, { warnings });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate player state
 */
function validatePlayer(player: Player, state: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const pid = player.id;

    // HP bounds
    if (player.hp < 0) {
        errors.push(`${pid}: HP is negative (${player.hp})`);
    }
    if (player.hp > player.maxHp) {
        errors.push(`${pid}: HP exceeds maxHp (${player.hp}/${player.maxHp})`);
    }

    // Resource bounds (shouldn't be negative)
    if (player.biomass < 0) errors.push(`${pid}: Negative biomass (${player.biomass})`);
    if (player.materials < 0) errors.push(`${pid}: Negative materials (${player.materials})`);
    if (player.alloys < 0) errors.push(`${pid}: Negative alloys (${player.alloys})`);
    if (player.components < 0) errors.push(`${pid}: Negative components (${player.components})`);
    if (player.prestige < 0) errors.push(`${pid}: Negative prestige (${player.prestige})`);

    // Position validation
    const tile = state.board.getTile(player.position);
    if (!tile) {
        errors.push(`${pid}: Position ${player.position.q},${player.position.r} has no tile`);
    }

    // Base position validation
    if (player.basePosition) {
        const baseTile = state.board.getTile(player.basePosition);
        if (!baseTile) {
            errors.push(`${pid}: Base position ${player.basePosition.q},${player.basePosition.r} has no tile`);
        }
    }

    // Inventory validation
    if (player.inventory) {
        // Weapon slots
        if (player.inventory.weapons && player.inventory.weapons.length > 2) {
            warnings.push(`${pid}: More than 2 weapon slots`);
        }
        
        // Unit slots
        const activeUnits = player.units.filter(u => u !== null).length;
        if (activeUnits > 2) {
            errors.push(`${pid}: More than 2 active units`);
        }
    }

    // Action points (during active turn)
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer && currentPlayer.id === pid) {
        if (state.actionPoints < 0) {
            errors.push(`${pid}: Negative action points (${state.actionPoints})`);
        }
        if (state.actionPoints > 10) {
            warnings.push(`${pid}: Unusually high action points (${state.actionPoints})`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate board state
 */
function validateBoard(state: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const tiles = state.board.getAllTiles();

    // Should have at least hub tile
    if (tiles.length === 0) {
        errors.push("Board has no tiles");
        return { valid: false, errors, warnings };
    }

    // Check for hub
    const hub = tiles.find(t => t.type === TileType.LandingHub);
    if (!hub) {
        warnings.push("No Hub tile found on board");
    }

    // Check tile consistency
    for (const tile of tiles) {
        // Discovered tiles should have type set
        if (tile.discovered && !tile.type) {
            errors.push(`Tile at ${tile.coord.q},${tile.coord.r}: discovered but no type`);
        }

        // Resource tiles should have resources defined
        if (tile.type === TileType.Resource && !tile.resources) {
            warnings.push(`Tile at ${tile.coord.q},${tile.coord.r}: Resource type but no resources`);
        }

        // Monster tier validation
        if (tile.encounterActive && tile.monsterTier !== undefined) {
            if (tile.monsterTier < 1 || tile.monsterTier > 4) {
                errors.push(`Tile at ${tile.coord.q},${tile.coord.r}: Invalid monster tier ${tile.monsterTier}`);
            }
        }

        // Blocked edges validation
        if (tile.blockedEdges) {
            for (const edge of tile.blockedEdges) {
                if (edge < 0 || edge > 5) {
                    errors.push(`Tile at ${tile.coord.q},${tile.coord.r}: Invalid blocked edge ${edge}`);
                }
            }
        }
    }

    // Check player positions are on valid tiles
    for (const player of state.players) {
        if (!player.position) {
            errors.push(`Player ${player.id} has no position`);
            continue;
        }
        const playerTile = tiles.find(t => 
            t.coord && t.coord.q === player.position.q && t.coord.r === player.position.r
        );
        if (!playerTile) {
            errors.push(`Player ${player.id} at position without tile: ${player.position.q},${player.position.r}`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate game phase
 */
function validatePhase(state: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validPhases = Object.values(Phase);
    if (!validPhases.includes(state.phase)) {
        errors.push(`Invalid phase: ${state.phase}`);
    }

    // Round validation
    if (state.round < 1) {
        errors.push(`Invalid round number: ${state.round}`);
    }

    // Current player index validation
    if (state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length) {
        errors.push(`Invalid currentPlayerIndex: ${state.currentPlayerIndex}`);
    }

    // Final preparation consistency
    if (state.isFinalPreparation && state.finalPrepRoundsLeft < 0) {
        warnings.push(`isFinalPreparation=true but invalid finalPrepRoundsLeft: ${state.finalPrepRoundsLeft}`);
    }

    // Pending reward choice validation
    if (state.pendingRewardChoice) {
        const player = state.players.find(p => p.id === state.pendingRewardChoice?.playerId);
        if (!player) {
            errors.push(`pendingRewardChoice for non-existent player: ${state.pendingRewardChoice.playerId}`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate tile deck
 */
function validateTileDeck(state: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!state.tileDeck) {
        errors.push("No tile deck in state");
        return { valid: false, errors, warnings };
    }

    const remaining = state.tileDeck.getRemainingCount();
    
    if (remaining < 0) {
        errors.push(`Negative remaining tiles in deck: ${remaining}`);
    }

    // If game is not over and no final tile revealed, deck shouldn't be empty
    if (remaining === 0 && !state.isFinalPreparation && !state.isFinalPhase) {
        warnings.push("Deck empty while final tile not revealed");
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Quick validation check - throws on error
 */
export function assertValidState(state: GameState, context?: string): void {
    const result = validateGameState(state);
    if (!result.valid) {
        const msg = context 
            ? `State validation failed (${context}): ${result.errors.join(", ")}`
            : `State validation failed: ${result.errors.join(", ")}`;
        throw new Error(msg);
    }
}

/**
 * Validate a specific action can be performed
 */
export function validateAction(state: GameState, action: string, playerId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
        errors.push(`Player ${playerId} not found`);
        return { valid: false, errors, warnings };
    }

    // Check if it's this player's turn
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
        errors.push(`Not ${playerId}'s turn (current: ${currentPlayer.id})`);
    }

    // Check action points for actions that cost AP
    const apCostActions = ["move", "explore", "gather", "heal", "craft", "build"];
    if (apCostActions.includes(action) && state.actionPoints <= 0) {
        errors.push(`${playerId} has no action points for ${action}`);
    }

    // Phase-specific validations
    if (state.gameOver) {
        errors.push("Game is over, no actions allowed");
    }

    if (action === "explore" && state.isFinalPreparation) {
        errors.push("Cannot explore during final preparation");
    }

    return { valid: errors.length === 0, errors, warnings };
}
