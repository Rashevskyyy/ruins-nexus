/**
 * Game Modifiers - v0.5
 * 
 * Modifiers change game rules for variety and replayability.
 * One modifier is randomly selected at game start.
 */

export type ModifierId = "none" | "asymmetric_start" | "high_risk" | "extreme_risk" | "scarce_components" | "harsh_components";

export type GameModifier = {
    id: ModifierId;
    name: string;
    description: string;
    emoji: string;
    // Effects
    riskyTilesCount?: number;      // Override risky tiles (default 3)
    componentMultiplier?: number;  // Multiply component rewards (1.0 = normal)
    asymmetricStart?: boolean;     // Give players different starting bonuses
};

export const GAME_MODIFIERS: Record<ModifierId, GameModifier> = {
    none: {
        id: "none",
        name: "Standard",
        description: "Normal game rules",
        emoji: "⚖️",
    },
    asymmetric_start: {
        id: "asymmetric_start",
        name: "Asymmetric Start",
        description: "Players start with different bonuses (+1 resource or +1 HP)",
        emoji: "🎲",
        asymmetricStart: true,
    },
    high_risk: {
        id: "high_risk",
        name: "High Risk Planet",
        description: "5 Risky Tiles instead of 3",
        emoji: "☣️",
        riskyTilesCount: 5,
    },
    extreme_risk: {
        id: "extreme_risk",
        name: "Extreme Risk",
        description: "6 Risky Tiles - very dangerous!",
        emoji: "💀",
        riskyTilesCount: 6,
    },
    scarce_components: {
        id: "scarce_components",
        name: "Scarce Components",
        description: "30 total components instead of 36",
        emoji: "🧩",
        componentMultiplier: 0.83, // ~30/36
    },
    harsh_components: {
        id: "harsh_components",
        name: "Harsh Economy",
        description: "26 total components - brutal scarcity!",
        emoji: "💎",
        componentMultiplier: 0.72, // ~26/36
    },
};

/**
 * Get a random modifier for the game
 * Excludes "none" from random selection
 */
export function getRandomModifier(): ModifierId {
    const modifierIds: ModifierId[] = [
        "asymmetric_start",
        "high_risk",
        // "extreme_risk", // Too hard for random
        "scarce_components",
        // "harsh_components", // Too hard for random
    ];
    
    const randomIndex = Math.floor(Math.random() * modifierIds.length);
    return modifierIds[randomIndex];
}

/**
 * Get all available modifiers for lobby selection
 */
export function getAllModifiers(): GameModifier[] {
    return Object.values(GAME_MODIFIERS);
}

/**
 * Asymmetric start bonuses for each player position
 */
export const ASYMMETRIC_BONUSES: { resource?: "biomass" | "materials" | "alloys"; hp?: number }[] = [
    { resource: "biomass" },    // P1: +1 Biomass
    { resource: "materials" },  // P2: +1 Materials
    { resource: "alloys" },     // P3: +1 Alloys
    { hp: 1 },                  // P4: +1 HP
];

/**
 * Get risky tiles count based on modifier
 */
export function getRiskyTilesCount(modifier: GameModifier): { tier1: number; tier2: number } {
    const total = modifier.riskyTilesCount ?? 3;
    
    // Default distribution: 2 T1 + 1 T2
    // High Risk (5): 3 T1 + 2 T2
    // Extreme (6): 4 T1 + 2 T2
    switch (total) {
        case 5:
            return { tier1: 3, tier2: 2 };
        case 6:
            return { tier1: 4, tier2: 2 };
        default:
            return { tier1: 2, tier2: 1 };
    }
}
