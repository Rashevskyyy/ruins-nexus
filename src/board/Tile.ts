import type {HexCoord} from "./Hex.ts";
import type {TileType} from "./TileTypes.ts";
import type {ResourceMap} from "./TileDeck.ts";

export type ResourceKind = "Provisions" | "Timber" | "Iron";

export type TileTier = 1 | 2 | 3;

export type Tile = {
    coord: HexCoord;
    discovered: boolean;
    type: TileType;
    tier?: TileTier; // 1 = easy (1 монстр), 2 = medium (2 монстра), 3 = hard (события/реликвии)

    // NEW: Множественные ресурсы (как в Караке)
    resources?: ResourceMap; // { Provisions: 1, Timber: 1 } или { Timber: 3 }
    
    // OLD (для обратной совместимости, удалим позже)
    resource?: { kind: ResourceKind; amount: number };

    // NEW: Непроходимые горы на гранях (0-5, после rotation)
    blockedEdges?: number[]; // [0, 2, 4] = грани 0, 2, 4 заблокированы
    rotation?: number; // 0-5 (поворот тайла)

    // персональный кулдаун сбора
    cooldownUntilRoundByPlayer?: Record<string, number>;

    // Энкаунтер на тайле
    encounterActive?: boolean;
    enemyHp?: number; // зависит от tier: tier 1 = 2 HP, tier 2 = 4 HP, tier 3 = 6 HP
    
    // Final Tile - триггерит конец игры
    isFinalTile?: boolean;
    
    // Постройка на тайле (город/аутпост игрока)
    ownerId?: string;           // ID игрока который построил здесь
    buildingType?: string;      // Тип здания
};

