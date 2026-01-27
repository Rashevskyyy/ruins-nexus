/**
 * Cosmic Frontier - Shared Action Types (v0.6)
 * 
 * Discriminated union for all game actions.
 * Used by both client and server.
 */

import { z } from "zod";

// ========================================
// COORDINATE SCHEMA
// ========================================

export const HexCoordSchema = z.object({
    q: z.number().int(),
    r: z.number().int(),
});

export type HexCoord = z.infer<typeof HexCoordSchema>;

// ========================================
// ACTION SCHEMAS
// ========================================

// Move/Click on hex
export const HexClickActionSchema = z.object({
    type: z.literal("hex-click"),
    target: HexCoordSchema,
});

// Gather resources
export const GatherActionSchema = z.object({
    type: z.literal("gather"),
});

// Trade at hub
export const TradeActionSchema = z.object({
    type: z.literal("trade"),
});

// Heal at base
export const HealActionSchema = z.object({
    type: z.literal("heal"),
});

// Start explore
export const ExploreActionSchema = z.object({
    type: z.literal("explore"),
});

// Rotate pending tile
export const RotateActionSchema = z.object({
    type: z.literal("rotate"),
});

// Select placement position
export const SelectPlacementActionSchema = z.object({
    type: z.literal("select-placement"),
    coord: HexCoordSchema,
});

// Place tile
export const PlaceTileActionSchema = z.object({
    type: z.literal("place-tile"),
});

// Build base
export const BuildBaseActionSchema = z.object({
    type: z.literal("build-base"),
});

// Build modules
export const BuildModulesActionSchema = z.object({
    type: z.literal("build-modules"),
    modules: z.array(z.string()),
});

// Choose reward after combat
export const ChooseRewardActionSchema = z.object({
    type: z.literal("choose-reward"),
    choice: z.enum(["standard", "components"]),
});

// Finish token selection
export const FinishTokenSelectionActionSchema = z.object({
    type: z.literal("finish-token-selection"),
});

// Craft item
export const CraftActionSchema = z.object({
    type: z.literal("craft"),
    recipeId: z.string(),
});

// Toggle craft menu
export const ToggleCraftMenuActionSchema = z.object({
    type: z.literal("toggle-craft-menu"),
});

// Recall to base
export const RecallToBaseActionSchema = z.object({
    type: z.literal("recall-to-base"),
});

// Orbital Hangar teleport
export const OrbitalHangarTeleportActionSchema = z.object({
    type: z.literal("orbital-hangar-teleport"),
    destination: HexCoordSchema,
});

// Final Trial
export const FinalTrialActionSchema = z.object({
    type: z.literal("final-trial"),
    prestigeSpend: z.number().int().min(0),
});

// Hire unit
export const HireUnitActionSchema = z.object({
    type: z.literal("hire-unit"),
    unitType: z.enum(["assault", "shield", "tactical"]),
});

// Combat resolved (dice animation complete)
export const CombatResolvedActionSchema = z.object({
    type: z.literal("combat-resolved"),
});

// ========================================
// DEBUG ACTIONS
// ========================================

export const DebugAddResourcesActionSchema = z.object({
    type: z.literal("debug-add-resources"),
    playerId: z.string().optional(),
});

export const DebugHealActionSchema = z.object({
    type: z.literal("debug-heal"),
    playerId: z.string().optional(),
});

export const DebugSkipTurnActionSchema = z.object({
    type: z.literal("debug-skip-turn"),
});

export const ResetGameActionSchema = z.object({
    type: z.literal("reset-game"),
});

// ========================================
// COMBINED ACTION SCHEMA
// ========================================

export const GameActionSchema = z.discriminatedUnion("type", [
    // Core actions
    HexClickActionSchema,
    GatherActionSchema,
    TradeActionSchema,
    HealActionSchema,
    ExploreActionSchema,
    RotateActionSchema,
    SelectPlacementActionSchema,
    PlaceTileActionSchema,
    BuildBaseActionSchema,
    BuildModulesActionSchema,
    ChooseRewardActionSchema,
    FinishTokenSelectionActionSchema,
    CraftActionSchema,
    ToggleCraftMenuActionSchema,
    RecallToBaseActionSchema,
    OrbitalHangarTeleportActionSchema,
    FinalTrialActionSchema,
    HireUnitActionSchema,
    CombatResolvedActionSchema,
    // Debug
    DebugAddResourcesActionSchema,
    DebugHealActionSchema,
    DebugSkipTurnActionSchema,
    ResetGameActionSchema,
]);

export type GameAction = z.infer<typeof GameActionSchema>;

// ========================================
// ACTION VALIDATION
// ========================================

export function validateAction(action: unknown): { success: true; data: GameAction } | { success: false; error: string } {
    const result = GameActionSchema.safeParse(action);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.message };
}

// ========================================
// ACTION REQUEST (sent from client)
// ========================================

export const ActionRequestSchema = z.object({
    roomCode: z.string().min(1),
    action: GameActionSchema,
    clientStateVersion: z.number().int().min(0), // For conflict detection
});

export type ActionRequest = z.infer<typeof ActionRequestSchema>;

// ========================================
// ACTION RESPONSE (sent from server)
// ========================================

export interface ActionResponse {
    success: boolean;
    error?: string;
    newState?: any; // Full game state
    stateVersion: number;
    rngResults?: RngResult[]; // Dice rolls, etc.
}

// ========================================
// RNG RESULTS (server-generated)
// ========================================

export interface RngResult {
    type: "dice" | "shuffle" | "random";
    values: number[];
    context: string; // "combat", "tile-draw", etc.
}
