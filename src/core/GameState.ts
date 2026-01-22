import { Board } from "../board/Board";
import { Phase } from "./Phase";
import type { Player } from "../entities/Player";

export type GameState = {
    board: Board;
    players: Player[];
    currentPlayerIndex: number;
    phase: Phase;
    round: number; // полный круг по всем игрокам
    actionPoints: number;
    selectedAction: "PRIMARY" | "GATHER" | "EXPLORE" | "SETTLEMENT";

};

export function createInitialState(): GameState {
    const board = Board.createInitial();

    const players: Player[] = Array.from({ length: 4 }).map((_, i) => ({
        id: `P${i + 1}`,
        position: { q: 0, r: 0 },
        hp: 5,
        provisions: 0,
        timber: 0,
        iron: 0,
    }));

    return {
        board,
        players,
        currentPlayerIndex: 0,
        phase: Phase.AwaitInput,
        round: 1,
        actionPoints: 2,
        selectedAction: "PRIMARY",
    };
}
