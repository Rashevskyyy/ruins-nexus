import { describe, it, expect } from 'vitest';
import { canMoveBetween, getEdgeBetween, getOppositeEdge, applyRotation } from '../../src/board/BlockedEdges';
import type { Tile } from '../../src/board/Tile';
import { TileType } from '../../src/board/TileTypes';

// Helper to create mock tile
function createTile(q: number, r: number, blockedEdges: number[] = []): Tile {
    return {
        coord: { q, r },
        discovered: true,
        type: TileType.Terrain,
        blockedEdges,
    };
}

describe('BlockedEdges', () => {
    describe('getEdgeBetween', () => {
        it('should return correct edge for adjacent hexes', () => {
            // From (0,0) to (1,0) should be edge 0
            const edge = getEdgeBetween({ q: 0, r: 0 }, { q: 1, r: 0 });
            expect(edge).toBeGreaterThanOrEqual(0);
            expect(edge).toBeLessThan(6);
        });

        it('should return -1 for non-adjacent hexes', () => {
            const edge = getEdgeBetween({ q: 0, r: 0 }, { q: 5, r: 5 });
            expect(edge).toBe(-1);
        });
    });

    describe('getOppositeEdge', () => {
        it('should return opposite edge', () => {
            expect(getOppositeEdge(0)).toBe(3);
            expect(getOppositeEdge(1)).toBe(4);
            expect(getOppositeEdge(2)).toBe(5);
            expect(getOppositeEdge(3)).toBe(0);
            expect(getOppositeEdge(4)).toBe(1);
            expect(getOppositeEdge(5)).toBe(2);
        });

        it('should be symmetric', () => {
            for (let i = 0; i < 6; i++) {
                const opposite = getOppositeEdge(i);
                expect(getOppositeEdge(opposite)).toBe(i);
            }
        });
    });

    describe('applyRotation', () => {
        it('should rotate edges by given amount', () => {
            const edges = [0, 1];
            
            const rotated1 = applyRotation(edges, 1);
            expect(rotated1).toContain(1);
            expect(rotated1).toContain(2);
            
            const rotated2 = applyRotation(edges, 2);
            expect(rotated2).toContain(2);
            expect(rotated2).toContain(3);
        });

        it('should wrap around at 6', () => {
            const edges = [5];
            
            const rotated = applyRotation(edges, 1);
            expect(rotated).toContain(0);
        });

        it('should not modify original array', () => {
            const edges = [0, 1, 2];
            applyRotation(edges, 3);
            
            expect(edges).toEqual([0, 1, 2]);
        });

        it('should return empty array for empty input', () => {
            const rotated = applyRotation([], 3);
            expect(rotated).toEqual([]);
        });
    });

    describe('canMoveBetween', () => {
        it('should allow movement when no blocked edges', () => {
            const from = createTile(0, 0);
            const to = createTile(1, 0);
            
            const result = canMoveBetween(from, to.coord, to);
            
            expect(result).toBe(true);
        });

        it('should block movement when source edge is blocked', () => {
            // Edge from (0,0) to (1,0) is edge 0
            const from = createTile(0, 0, [0]); // Block edge 0
            const to = createTile(1, 0);
            
            const result = canMoveBetween(from, to.coord, to);
            
            expect(result).toBe(false);
        });

        it('should block movement when target opposite edge is blocked', () => {
            // Edge from (0,0) to (1,0) is edge 0, opposite is 3
            const from = createTile(0, 0);
            const to = createTile(1, 0, [3]); // Block opposite edge
            
            const result = canMoveBetween(from, to.coord, to);
            
            expect(result).toBe(false);
        });

        it('should allow movement to null tile (unexplored)', () => {
            const from = createTile(0, 0);
            
            const result = canMoveBetween(from, { q: 1, r: 0 }, null);
            
            expect(result).toBe(true);
        });

        it('should return false for non-adjacent tiles', () => {
            const from = createTile(0, 0);
            const to = createTile(5, 5);
            
            const result = canMoveBetween(from, to.coord, to);
            
            expect(result).toBe(false);
        });

        it('should allow movement to other unblocked neighbors', () => {
            // Block only edge 0, other edges should be accessible
            const from = createTile(0, 0, [0]);
            
            // Movement to (0, 1) should use edge 1 or 2
            const to = createTile(0, 1);
            const result = canMoveBetween(from, to.coord, to);
            
            expect(result).toBe(true);
        });

        it('should handle undefined blockedEdges', () => {
            const from: Tile = {
                coord: { q: 0, r: 0 },
                discovered: true,
                type: TileType.Terrain,
                // blockedEdges not defined
            };
            const to: Tile = {
                coord: { q: 1, r: 0 },
                discovered: true,
                type: TileType.Terrain,
            };
            
            const result = canMoveBetween(from, to.coord, to);
            
            expect(result).toBe(true);
        });
    });
});
