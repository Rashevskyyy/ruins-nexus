import type { HexCoord } from "./Hex.ts";
import type { TileType } from "./TileTypes.ts";
import type { ResourceMap } from "./TileDeck.ts";

export type ResourceKind = "Biomass" | "Materials" | "Alloys";

export type TileTier = 1 | 2 | 3;

export type Tile = {
    coord: HexCoord;
    discovered: boolean;
    type: TileType;
    tier?: TileTier; // 1 = easy, 2 = medium, 3 = Final

    // Resources (Cosmic Frontier)
    resources?: ResourceMap; // { biomass: 1, materials: 1 } etc.

    // Blocked edges (mountains/cliffs) - 0-5, after rotation
    blockedEdges?: number[];
    rotation?: number; // 0-5 (tile rotation)

    // Per-player gather cooldown
    cooldownUntilRoundByPlayer?: Record<string, number>;

    // Local threat (encounter)
    encounterActive?: boolean;
    enemyHp?: number; // tier 1 = 2 HP, tier 2 = 4 HP

    // Final Tile - triggers Final Phase
    isFinalTile?: boolean;

    // Player's Base on this tile
    ownerId?: string;
};
