import { Board } from "../board/Board";
import { Phase } from "./Phase";
import type { Player } from "../entities/Player";
import { TileDeck } from "../board/TileDeck";
import type { HexCoord } from "../board/Hex";

export type UIMode = "NONE" | "EXPLORE_TARGETING" | "TILE_PLACEMENT" | "BUILD_MENU" | "CRAFT_MENU";

export type GameState = {
    board: Board;
    players: Player[];
    currentPlayerIndex: number;
    phase: Phase;
    round: number; // full round = all players had a turn
    actionPoints: number; // 2 action slots per turn (Karak 2 rules)
    uiMode: UIMode;

    // Karak 2 rules: each slot = optional Move (before) + optional Action (after)
    // Movement is always BEFORE action, never after!
    // Move without action = slot consumed (wasted)
    movedInCurrentSlot: boolean;
    actionUsedInCurrentSlot: boolean;

    // Tile Deck (40 T1 + 20 T2 + Final Tile)
    tileDeck: TileDeck;

    // Tile placement (for Explore)
    pendingTileTier?: number;
    pendingTileRotation: number; // 0-5 (0° - 300°, step 60°)
    selectedPlacementPosition: HexCoord | null;

    // Event log (last 10 events for UI)
    eventLog: string[];

    // Final Phase (v0.5: Variant B - Final Trial)
    isFinalPhase: boolean;
    isFinalPreparation: boolean;     // v0.5: FINAL_PREPARATION state (4 rounds)
    finalPrepRoundsLeft: number;     // v0.5: 4 rounds countdown for preparation
    finalRoundsLeft: number;         // Legacy: 6 rounds after Final Tile (now unused in v0.5)
    finalThreatHp: number;           // Legacy: shared boss HP (now unused in v0.5)
    gameOver: boolean;
    winnerId: string | null;
    missionFailed: boolean;          // true if mission failed
    
    // v0.5: Final Trial
    finalTrialStarted: boolean;      // true when all players do Final Trial
    finalTrialResults: { playerId: string; score: number }[]; // All players' trial results
    
    // Reward Choice (v0.4) - after defeating monster, player chooses reward
    pendingRewardChoice: {
        playerId: string;
        monsterTier: number;
        standardReward: { prestige: number; tokens: string[]; components: number };
    } | null;
};

export function createInitialState(): GameState {
    const board = Board.createInitial();

    const players: Player[] = Array.from({ length: 4 }).map((_, i) => ({
        id: `P${i + 1}`,
        position: { q: 0, r: 0 },
        hp: 5,
        maxHp: 5,
        raceId: null, // Set in lobby before game starts
        biomass: 0,
        materials: 0,
        alloys: 0,
        components: 0, // v0.5: crafting components
        inventory: {
            weapons: [null, null, null, null],
            spells: [null, null, null, null],
            amulet: null,
        },
        modules: [],
        units: [null, null], // v0.5: 2 unit slots
        prestige: 0,
        basePosition: null,
        pendingTokens: [],
        forgeDiscountUsed: false,
        voidFreeMoveUsed: false,
        recallUsedThisPhase: false,  // v0.5
        orbitalHangarUsed: false,    // v0.5
        finalTrialScore: null,       // v0.5
    }));

    return {
        board,
        players,
        currentPlayerIndex: 0,
        phase: Phase.AwaitInput,
        round: 1,
        actionPoints: 2,
        uiMode: "NONE",
        movedInCurrentSlot: false,
        actionUsedInCurrentSlot: false,
        tileDeck: new TileDeck(),
        pendingTileRotation: 0,
        selectedPlacementPosition: null,
        eventLog: [],
        // Final Phase (v0.5: Variant B)
        isFinalPhase: false,
        isFinalPreparation: false,
        finalPrepRoundsLeft: 0,
        finalRoundsLeft: 0,
        finalThreatHp: 0,
        gameOver: false,
        winnerId: null,
        missionFailed: false,
        // v0.5: Final Trial
        finalTrialStarted: false,
        finalTrialResults: [],
        // Reward choice
        pendingRewardChoice: null,
    };
}
