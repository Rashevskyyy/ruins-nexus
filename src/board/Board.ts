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

        // Landing Hub — the ONLY tile at start
        // Players explore and build the map from here
        board.setTile({
            coord: center,
            discovered: true,
            type: TileType.LandingHub,
        });

        return board;
    }
}
