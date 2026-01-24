/**
 * Modules - Cosmic Frontier base upgrades
 * Universal for all players (board-game friendly)
 */

export type ModuleType =
    | "AssaultBay"      // +1 ⚔ when roll has ⚔
    | "ShieldArray"     // ignore 1 💀
    | "TacticalUplink"  // 1 reroll per combat
    | "SupplyDepot"     // +1 resource on Gather
    | "RelicVault"      // activates relic system (future)
    | "BeaconSpire";    // reserved for final content

export type ModuleDefinition = {
    type: ModuleType;
    cost: { materials: number; alloys: number; biomass: number };
    description: string;
    effect: string;
    prestigeGain: number;
};

export const MODULES: Record<ModuleType, ModuleDefinition> = {
    AssaultBay: {
        type: "AssaultBay",
        cost: { materials: 2, alloys: 1, biomass: 0 },
        description: "Assault Bay",
        effect: "+1 ⚔ damage when you roll ⚔",
        prestigeGain: 1,
    },
    ShieldArray: {
        type: "ShieldArray",
        cost: { materials: 2, alloys: 1, biomass: 0 },
        description: "Shield Array",
        effect: "Ignore 1 💀 per combat",
        prestigeGain: 1,
    },
    TacticalUplink: {
        type: "TacticalUplink",
        cost: { materials: 1, alloys: 2, biomass: 0 },
        description: "Tactical Uplink",
        effect: "1 reroll per combat",
        prestigeGain: 1,
    },
    SupplyDepot: {
        type: "SupplyDepot",
        cost: { materials: 3, alloys: 0, biomass: 0 },
        description: "Supply Depot",
        effect: "+1 resource when Gather",
        prestigeGain: 1,
    },
    RelicVault: {
        type: "RelicVault",
        cost: { materials: 2, alloys: 2, biomass: 0 },
        description: "Relic Vault",
        effect: "Activates relic system (future)",
        prestigeGain: 2,
    },
    BeaconSpire: {
        type: "BeaconSpire",
        cost: { materials: 3, alloys: 3, biomass: 0 },
        description: "Beacon Spire",
        effect: "Reserved for final content hooks",
        prestigeGain: 3,
    },
};

// Legacy aliases for compatibility
export type BuildingType = ModuleType;
export const BUILDINGS = MODULES;
export type BuildingDefinition = ModuleDefinition;

/**
 * Get all available modules
 */
export function getAllModules(): ModuleDefinition[] {
    return Object.values(MODULES);
}

/**
 * Check if player can afford a module
 */
export function canAffordModule(
    module: ModuleDefinition,
    materials: number,
    alloys: number,
    biomass: number
): boolean {
    return (
        materials >= module.cost.materials &&
        alloys >= module.cost.alloys &&
        biomass >= module.cost.biomass
    );
}

// Legacy alias
export const canAffordBuilding = canAffordModule;
