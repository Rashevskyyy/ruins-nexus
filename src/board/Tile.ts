import type {HexCoord} from "./Hex.ts";
import type {TileType} from "./TileTypes.ts";

export type ResourceKind = "Provisions" | "Timber" | "Iron";

export type Tile = {
    coord: HexCoord;
    discovered: boolean;
    type: TileType;

    resource?: { kind: ResourceKind; amount: number };

    // персональный кулдаун сбора
    cooldownUntilRoundByPlayer?: Record<string, number>;

    // NEW: энкаунтер на тайле
    encounterActive?: boolean;
    enemyHp?: number; // для MVP всегда 2
};

