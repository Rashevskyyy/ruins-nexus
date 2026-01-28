import type { HexCoord } from "./Hex.ts";
import type { TileType } from "./TileTypes.ts";
import type { ResourceMap, TokenType } from "./TileDeck.ts";

export type ResourceKind = "Biomass" | "Materials" | "Alloys";

export type TileTier = 1 | 2 | 3;

export type Tile = {
    coord: HexCoord;
    discovered: boolean;
    type: TileType;
    tier?: TileTier; // 1 = easy, 2 = medium, 3 = Final

    // Resources (Cosmic Frontier)
    resources?: ResourceMap; // { biomass: 1, materials: 1 } etc.
    componentBonus?: number; // 🧩 Components granted on Gather (e.g. Mystery Sector)

    // Blocked edges (mountains/cliffs) - 0-5, after rotation
    blockedEdges?: number[];
    rotation?: number; // 0-5 (tile rotation)

    // Per-player gather cooldown
    cooldownUntilRoundByPlayer?: Record<string, number>;

    // Local threat (encounter)
    encounterActive?: boolean;
    monsterTier?: number;  // Monster tier (1-4, determines HP and rewards)
    enemyHp?: number;      // Monster HP = monsterTier
    pendingRewards?: TokenType[]; // Rewards to give after defeating monster

    // Final Tile - triggers Final Phase
    isFinalTile?: boolean;

    // Player's Base on this tile
    ownerId?: string;
    
    // Starting Sector owner (v0.5) - NOT a base, just home zone
    sectorPlayerId?: string;
    
    // Risky Tile effect (v0.4)
    // toxic: +1 💀 in every combat
    // unstable: -1 HP every Gather
    // rift: leaving consumes a slot
    riskyEffect?: "toxic" | "unstable" | "rift";
};
