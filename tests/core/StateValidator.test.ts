import { describe, it, expect, beforeEach } from "vitest";
import { validateGameState, validateAction, assertValidState } from "../../src/core/StateValidator";
import { createInitialState, type GameState } from "../../src/core/GameState";

describe("StateValidator", () => {
    let state: GameState;

    beforeEach(() => {
        state = createInitialState(2);
    });

    describe("validateGameState", () => {
        it("should validate a fresh game state", () => {
            const result = validateGameState(state);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should detect negative HP", () => {
            state.players[0].hp = -5;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("negative"))).toBe(true);
        });

        it("should detect HP exceeding maxHp", () => {
            state.players[0].hp = 100;
            state.players[0].maxHp = 5;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("exceeds maxHp"))).toBe(true);
        });

        it("should detect negative resources", () => {
            state.players[0].biomass = -10;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Negative biomass"))).toBe(true);
        });

        it("should detect negative prestige", () => {
            state.players[0].prestige = -5;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Negative prestige"))).toBe(true);
        });

        it("should detect player at invalid position", () => {
            state.players[0].position = { q: 999, r: 999 };
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("no tile"))).toBe(true);
        });

        it("should detect invalid currentPlayerIndex", () => {
            state.currentPlayerIndex = 99;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Invalid currentPlayerIndex"))).toBe(true);
        });

        it("should detect invalid round number", () => {
            state.round = 0;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Invalid round"))).toBe(true);
        });

        it("should detect missing tile deck", () => {
            (state as any).tileDeck = null;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("No tile deck"))).toBe(true);
        });

        it("should return warnings for unusual but valid states", () => {
            state.players[0].actionPoints = 50; // Unusual but not impossible
            
            const result = validateGameState(state);
            
            // Should be valid but with warnings
            expect(result.warnings.some(w => w.includes("Unusually high action points"))).toBe(true);
        });
    });

    describe("validateAction", () => {
        it("should validate action for current player", () => {
            state.currentPlayerIndex = 0;
            state.players[0].actionPoints = 2;
            
            const result = validateAction(state, "move", state.players[0].id);
            
            expect(result.valid).toBe(true);
        });

        it("should reject action for non-current player", () => {
            state.currentPlayerIndex = 0;
            
            const result = validateAction(state, "move", state.players[1].id);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Not"))).toBe(true);
        });

        it("should reject action with no action points", () => {
            state.currentPlayerIndex = 0;
            state.players[0].actionPoints = 0;
            
            const result = validateAction(state, "move", state.players[0].id);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("no action points"))).toBe(true);
        });

        it("should reject action when game is over", () => {
            state.phase = "GAME_OVER";
            
            const result = validateAction(state, "move", state.players[0].id);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Game is over"))).toBe(true);
        });

        it("should reject explore during final preparation", () => {
            state.isFinalPreparation = true;
            state.currentPlayerIndex = 0;
            state.players[0].actionPoints = 2;
            
            const result = validateAction(state, "explore", state.players[0].id);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Cannot explore"))).toBe(true);
        });

        it("should reject action for non-existent player", () => {
            const result = validateAction(state, "move", "FAKE_PLAYER");
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("not found"))).toBe(true);
        });
    });

    describe("assertValidState", () => {
        it("should not throw for valid state", () => {
            expect(() => assertValidState(state)).not.toThrow();
        });

        it("should throw for invalid state", () => {
            state.players[0].hp = -100;
            
            expect(() => assertValidState(state)).toThrow();
        });

        it("should include context in error message", () => {
            state.players[0].hp = -100;
            
            expect(() => assertValidState(state, "after combat")).toThrow(/after combat/);
        });
    });

    describe("board validation", () => {
        it("should validate board has tiles", () => {
            const result = validateGameState(state);
            
            expect(result.valid).toBe(true);
            // Board should have hub and starting sectors
        });

        it("should warn about missing hub", () => {
            // Clear all tiles and add a non-hub tile
            const tiles = state.board.getAllTiles();
            for (const tile of tiles) {
                if (tile.type === "Hub") {
                    tile.type = "Resource" as any;
                }
            }
            
            const result = validateGameState(state);
            
            expect(result.warnings.some(w => w.includes("No Hub"))).toBe(true);
        });
    });

    describe("phase validation", () => {
        it("should accept valid phases", () => {
            const validPhases = ["EXPLORATION", "ORBITAL", "FINAL_TRIAL", "GAME_OVER"];
            
            for (const phase of validPhases) {
                state.phase = phase as any;
                const result = validateGameState(state);
                expect(result.errors.filter(e => e.includes("Invalid phase"))).toHaveLength(0);
            }
        });

        it("should reject invalid phase", () => {
            state.phase = "INVALID_PHASE" as any;
            
            const result = validateGameState(state);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("Invalid phase"))).toBe(true);
        });
    });
});
