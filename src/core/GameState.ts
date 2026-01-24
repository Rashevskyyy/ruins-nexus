import { Board } from "../board/Board";
import { Phase } from "./Phase";
import type { Player } from "../entities/Player";
import { TileDeck } from "../board/TileDeck";
import type { HexCoord } from "../board/Hex";

export type UIMode = "NONE" | "EXPLORE_TARGETING" | "TILE_PLACEMENT" | "BUILD_MENU";

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

    // Final Phase
    isFinalPhase: boolean;
    finalRoundsLeft: number; // 6 rounds after Final Tile
    finalThreatHp: number;   // 40 HP shared boss
    gameOver: boolean;
    winnerId: string | null;
    missionFailed: boolean;  // true if Final Threat survives countdown
};

export function createInitialState(): GameState {
    const board = Board.createInitial();

    const players: Player[] = Array.from({ length: 4 }).map((_, i) => ({
        id: `P${i + 1}`,
        position: { q: 0, r: 0 },
        hp: 5,
        maxHp: 5,
        biomass: 0,
        materials: 0,
        alloys: 0,
        inventory: {
            weapons: [null, null, null, null],
            spells: [null, null, null, null],
            amulet: null,
        },
        modules: [],
        prestige: 0,
        basePosition: null,
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
        // Final Phase
        isFinalPhase: false,
        finalRoundsLeft: 0,
        finalThreatHp: 0, // Set to 40 when Final Tile is revealed
        gameOver: false,
        winnerId: null,
        missionFailed: false,
    };
}
