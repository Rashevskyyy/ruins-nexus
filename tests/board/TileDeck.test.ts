import { describe, it, expect, beforeEach } from 'vitest';
import { TileDeck, type TileTemplate } from '../../src/board/TileDeck';

describe('TileDeck', () => {
    let deck: TileDeck;

    beforeEach(() => {
        deck = new TileDeck();
    });

    describe('initialization', () => {
        it('should have tiles after creation', () => {
            expect(deck.getRemainingCount()).toBeGreaterThan(0);
        });

        it('should have correct total tile count', () => {
            // 20 T1 + 10 T2 + 1 Final = 31 tiles
            expect(deck.getRemainingCount()).toBe(31);
        });

        it('should have tier 1 tiles', () => {
            expect(deck.getTier1Remaining()).toBeGreaterThan(0);
        });

        it('should have tier 2 tiles', () => {
            expect(deck.getTier2Remaining()).toBeGreaterThan(0);
        });

        it('should have final tile', () => {
            expect(deck.hasFinalTile()).toBe(true);
        });
    });

    describe('drawTile', () => {
        it('should return a tile template', () => {
            const tile = deck.drawTile();
            
            expect(tile).not.toBeNull();
            expect(tile?.tier).toBeDefined();
            expect(tile?.resources).toBeDefined();
            expect(tile?.monsterTier).toBeDefined();
        });

        it('should decrease remaining count', () => {
            const before = deck.getRemainingCount();
            deck.drawTile();
            const after = deck.getRemainingCount();
            
            expect(after).toBe(before - 1);
        });

        it('should return null when deck is empty', () => {
            // Draw all tiles
            while (deck.getRemainingCount() > 0) {
                deck.drawTile();
            }
            
            const tile = deck.drawTile();
            expect(tile).toBeNull();
        });

        it('should draw tier 1 tiles first', () => {
            const firstTile = deck.drawTile();
            expect(firstTile?.tier).toBe(1);
        });
    });

    describe('peekNextTile', () => {
        it('should return next tile without removing it', () => {
            const peeked = deck.peekNextTile();
            const drawn = deck.drawTile();
            
            expect(peeked).toEqual(drawn);
        });

        it('should return null when deck is empty', () => {
            while (deck.getRemainingCount() > 0) {
                deck.drawTile();
            }
            
            expect(deck.peekNextTile()).toBeNull();
        });
    });

    describe('tile structure', () => {
        it('should have valid tier values', () => {
            while (deck.getRemainingCount() > 0) {
                const tile = deck.drawTile()!;
                expect([1, 2, 3]).toContain(tile.tier);
            }
        });

        it('should have monster tier matching constraints', () => {
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                
                if (tile.tier === 1) {
                    expect([1, 2]).toContain(tile.monsterTier);
                } else if (tile.tier === 2) {
                    expect([3, 4]).toContain(tile.monsterTier);
                } else if (tile.tier === 3) {
                    expect(tile.monsterTier).toBe(6); // Final tile
                }
            }
        });

        it('should have HP equal to monster tier', () => {
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                if (!tile.isFinalTile) {
                    expect(tile.enemyHp).toBe(tile.monsterTier);
                }
            }
        });

        it('should have blocked edges in valid range', () => {
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                for (const edge of tile.blockedEdges) {
                    expect(edge).toBeGreaterThanOrEqual(0);
                    expect(edge).toBeLessThan(6);
                }
            }
        });
    });

    describe('final tile', () => {
        it('should have exactly one final tile', () => {
            let finalCount = 0;
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                if (tile.isFinalTile) finalCount++;
            }
            
            expect(finalCount).toBe(1);
        });

        it('should have final tile in tier 2 section', () => {
            let tier1Count = 0;
            let foundFinal = false;
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                if (tile.tier === 1) tier1Count++;
                if (tile.isFinalTile) {
                    foundFinal = true;
                    // Final tile should appear after all tier 1 tiles
                    expect(tier1Count).toBe(20);
                }
            }
            
            expect(foundFinal).toBe(true);
        });
    });

    describe('risky tiles', () => {
        it('should have risky tiles with effects', () => {
            let riskyCount = 0;
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                if (tile.riskyEffect) riskyCount++;
            }
            
            expect(riskyCount).toBeGreaterThan(0);
        });

        it('should have valid risky effects', () => {
            const validEffects = ['toxic', 'unstable', 'rift'];
            const deck2 = new TileDeck();
            
            while (deck2.getRemainingCount() > 0) {
                const tile = deck2.drawTile()!;
                if (tile.riskyEffect) {
                    expect(validEffects).toContain(tile.riskyEffect);
                }
            }
        });
    });

    describe('configurable risky tiles', () => {
        it('should respect custom risky tile counts', () => {
            const customDeck = new TileDeck(3, 2); // 3 T1 risky, 2 T2 risky
            let riskyCount = 0;
            
            while (customDeck.getRemainingCount() > 0) {
                const tile = customDeck.drawTile()!;
                if (tile.riskyEffect) riskyCount++;
            }
            
            expect(riskyCount).toBe(5); // 3 + 2
        });
    });

    describe('serialization', () => {
        it('should serialize deck state', () => {
            deck.drawTile();
            deck.drawTile();
            
            const serialized = deck.serialize();
            
            expect(serialized.deck).toBeDefined();
            expect(serialized.currentIndex).toBe(2);
        });

        it('should deserialize deck state', () => {
            deck.drawTile();
            deck.drawTile();
            const serialized = deck.serialize();
            
            const restored = TileDeck.deserialize(serialized);
            
            expect(restored.getRemainingCount()).toBe(deck.getRemainingCount());
        });

        it('should restore from serialized data', () => {
            const original = new TileDeck();
            original.drawTile();
            original.drawTile();
            const serialized = original.serialize();
            
            const newDeck = new TileDeck();
            newDeck.restoreFrom(serialized);
            
            expect(newDeck.getRemainingCount()).toBe(original.getRemainingCount());
        });
    });
});
