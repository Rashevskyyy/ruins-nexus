import type { HexCoord } from "./Hex";
import { hexKey, neighbors } from "./Hex";
import type { Tile, TileTier } from "./Tile";
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
     * Расстояние от центра (0,0) в гексах (кольцо)
     */
    private static getDistance(coord: HexCoord): number {
        return Math.max(Math.abs(coord.q), Math.abs(coord.r), Math.abs(coord.q + coord.r));
    }

    /**
     * Tier в зависимости от расстояния от центра
     */
    private static getTierByDistance(distance: number): TileTier {
        if (distance <= 2) return 1; // Кольца 1-2: Tier 1
        if (distance <= 4) return 2; // Кольца 3-4: Tier 2
        return 3;                     // Кольцо 5+: Tier 3
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

        // Только ПЕРВОЕ кольцо вокруг Settlement (6 гексов)
        // Дальше игроки сами строят карту через Explore
        const ring1 = this.getHexRing(center, 1);

        // Выбираем 2 рандомных тайла для открытия (с Timber, без монстра)
        const shuffled = [...ring1].sort(() => Math.random() - 0.5);
        const openedCoords = shuffled.slice(0, 2);

        for (const coord of ring1) {
            const isOpened = openedCoords.some((c) => c.q === coord.q && c.r === coord.r);

            if (isOpened) {
                // Открытый тайл с Timber (без монстра)
                board.setTile({
                    coord,
                    discovered: true,
                    type: TileType.Resource,
                    tier: 1,
                    resource: { kind: "Timber", amount: 1 },
                    encounterActive: false,
                });
            } else {
                // Закрытый тайл (будет открыт игроками)
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
     * Получить все гексы на определённом расстоянии (кольце) от центра
     */
    private static getHexRing(center: HexCoord, radius: number): HexCoord[] {
        if (radius === 0) return [center];

        const results: HexCoord[] = [];

        // Направления: 6 углов гекса
        const directions = [
            { q: 1, r: 0 },  { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
        ];

        // Начинаем с одного угла и идём по периметру
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
