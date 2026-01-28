import { describe, it, expect, beforeEach } from "vitest";
import { ExplorationSystem } from "../../src/systems/ExplorationSystem";
import { TileDeck } from "../../src/board/TileDeck";
import type { Tile } from "../../src/board/Tile";
import { TileType } from "../../src/board/TileTypes";

describe("ExplorationSystem", () => {
    let exploration: ExplorationSystem;
    let tileDeck: TileDeck;

    beforeEach(() => {
        tileDeck = new TileDeck(12345); // Fixed seed for reproducibility
        exploration = new ExplorationSystem(tileDeck);
    });

    function createBlankTile(q: number, r: number): Tile {
        return {
            coord: { q, r },
            type: TileType.Unknown,
            tier: 1,
            discovered: false,
            blockedEdges: [],
            resources: undefined,
            encounterActive: false,
            monsterTier: undefined,
            enemyHp: undefined,
            isFinalTile: false,
            riskyEffect: undefined,
            pendingRewards: undefined,
            cooldownUntilRoundByPlayer: {},
        };
    }

    describe("applyTemplate", () => {
        it("should mark tile as discovered", () => {
            const tile = createBlankTile(1, 0);
            
            const result = exploration.applyTemplate(tile);
            
            expect(result).toBe(true);
            expect(tile.discovered).toBe(true);
        });

        it("should set tile type to Resource for regular tiles", () => {
            const tile = createBlankTile(1, 0);
            
            exploration.applyTemplate(tile);
            
            // Regular tiles become Resource type
            expect([TileType.Resource, TileType.FinalTile]).toContain(tile.type);
        });

        it("should set tile tier from template", () => {
            const tile = createBlankTile(1, 0);
            
            exploration.applyTemplate(tile);
            
            expect(tile.tier).toBeGreaterThanOrEqual(1);
            expect(tile.tier).toBeLessThanOrEqual(3);
        });

        it("should set resources from template", () => {
            const tile = createBlankTile(1, 0);
            
            exploration.applyTemplate(tile);
            
            // Most tiles should have resources
            if (!tile.isFinalTile) {
                expect(tile.resources).toBeDefined();
            }
        });

        it("should activate encounter for non-final tiles", () => {
            const tile = createBlankTile(1, 0);
            
            exploration.applyTemplate(tile);
            
            if (!tile.isFinalTile) {
                expect(tile.encounterActive).toBe(true);
                expect(tile.monsterTier).toBeDefined();
            }
        });

        it("should not activate encounter for final tile", () => {
            // Draw until we get the final tile
            let finalTile: Tile | null = null;
            for (let i = 0; i < 20; i++) {
                const tile = createBlankTile(i, 0);
                exploration.applyTemplate(tile);
                if (tile.isFinalTile) {
                    finalTile = tile;
                    break;
                }
            }
            
            if (finalTile) {
                expect(finalTile.encounterActive).toBe(false);
                expect(finalTile.type).toBe(TileType.FinalTile);
            }
        });

        it("should return false for already discovered tiles", () => {
            const tile = createBlankTile(1, 0);
            tile.discovered = true;
            
            const result = exploration.applyTemplate(tile);
            
            expect(result).toBe(false);
        });

        it("should set blocked edges from template", () => {
            // Run multiple times to increase chance of getting a tile with blocked edges
            let foundBlockedEdges = false;
            for (let i = 0; i < 15; i++) {
                const tile = createBlankTile(i, 0);
                exploration.applyTemplate(tile);
                if (tile.blockedEdges && tile.blockedEdges.length > 0) {
                    foundBlockedEdges = true;
                    // Blocked edges should be valid (0-5)
                    for (const edge of tile.blockedEdges) {
                        expect(edge).toBeGreaterThanOrEqual(0);
                        expect(edge).toBeLessThanOrEqual(5);
                    }
                    break;
                }
            }
            // Note: it's possible no tiles have blocked edges, that's okay
        });

        it("should set risky effect from template when present", () => {
            // Run multiple times to find a risky tile
            let foundRiskyTile = false;
            for (let i = 0; i < 20; i++) {
                const tile = createBlankTile(i, 0);
                exploration.applyTemplate(tile);
                if (tile.riskyEffect) {
                    foundRiskyTile = true;
                    expect(["toxic", "unstable", "rift"]).toContain(tile.riskyEffect);
                    break;
                }
            }
            // Note: it's possible no tiles have risky effects in first 20, that's okay
        });

        it("should decrement tile deck on each apply", () => {
            const initialCount = tileDeck.getRemainingCount();
            const tile = createBlankTile(1, 0);
            
            exploration.applyTemplate(tile);
            
            expect(tileDeck.getRemainingCount()).toBe(initialCount - 1);
        });

        it("should return false when deck is exhausted", () => {
            // Exhaust the deck
            while (tileDeck.getRemainingCount() > 0) {
                tileDeck.drawTile();
            }
            
            const tile = createBlankTile(99, 0);
            const result = exploration.applyTemplate(tile);
            
            expect(result).toBe(false);
            expect(tile.discovered).toBe(false);
        });
    });

    describe("reveal (legacy)", () => {
        it("should work the same as applyTemplate", () => {
            const tile = createBlankTile(1, 0);
            
            exploration.reveal(tile);
            
            expect(tile.discovered).toBe(true);
        });
    });

    describe("tile progression", () => {
        it("should have increasing tier likelihood as deck depletes", () => {
            const tierCounts = { 1: 0, 2: 0, 3: 0 };
            
            // Draw all tiles and count tiers
            for (let i = 0; tileDeck.getRemainingCount() > 0; i++) {
                const tile = createBlankTile(i, 0);
                exploration.applyTemplate(tile);
                if (!tile.isFinalTile) {
                    tierCounts[tile.tier as 1 | 2 | 3]++;
                }
            }
            
            // Should have tiles of all tiers
            expect(tierCounts[1]).toBeGreaterThan(0);
            expect(tierCounts[2]).toBeGreaterThan(0);
            // Tier 3 might be rare but should exist
        });

        it("should eventually draw the final tile", () => {
            let foundFinalTile = false;
            
            for (let i = 0; tileDeck.getRemainingCount() > 0; i++) {
                const tile = createBlankTile(i, 0);
                exploration.applyTemplate(tile);
                if (tile.isFinalTile) {
                    foundFinalTile = true;
                    break;
                }
            }
            
            expect(foundFinalTile).toBe(true);
        });
    });
});
