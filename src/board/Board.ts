import type { HexCoord } from "./Hex";
import { hexKey } from "./Hex";
import type { Tile } from "./Tile";
import { TileType } from "./TileTypes";

export class Board {
    private tiles = new Map<string, Tile>();

    getTile(coord: HexCoord): Tile | undefined {
        return this.tiles.get(hexKey(coord));
    }

    setTile(tile: Tile): void {
        this.tiles.set(hexKey(tile.coord), tile);
    }

    getAllTiles(): Tile[] {
        return [...this.tiles.values()];
    }

    /**
     * Replace all tiles with the given array (for server sync)
     */
    replaceAllTiles(tiles: Tile[]): void {
        this.tiles.clear();
        for (const tile of tiles) {
            this.tiles.set(hexKey(tile.coord), tile);
        }
    }

    static createInitial(): Board {
        const board = new Board();
        const center: HexCoord = { q: 0, r: 0 };

        // Landing Hub — the only discovered tile at start
        board.setTile({
            coord: center,
            discovered: true,
            type: TileType.LandingHub,
        });

        // Only FIRST ring around Landing Hub (6 hexes)
        // Players build the map via Explore
        const ring1 = this.getHexRing(center, 1);

        // Pick 2 random tiles to pre-open (with Materials, no threat)
        const shuffled = [...ring1].sort(() => Math.random() - 0.5);
        const openedCoords = shuffled.slice(0, 2);

        for (const coord of ring1) {
            const isOpened = openedCoords.some((c) => c.q === coord.q && c.r === coord.r);

            if (isOpened) {
                // Pre-opened tile with Materials (no threat) - tutorial boost
                board.setTile({
                    coord,
                    discovered: true,
                    type: TileType.Resource,
                    tier: 1,
                    resources: { materials: 1 },
                    encounterActive: false,
                });
            } else {
                // Fog tile (will be revealed by players)
                board.setTile({
                    coord,
                    discovered: false,
                    type: TileType.Empty,
                    tier: 1,
                });
            }
        }

        return board;
    }

    /**
     * Get all hexes at a specific distance (ring) from center
     */
    private static getHexRing(center: HexCoord, radius: number): HexCoord[] {
        if (radius === 0) return [center];

        const results: HexCoord[] = [];

        const directions = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
        ];

        let hex = { q: center.q + directions[4].q * radius, r: center.r + directions[4].r * radius };

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                results.push({ ...hex });
                hex = { q: hex.q + directions[i].q, r: hex.r + directions[i].r };
            }
        }

        return results;
    }
}
