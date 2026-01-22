import type { HexCoord } from "./Hex";
import { hexKey, neighbors } from "./Hex";
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

    static createInitial(): Board {
        const board = new Board();

        const center: HexCoord = { q: 0, r: 0 };

        // Settlement — единственное открытое место на старте
        board.setTile({
            coord: center,
            discovered: true,
            type: TileType.Settlement,
        });

        // 1 кольцо вокруг Settlement — создано, но в тумане
        const ring1 = neighbors(center);
        for (const c of ring1) {
            board.setTile({
                coord: c,
                discovered: false,
                type: TileType.Empty, // тип будет задан ExplorationSystem при reveal
            });
        }

        // 2 кольцо — тоже в тумане
        for (const c1 of ring1) {
            for (const c2 of neighbors(c1)) {
                if (!board.getTile(c2)) {
                    board.setTile({
                        coord: c2,
                        discovered: false,
                        type: TileType.Empty,
                    });
                }
            }
        }

        return board;
    }
}
