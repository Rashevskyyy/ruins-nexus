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
    round: number; // полный круг по всем игрокам
    actionPoints: number; // 2 "слота действий" (по правилам Karak 2)
    uiMode: UIMode;
    
    // По правилам Karak 2: каждый слот = optional Move (перед) + optional Action (после)
    // Movement всегда ПЕРЕД action, никогда после!
    // Move без action = "пропуск слота" (слот всё равно тратится)
    movedInCurrentSlot: boolean;
    actionUsedInCurrentSlot: boolean;

    // NEW: Колода тайлов (40 Tier 1 + 20 Tier 2 + Final Tile)
    tileDeck: TileDeck;

    // Tile placement (для Explore)
    pendingTileTier?: number; // tier тайла, который нужно разместить
    pendingTileRotation: number; // 0-5 (0° - 300°, шаг 60°)
    selectedPlacementPosition: HexCoord | null; // Выбранная позиция для размещения (hover)

    // Event log (последние события для UI)
    eventLog: string[]; // последние 10 событий
    
    // Final Phase
    isFinalPhase: boolean;        // триггерится когда вытянут Final Tile
    finalPhaseRoundsLeft: number; // сколько раундов до конца игры (обычно 2)
    gameOver: boolean;            // игра завершена
    winnerId: string | null;      // ID победителя
};

export function createInitialState(): GameState {
    const board = Board.createInitial();

    const players: Player[] = Array.from({ length: 4 }).map((_, i) => ({
        id: `P${i + 1}`,
        position: { q: 0, r: 0 },
        hp: 5,
        maxHp: 5,
        provisions: 0,
        timber: 0,
        iron: 0,
        inventory: {
            weapons: [null, null, null, null],
            spells: [null, null, null, null],
            amulet: null,
        },
        buildings: [],
        prestige: 0, // Очки победы
        outpostPosition: null, // Город (только 1)
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
        finalPhaseRoundsLeft: 0,
        gameOver: false,
        winnerId: null,
    };
}
