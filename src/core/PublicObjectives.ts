import type { Player } from "../entities/Player";
import type { GameState } from "./GameState";

export type ObjectivePhase = "early" | "mid" | "late";

export type PublicObjectiveReward = {
    prestige?: number;
    components?: number;
    permanent?: {
        gatherBonus?: number;
        combatBonus?: number;
        finalTrialBonus?: number;
    };
};

export type PublicObjective = {
    id: string;
    name: string;
    description: string;
    phase: ObjectivePhase;
    reward: PublicObjectiveReward;
    completed: boolean;
    completedBy?: string;
    completedAt?: number;
    completedAtRound?: number;
};

export type PublicObjectiveDefinition = Omit<PublicObjective, "completed" | "completedBy" | "completedAt" | "completedAtRound"> & {
    condition: (player: Player, state: GameState) => boolean;
};

export const PUBLIC_OBJECTIVE_DEFINITIONS: PublicObjectiveDefinition[] = [
    {
        id: "pioneer",
        name: "🗺️ Pioneer",
        description: "First to reveal 5 tiles",
        phase: "early",
        reward: { prestige: 2 },
        condition: (player) => player.tilesExplored >= 5,
    },
    {
        id: "first_blood",
        name: "💪 First Blood",
        description: "First to defeat a Tier 2+ monster",
        phase: "early",
        reward: { components: 2 },
        condition: (player) => player.monstersDefeatedTier2Plus >= 1,
    },
    {
        id: "architect",
        name: "🏗️ Architect",
        description: "First to build a base",
        phase: "early",
        reward: { permanent: { gatherBonus: 1 } },
        condition: (player) => player.basePosition !== null,
    },
    {
        id: "industrialist",
        name: "⚙️ Industrialist",
        description: "First to have 3 modules",
        phase: "mid",
        reward: { prestige: 3 },
        condition: (player) => player.modules.length >= 3,
    },
    {
        id: "veteran",
        name: "🎖️ Veteran",
        description: "First to defeat 3 Tier 3+ monsters",
        phase: "mid",
        reward: { components: 3 },
        condition: (player) => player.monstersDefeatedTier3Plus >= 3,
    },
    {
        id: "tycoon",
        name: "💰 Tycoon",
        description: "First to gather 15 resources total",
        phase: "mid",
        reward: { permanent: { gatherBonus: 2 } },
        condition: (player) => player.resourcesGathered >= 15,
    },
    {
        id: "tech_leader",
        name: "🔬 Tech Leader",
        description: "First to craft 4 items",
        phase: "late",
        reward: { prestige: 4 },
        condition: (player) => player.itemsCrafted >= 4,
    },
    {
        id: "prestige_master",
        name: "🌟 Prestige Master",
        description: "First to reach 12 Prestige",
        phase: "late",
        reward: { permanent: { combatBonus: 1 } },
        condition: (player) => player.prestige >= 12,
    },
    {
        id: "final_preparation",
        name: "⭐ Final Preparation",
        description: "First to fill all 5 equipment slots",
        phase: "late",
        reward: { permanent: { finalTrialBonus: 2 } },
        condition: (player) => {
            const weaponsFull = player.inventory.weapons.every(Boolean);
            const spellsFull = player.inventory.spells.every(Boolean);
            const amuletFull = Boolean(player.inventory.amulet);
            return weaponsFull && spellsFull && amuletFull;
        },
    },
];

export const PUBLIC_OBJECTIVE_DEFINITION_MAP = new Map(
    PUBLIC_OBJECTIVE_DEFINITIONS.map((objective) => [objective.id, objective]),
);

export function getPublicObjectivePhase(round: number): ObjectivePhase {
    if (round <= 10) return "early";
    if (round <= 20) return "mid";
    return "late";
}

export function createPublicObjectivesForPhase(phase: ObjectivePhase): PublicObjective[] {
    return PUBLIC_OBJECTIVE_DEFINITIONS
        .filter((objective) => objective.phase === phase)
        .map((objective) => ({
            id: objective.id,
            name: objective.name,
            description: objective.description,
            phase: objective.phase,
            reward: objective.reward,
            completed: false,
        }));
}
