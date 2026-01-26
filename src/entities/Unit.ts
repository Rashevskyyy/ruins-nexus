/**
 * Units - v0.5 Cosmic Frontier
 * 
 * Units provide combat bonuses and can be hired at Base
 * Max 2 units per player
 */

export type UnitType = "assault" | "shield" | "tactical";

export type Unit = {
    id: string;
    type: UnitType;
    name: string;
    description: string;
    emoji: string;
};

export type UnitDefinition = {
    type: UnitType;
    name: string;
    description: string;
    effect: string;
    emoji: string;
    cost: {
        components: number;
        alloys: number;
        materials: number;
    };
};

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
    assault: {
        type: "assault",
        name: "Assault Drone",
        description: "+1 ⚔ in combat",
        effect: "+1 sword per combat",
        emoji: "🤖",
        cost: { components: 2, alloys: 1, materials: 0 },
    },
    shield: {
        type: "shield",
        name: "Shield Bot",
        description: "-1 💀 in combat",
        effect: "Reduce 1 skull per combat",
        emoji: "🛡️",
        cost: { components: 2, alloys: 0, materials: 1 },
    },
    tactical: {
        type: "tactical",
        name: "Tactical Scanner",
        description: "1 free reroll",
        effect: "1 free reroll per combat",
        emoji: "📡",
        cost: { components: 3, alloys: 1, materials: 0 },
    },
};

export const MAX_UNITS = 2;

/**
 * Create a unit instance from type
 */
export function createUnit(type: UnitType): Unit {
    const def = UNIT_DEFINITIONS[type];
    return {
        id: `${type}_${Date.now()}`,
        type,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
    };
}

/**
 * Get all available unit types
 */
export function getAllUnitTypes(): UnitType[] {
    return Object.keys(UNIT_DEFINITIONS) as UnitType[];
}

/**
 * Check if player can afford a unit
 */
export function canAffordUnit(
    unitType: UnitType,
    components: number,
    alloys: number,
    materials: number
): boolean {
    const def = UNIT_DEFINITIONS[unitType];
    return (
        components >= def.cost.components &&
        alloys >= def.cost.alloys &&
        materials >= def.cost.materials
    );
}
