/**
 * Buildings - согласно game-design.md
 * Одинаковые для всех кланов
 */

export type BuildingType = 
    | "WarriorLodge"  // +1 ⚔ если выпал ⚔
    | "ShieldHall"    // игнор 1 💀
    | "AxeHall"       // 1 переброс за бой
    | "Storehouse"    // +1 ресурс при Gather
    | "RelicHall"     // активирует реликвии
    | "Shrine";       // зарезервировано под финальный контент

export type BuildingDefinition = {
    type: BuildingType;
    cost: { timber: number; iron: number; provisions: number };
    description: string;
    effect: string;
    prestigeGain: number; // Prestige за постройку
};

export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {
    WarriorLodge: {
        type: "WarriorLodge",
        cost: { timber: 2, iron: 1, provisions: 0 },
        description: "Warrior Lodge",
        effect: "+1 ⚔ damage when you roll ⚔",
        prestigeGain: 1,
    },
    ShieldHall: {
        type: "ShieldHall",
        cost: { timber: 2, iron: 1, provisions: 0 },
        description: "Shield Hall",
        effect: "Ignore 1 💀 per combat",
        prestigeGain: 1,
    },
    AxeHall: {
        type: "AxeHall",
        cost: { timber: 1, iron: 2, provisions: 0 },
        description: "Axe Hall",
        effect: "1 reroll per combat",
        prestigeGain: 1,
    },
    Storehouse: {
        type: "Storehouse",
        cost: { timber: 3, iron: 0, provisions: 0 },
        description: "Storehouse",
        effect: "+1 resource when Gather",
        prestigeGain: 1,
    },
    RelicHall: {
        type: "RelicHall",
        cost: { timber: 2, iron: 2, provisions: 0 },
        description: "Relic Hall",
        effect: "Activates clan relics",
        prestigeGain: 2,
    },
    Shrine: {
        type: "Shrine",
        cost: { timber: 3, iron: 3, provisions: 0 },
        description: "Shrine",
        effect: "Reserved for final content",
        prestigeGain: 3,
    },
};

/**
 * Получить список всех доступных зданий
 */
export function getAllBuildings(): BuildingDefinition[] {
    return Object.values(BUILDINGS);
}

/**
 * Проверить, может ли игрок построить здание
 */
export function canAffordBuilding(
    building: BuildingDefinition,
    timber: number,
    iron: number,
    provisions: number
): boolean {
    return (
        timber >= building.cost.timber &&
        iron >= building.cost.iron &&
        provisions >= building.cost.provisions
    );
}
