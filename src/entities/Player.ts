import type { HexCoord } from "../board/Hex";

export type Player = {
    id: string;
    position: HexCoord;
    hp: number;

    provisions: number;
    timber: number;
    iron: number;
};
