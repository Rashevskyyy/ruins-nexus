import type { HexCoord } from "../board/Hex";

export type GameEventType = "environmental" | "competitive" | "crisis";

export type GameEventEffects = {
    combatSkullModifier?: number;
    combatComponentBonus?: number;
    combatPrestigeBonus?: number;
    moveCost?: number;
    gatherBonus?: number;
    buildDisabled?: boolean;
    craftDisabled?: boolean;
    exploreBonusResource?: number;
    orbitalHangarDisabled?: boolean;
    equipmentPenalty?: number;
    monsterTierBonus?: number;
    addRiskyTiles?: number;
    enterRiskyPrestigeBonus?: number;
};

export type GameEventReward = {
    condition: string;
    prestige?: number;
    components?: number;
};

export type GameEvent = {
    id: string;
    name: string;
    description: string;
    type: GameEventType;
    duration: number;
    triggerRound: number;
    activeUntilRound: number;
    effects: GameEventEffects;
    rewards?: GameEventReward;
};

export type EventProgress = {
    meteorShowerRewardClaimed: boolean;
    resourceRush: {
        totalsByPlayer: Record<string, number>;
        firstWinnerId: string | null;
        secondWinnerId: string | null;
    };
    monsterBounty: {
        remainingKills: number;
        firstKillClaimed: boolean;
    };
    constructionRaceClaimed: boolean;
    techBreakthroughUsedBy: string[];
    systemMalfunctionHealUsed: boolean;
    volcanicEruption: {
        riskyTiles: HexCoord[];
        rewardClaimed: boolean;
    };
};

const shuffle = <T>(items: T[]): T[] => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const buildEvent = (event: Omit<GameEvent, "triggerRound" | "activeUntilRound">): GameEvent => ({
    ...event,
    triggerRound: 0,
    activeUntilRound: 0,
});

export const EVENT_TRIGGER_ROUNDS = [8, 12, 16, 20];

export const createEventDeck = (): GameEvent[] =>
    shuffle([
        // Environmental Events
        buildEvent({
            id: "meteor_shower",
            name: "☄️ Meteor Shower",
            description: "Open tiles with no allies hit harder. First monster defeated: +2 🧩.",
            type: "environmental",
            duration: 1,
            effects: { combatSkullModifier: 1 },
            rewards: { condition: "First monster defeated", components: 2 },
        }),
        buildEvent({
            id: "gravity_storm",
            name: "🌪️ Gravity Storm",
            description: "All Move actions consume a slot. All Gather gain +1 resource.",
            type: "environmental",
            duration: 2,
            effects: { moveCost: 1, gatherBonus: 1 },
        }),
        buildEvent({
            id: "cryo_freeze",
            name: "❄️ Cryo Freeze",
            description: "Build and Craft disabled. All combats grant +1 🧩.",
            type: "environmental",
            duration: 1,
            effects: { buildDisabled: true, craftDisabled: true, combatComponentBonus: 1 },
        }),
        buildEvent({
            id: "volcanic_eruption",
            name: "🌋 Volcanic Eruption",
            description: "3 random tiles become Toxic. First to enter a new Toxic tile: +3 Prestige.",
            type: "environmental",
            duration: 1,
            effects: { addRiskyTiles: 3, enterRiskyPrestigeBonus: 3 },
        }),
        buildEvent({
            id: "ion_storm",
            name: "⚡ Ion Storm",
            description: "Explore grants +1 random resource. Equipment bonuses -1 this round.",
            type: "environmental",
            duration: 1,
            effects: { exploreBonusResource: 1, equipmentPenalty: 1 },
        }),
        buildEvent({
            id: "tectonic_shift",
            name: "🪨 Tectonic Shift",
            description: "Movement is taxing (+1 slot). Builds are blocked this round.",
            type: "environmental",
            duration: 1,
            effects: { moveCost: 1, buildDisabled: true },
        }),
        buildEvent({
            id: "hazard_bloom",
            name: "🧪 Hazard Bloom",
            description: "New threats intensify: unrevealed tiles get +1 monster tier this round.",
            type: "environmental",
            duration: 1,
            effects: { monsterTierBonus: 1 },
        }),
        // Competitive Events
        buildEvent({
            id: "resource_rush",
            name: "🏆 Resource Rush",
            description: "First to gather 8 total resources: +3 Prestige. Second: +1 Prestige.",
            type: "competitive",
            duration: 2,
            effects: {},
            rewards: { condition: "Gather 8 total resources", prestige: 3 },
        }),
        buildEvent({
            id: "monster_bounty",
            name: "⚔️ Monster Bounty",
            description: "Next 2 Tier 3+ kills grant x2 rewards. First kill: +2 🧩.",
            type: "competitive",
            duration: 2,
            effects: {},
            rewards: { condition: "First Tier 3+ kill", components: 2 },
        }),
        buildEvent({
            id: "construction_race",
            name: "🏗️ Construction Race",
            description: "First to build a module: -1 module cost forever.",
            type: "competitive",
            duration: 2,
            effects: {},
        }),
        buildEvent({
            id: "tech_breakthrough",
            name: "🔬 Tech Breakthrough",
            description: "Next craft for each player costs -1 🧩 (once each).",
            type: "competitive",
            duration: 2,
            effects: {},
        }),
        buildEvent({
            id: "expedition_rally",
            name: "🛰️ Expedition Rally",
            description: "Explore actions grant +1 random resource this round.",
            type: "competitive",
            duration: 1,
            effects: { exploreBonusResource: 1 },
        }),
        // Crisis Events
        buildEvent({
            id: "monster_swarm",
            name: "👾 Monster Swarm",
            description: "All unrevealed tiles +1 tier until end of game. Victories give +1 Prestige.",
            type: "crisis",
            duration: 99,
            effects: { monsterTierBonus: 1, combatPrestigeBonus: 1 },
        }),
        buildEvent({
            id: "orbital_debris",
            name: "🛸 Orbital Debris",
            description: "Orbital Hangar disabled. Explore grants +1 random resource.",
            type: "crisis",
            duration: 2,
            effects: { orbitalHangarDisabled: true, exploreBonusResource: 1 },
        }),
        buildEvent({
            id: "system_malfunction",
            name: "⚠️ System Malfunction",
            description: "Equipment effects -1. First Heal is free.",
            type: "crisis",
            duration: 1,
            effects: { equipmentPenalty: 1 },
        }),
        buildEvent({
            id: "death_zone_expansion",
            name: "💀 Death Zone Expansion",
            description: "2 open tiles become Toxic permanently. Players on them gain +2 🧩 immediately.",
            type: "crisis",
            duration: 1,
            effects: { addRiskyTiles: 2 },
        }),
    ]);
