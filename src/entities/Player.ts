import type { HexCoord } from "../board/Hex";
import type { Item } from "./Item";
import type { BuildingType } from "./BuildingType";

export type Player = {
    id: string;
    position: HexCoord;
    hp: number;
    maxHp: number; // для отрисовки всех слотов HP

    provisions: number;
    timber: number;
    iron: number;

    // Hero Board
    inventory: {
        weapons: (Item | null)[]; // 4 слота
        spells: (Item | null)[];  // 4 слота
        amulet: Item | null;      // 1 слот
    };
    buildings: BuildingType[]; // построенные районы в городе
    
    // Prestige - очки победы
    // Начисляются за: победу над монстрами, постройки, исследование Tier II
    prestige: number;
    
    // Outpost (город) - только 1 на игрока
    outpostPosition: HexCoord | null;
};
