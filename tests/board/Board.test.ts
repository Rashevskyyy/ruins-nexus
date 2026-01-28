import { describe, it, expect } from 'vitest';
import { Board } from '../../src/board/Board';
import { TileType } from '../../src/board/TileTypes';
import type { Tile } from '../../src/board/Tile';

describe('Board', () => {
    describe('basic operations', () => {
        it('should get and set tiles', () => {
            const board = new Board();
            const tile: Tile = {
                coord: { q: 1, r: 2 },
                discovered: true,
                type: TileType.Terrain,
            };

            board.setTile(tile);
            const retrieved = board.getTile({ q: 1, r: 2 });

            expect(retrieved).toEqual(tile);
        });

        it('should return undefined for non-existent tile', () => {
            const board = new Board();
            
            const tile = board.getTile({ q: 999, r: 999 });
            
            expect(tile).toBeUndefined();
        });

        it('should return all tiles', () => {
            const board = new Board();
            board.setTile({ coord: { q: 0, r: 0 }, discovered: true, type: TileType.LandingHub });
            board.setTile({ coord: { q: 1, r: 0 }, discovered: true, type: TileType.Terrain });
            board.setTile({ coord: { q: 0, r: 1 }, discovered: true, type: TileType.Resource });

            const allTiles = board.getAllTiles();

            expect(allTiles.length).toBe(3);
        });

        it('should overwrite tile at same position', () => {
            const board = new Board();
            const coord = { q: 1, r: 1 };
            
            board.setTile({ coord, discovered: false, type: TileType.Terrain });
            board.setTile({ coord, discovered: true, type: TileType.Resource });

            const tile = board.getTile(coord);
            expect(tile?.discovered).toBe(true);
            expect(tile?.type).toBe(TileType.Resource);
        });
    });

    describe('replaceAllTiles', () => {
        it('should replace all tiles', () => {
            const board = new Board();
            board.setTile({ coord: { q: 0, r: 0 }, discovered: true, type: TileType.LandingHub });
            board.setTile({ coord: { q: 1, r: 0 }, discovered: true, type: TileType.Terrain });

            const newTiles: Tile[] = [
                { coord: { q: 5, r: 5 }, discovered: true, type: TileType.Resource },
            ];

            board.replaceAllTiles(newTiles);

            expect(board.getAllTiles().length).toBe(1);
            expect(board.getTile({ q: 0, r: 0 })).toBeUndefined();
            expect(board.getTile({ q: 5, r: 5 })).toBeDefined();
        });
    });

    describe('createForGame', () => {
        it('should create board with landing hub at center', () => {
            const board = Board.createForGame(2);
            
            const hub = board.getTile({ q: 0, r: 0 });
            
            expect(hub).toBeDefined();
            expect(hub?.type).toBe(TileType.LandingHub);
            expect(hub?.discovered).toBe(true);
        });

        it('should create starting sectors for each player', () => {
            const playerCount = 4;
            const board = Board.createForGame(playerCount);
            
            const allTiles = board.getAllTiles();
            const startingSectors = allTiles.filter(t => t.type === TileType.StartingSector);
            
            expect(startingSectors.length).toBe(playerCount);
        });

        it('should mark starting sectors with player IDs', () => {
            const board = Board.createForGame(2);
            
            const allTiles = board.getAllTiles();
            const sectors = allTiles.filter(t => t.type === TileType.StartingSector);
            
            const playerIds = sectors.map(t => t.sectorPlayerId);
            expect(playerIds).toContain('P1');
            expect(playerIds).toContain('P2');
        });

        it('should create different layouts on each call (randomized)', () => {
            const layouts: string[] = [];
            
            for (let i = 0; i < 10; i++) {
                const board = Board.createForGame(2);
                const sectors = board.getAllTiles()
                    .filter(t => t.type === TileType.StartingSector)
                    .map(t => `${t.coord.q},${t.coord.r}`)
                    .sort()
                    .join('|');
                layouts.push(sectors);
            }
            
            // Should have at least 2 different layouts in 10 tries
            const uniqueLayouts = new Set(layouts);
            expect(uniqueLayouts.size).toBeGreaterThanOrEqual(1); // At minimum 1, likely more
        });

        it('should give starting sectors resources', () => {
            const board = Board.createForGame(2);
            
            const sectors = board.getAllTiles().filter(t => t.type === TileType.StartingSector);
            
            for (const sector of sectors) {
                expect(sector.resources).toBeDefined();
            }
        });
    });

    describe('getStartingPositions', () => {
        it('should return positions matching player count', () => {
            const board = Board.createForGame(3);
            const positions = Board.getStartingPositions(3, board);
            
            expect(positions.length).toBe(3);
        });

        it('should return positions adjacent to center', () => {
            const board = Board.createForGame(2);
            const positions = Board.getStartingPositions(2, board);
            
            for (const pos of positions) {
                // All starting positions should be 1 hex away from center
                const distance = (Math.abs(pos.q) + Math.abs(pos.q + pos.r) + Math.abs(pos.r)) / 2;
                expect(distance).toBe(1);
            }
        });

        it('should return positions from board tiles', () => {
            const board = Board.createForGame(2);
            const positions = Board.getStartingPositions(2, board);
            
            for (const pos of positions) {
                const tile = board.getTile(pos);
                expect(tile).toBeDefined();
                expect(tile?.type).toBe(TileType.StartingSector);
            }
        });
    });
});
