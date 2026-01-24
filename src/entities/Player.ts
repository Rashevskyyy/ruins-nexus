import type { HexCoord } from "../board/Hex";
import type { Item } from "./Item";
import type { ModuleType } from "./BuildingType";

export type Player = {
    id: string;
    position: HexCoord;
    hp: number;
    maxHp: number; // для отрисовки всех слотов HP

    // Resources (Cosmic Frontier theme)
    biomass: number;   // 🧬 healing/support, crew upkeep
    materials: number; // 🧱 base modules, infrastructure
    alloys: number;    // ⚙ advanced modules, upgrades

    // Hero Board
    inventory: {
        weapons: (Item | null)[]; // 4 слота
        spells: (Item | null)[];  // 4 слота
        amulet: Item | null;      // 1 слот
    };
    
    // Built modules in player's Base
    modules: ModuleType[];
    
    // Prestige - victory points
    prestige: number;
    
    // Base (only 1 per player)
    basePosition: HexCoord | null;
};
