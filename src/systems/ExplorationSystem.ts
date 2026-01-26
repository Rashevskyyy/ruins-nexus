import type { Tile } from "../board/Tile";
import { TileType } from "../board/TileTypes";
import type { TileDeck } from "../board/TileDeck";

export class ExplorationSystem {
    constructor(private tileDeck: TileDeck) {}

    /**
     * Draw tile from deck and apply to Tile
     */
    applyTemplate(tile: Tile): boolean {
        if (tile.discovered) return false;

        // Draw from deck
        const template = this.tileDeck.drawTile();
        if (!template) {
            console.warn("Tile deck exhausted!");
            return false;
        }

        // Apply template data to tile
        tile.discovered = true;
        tile.type = template.isFinalTile ? TileType.FinalTile : TileType.Resource;
        tile.tier = template.tier as 1 | 2 | 3;
        tile.resources = template.resources;
        tile.blockedEdges = template.blockedEdges;
        tile.isFinalTile = template.isFinalTile;
        tile.riskyEffect = template.riskyEffect; // v0.4 risky tiles
        // rotation is applied later during placement

        // Local threat (Final Tile has no regular encounter - Final Threat is global)
        if (!template.isFinalTile) {
            tile.encounterActive = true;
            tile.monsterTier = template.monsterTier;
            tile.enemyHp = template.enemyHp; // HP = monsterTier
            tile.pendingRewards = template.rewards; // Rewards for defeating this monster
        } else {
            tile.encounterActive = false;
        }

        return true;
    }

    /**
     * Legacy reveal method (for compatibility)
     */
    reveal(tile: Tile): void {
        this.applyTemplate(tile);
    }
}
