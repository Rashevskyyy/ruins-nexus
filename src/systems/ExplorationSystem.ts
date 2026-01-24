import type { Tile } from "../board/Tile";
import { TileType } from "../board/TileTypes";
import type { TileDeck, TileTemplate } from "../board/TileDeck";

export class ExplorationSystem {
    constructor(private tileDeck: TileDeck) {}

    /**
     * Вытягивает тайл из колоды и применяет к Tile
     * NEW: работает с колодой вместо рандомной генерации
     */
    applyTemplate(tile: Tile): boolean {
        if (tile.discovered) return false;

        // Вытягиваем тайл из колоды
        const template = this.tileDeck.drawTile();
        if (!template) {
            // Колода кончилась
            console.warn("Tile deck exhausted!");
            return false;
        }

        // Применяем данные из template к tile
        tile.discovered = true;
        tile.type = template.isFinalTile ? TileType.Final : TileType.Resource;
        tile.tier = template.tier;
        tile.resources = template.resources;
        tile.blockedEdges = template.blockedEdges;
        tile.isFinalTile = template.isFinalTile;
        // rotation применится позже при размещении

        // Монстр
        tile.encounterActive = true;
        tile.enemyHp = template.enemyHp;

        return true;
    }

    /**
     * OLD reveal method (для обратной совместимости)
     * TODO: удалить после полного перехода на applyTemplate
     */
    reveal(tile: Tile): void {
        this.applyTemplate(tile);
    }
}
