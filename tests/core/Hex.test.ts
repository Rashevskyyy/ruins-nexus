import { describe, it, expect } from 'vitest';
import { hexKey, addHex, neighbors, isNeighbor, hexDistance, type HexCoord } from '../../src/board/Hex';

describe('Hex Utilities', () => {
    describe('hexKey', () => {
        it('should generate unique key for coordinates', () => {
            expect(hexKey({ q: 0, r: 0 })).toBe('0,0');
            expect(hexKey({ q: 1, r: -1 })).toBe('1,-1');
            expect(hexKey({ q: -5, r: 3 })).toBe('-5,3');
        });
    });

    describe('addHex', () => {
        it('should add two hex coordinates', () => {
            const result = addHex({ q: 1, r: 2 }, { q: 3, r: 4 });
            expect(result).toEqual({ q: 4, r: 6 });
        });

        it('should handle negative values', () => {
            const result = addHex({ q: -1, r: 2 }, { q: 3, r: -4 });
            expect(result).toEqual({ q: 2, r: -2 });
        });

        it('should handle zero', () => {
            const result = addHex({ q: 0, r: 0 }, { q: 5, r: 7 });
            expect(result).toEqual({ q: 5, r: 7 });
        });
    });

    describe('neighbors', () => {
        it('should return 6 neighbors for any hex', () => {
            const result = neighbors({ q: 0, r: 0 });
            expect(result).toHaveLength(6);
        });

        it('should return correct neighbors for origin', () => {
            const result = neighbors({ q: 0, r: 0 });
            // In axial coordinates, neighbors of (0,0) are the 6 directions
            const keys = result.map(hexKey).sort();
            expect(keys).toContain('1,0');
            expect(keys).toContain('-1,0');
            expect(keys).toContain('0,1');
            expect(keys).toContain('0,-1');
            expect(keys).toContain('1,-1');
            expect(keys).toContain('-1,1');
        });

        it('should return correct neighbors for offset position', () => {
            const result = neighbors({ q: 2, r: 3 });
            expect(result).toHaveLength(6);
            // Each neighbor should be exactly distance 1 away
            for (const n of result) {
                expect(hexDistance({ q: 2, r: 3 }, n)).toBe(1);
            }
        });
    });

    describe('isNeighbor', () => {
        it('should return true for adjacent hexes', () => {
            expect(isNeighbor({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
            expect(isNeighbor({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(true);
            expect(isNeighbor({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(true);
        });

        it('should return false for non-adjacent hexes', () => {
            expect(isNeighbor({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
            expect(isNeighbor({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false);
            expect(isNeighbor({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(false);
        });

        it('should be symmetric', () => {
            const a: HexCoord = { q: 1, r: 2 };
            const b: HexCoord = { q: 2, r: 2 };
            expect(isNeighbor(a, b)).toBe(isNeighbor(b, a));
        });
    });

    describe('hexDistance', () => {
        it('should return 0 for same position', () => {
            expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
            expect(hexDistance({ q: 5, r: -3 }, { q: 5, r: -3 })).toBe(0);
        });

        it('should return 1 for neighbors', () => {
            expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
            expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
            expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
        });

        it('should calculate correct distance for far hexes', () => {
            expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
            expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 5 })).toBe(5);
            expect(hexDistance({ q: -2, r: -2 }, { q: 2, r: 2 })).toBe(8);
        });

        it('should be symmetric', () => {
            const a: HexCoord = { q: 1, r: 2 };
            const b: HexCoord = { q: -3, r: 4 };
            expect(hexDistance(a, b)).toBe(hexDistance(b, a));
        });
    });
});
