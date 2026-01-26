/**
 * Race System - Cosmic Frontier v0.5
 * 
 * Each player selects a Race AND an Option (A or B) before the game starts.
 * Each race provides:
 * - 1 passive ability (always active)
 * - Choice between Option A or B (selected at lobby)
 */

export type RaceId = "bioform" | "forge" | "void" | "warbound" | "chrono" | "nomad";
export type RaceOption = "A" | "B";

export type Race = {
    id: RaceId;
    name: string;
    emoji: string;
    description: string;
    passiveDescription: string;
    optionA: {
        name: string;
        description: string;
    };
    optionB: {
        name: string;
        description: string;
    };
};

// ========================================
// RACE DEFINITIONS (v0.5)
// ========================================

export const RACES: Record<RaceId, Race> = {
    bioform: {
        id: "bioform",
        name: "Bioform Collective",
        emoji: "🧬",
        description: "Survivability, stability. Best for beginners.",
        passiveDescription: "Ignore the first 💀 in every combat",
        optionA: {
            name: "Hardened Shell",
            description: "+1 max HP (start with 6 HP)",
        },
        optionB: {
            name: "Regeneration",
            description: "Heal +1 HP after each monster kill",
        },
    },
    forge: {
        id: "forge",
        name: "Forge Syndicate",
        emoji: "🔨",
        description: "Economy, infrastructure. For crafting builds.",
        passiveDescription: "First Base or Module build costs −1 🧱",
        optionA: {
            name: "Master Crafter",
            description: "Craft costs 0 AP (once per turn)",
        },
        optionB: {
            name: "Salvage Expert",
            description: "+1 🧩 on first Tier 2+ monster kill",
        },
    },
    void: {
        id: "void",
        name: "Void Navigators",
        emoji: "🌀",
        description: "Mobility, positioning. For exploration builds.",
        passiveDescription: "1 Move per turn doesn't consume a slot",
        optionA: {
            name: "Phase Step",
            description: "After Explore, can Move for free",
        },
        optionB: {
            name: "Warp Beacon",
            description: "Recall to Base available 2 times per game",
        },
    },
    warbound: {
        id: "warbound",
        name: "Warbound Legion",
        emoji: "⚔️",
        description: "Aggression, momentum. For combat builds.",
        passiveDescription: "If rolled at least 1 ⚔ → +1 ⚔",
        optionA: {
            name: "Monster Hunter",
            description: "+1 ⚔ against Tier 3+ monsters",
        },
        optionB: {
            name: "Battle Rush",
            description: "After defeating monster, can Move for free",
        },
    },
    chrono: {
        id: "chrono",
        name: "Chrono Ascendants",
        emoji: "⏳",
        description: "Control, intelligence. For anti-RNG builds.",
        passiveDescription: "Once per turn, reroll 1 die (doesn't count as system reroll)",
        optionA: {
            name: "Temporal Shield",
            description: "First 💀 in combat becomes 0",
        },
        optionB: {
            name: "Safe Retreat",
            description: "On pushback, don't take damage",
        },
    },
    nomad: {
        id: "nomad",
        name: "Nomad Consortium",
        emoji: "🏕️",
        description: "Adaptation, flexibility. For exploration builds.",
        passiveDescription: "First Gather each turn gives +1 of any resource",
        optionA: {
            name: "Hazard Resistant",
            description: "Can Gather on Risky Tiles without penalty",
        },
        optionB: {
            name: "Scout's Instinct",
            description: "+1 🧩 on first entry to Tier 3+ tile",
        },
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

/**
 * Get random option
 */
export function getRandomOption(): RaceOption {
    return Math.random() < 0.5 ? "A" : "B";
}
