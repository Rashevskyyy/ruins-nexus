/**
 * Race System - Cosmic Frontier v0.4
 * 
 * Each player selects a Race before the game starts.
 * Each race provides 1 passive ability.
 */

export type RaceId = "bioform" | "forge" | "void" | "warbound";

export type Race = {
    id: RaceId;
    name: string;
    emoji: string;
    description: string;
    passiveDescription: string;
};

// ========================================
// RACE DEFINITIONS
// ========================================

export const RACES: Record<RaceId, Race> = {
    bioform: {
        id: "bioform",
        name: "Bioform Collective",
        emoji: "🧬",
        description: "Survivability, stability",
        passiveDescription: "Ignore the first 💀 in every combat",
    },
    forge: {
        id: "forge",
        name: "Forge Syndicate",
        emoji: "🧱",
        description: "Economy, infrastructure",
        passiveDescription: "First Build action costs −1 🧱 Materials",
    },
    void: {
        id: "void",
        name: "Void Navigators",
        emoji: "⚙",
        description: "Mobility, positioning",
        passiveDescription: "Once per turn, one Move does not consume a slot",
    },
    warbound: {
        id: "warbound",
        name: "Warbound Legion",
        emoji: "🔥",
        description: "Aggression, momentum",
        passiveDescription: "If you deal ≥1 ⚔ in combat, deal +1 ⚔",
    },
};

export const RACE_LIST: Race[] = Object.values(RACES);

/**
 * Get random race (for "Random" selection)
 */
export function getRandomRace(excludeIds: RaceId[] = []): Race {
    const available = RACE_LIST.filter(r => !excludeIds.includes(r.id));
    if (available.length === 0) return RACE_LIST[0];
    return available[Math.floor(Math.random() * available.length)];
}
