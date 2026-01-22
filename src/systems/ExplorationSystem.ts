import type { Tile } from "../board/Tile";
import { TileType } from "../board/TileTypes";

function randInt(max: number): number {
    return Math.floor(Math.random() * max);
}

export class ExplorationSystem {
    reveal(tile: Tile): void {
        if (tile.discovered) return;

        tile.discovered = true;
        if (tile.type === TileType.Settlement) return;

        // ресурс всегда
        tile.type = TileType.Resource;
        const kinds = ["Provisions", "Timber", "Iron"] as const;
        const kind = kinds[randInt(kinds.length)];
        tile.resource = { kind, amount: 1 };

        // монстр всегда при открытии
        tile.encounterActive = true;
        tile.enemyHp = 2;
    }
}
