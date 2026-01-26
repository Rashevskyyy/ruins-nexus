import type { HexCoord } from "../board/Hex";
import type { Item } from "./Item";
import type { ModuleType } from "./BuildingType";
import type { TokenType } from "../board/TileDeck";
import type { RaceId } from "./Race";
import type { Unit } from "./Unit";

export type Player = {
    id: string;
    position: HexCoord;
    hp: number;
    maxHp: number; // для отрисовки всех слотов HP

    // Race (v0.4)
    raceId: RaceId | null;

    // Resources (Cosmic Frontier theme)
    biomass: number;   // 🧬 healing/support, crew upkeep
    materials: number; // 🧱 base modules, infrastructure
    alloys: number;    // ⚙ advanced modules, upgrades
    components: number; // 🧩 crafting components (from monster kills)

    // Hero Board
    inventory: {
        weapons: (Item | null)[]; // 4 слота
        spells: (Item | null)[];  // 4 слота
        amulet: Item | null;      // 1 слот
    };
    
    // Built modules in player's Base
    modules: ModuleType[];
    
    // v0.5: Units (max 2)
    units: (Unit | null)[];
    
    // Prestige - victory points
    prestige: number;
    
    // Base (only 1 per player)
    basePosition: HexCoord | null;
    
    // Pending token rewards (player must choose items)
    pendingTokens: TokenType[];

    // Race passive flags (v0.4)
    forgeDiscountUsed: boolean;     // Forge Syndicate: first build -1 material
    voidFreeMoveUsed: boolean;      // Void Navigators: once per turn free move
    
    // v0.5: Orbital Phase
    recallUsedThisPhase: boolean;   // Can only recall to base once per Orbital Phase
    
    // v0.5: Orbital Hangar
    orbitalHangarUsed: boolean;     // Can only use Orbital Hangar once per game
    
    // v0.5: Final Trial
    finalTrialScore: number | null; // Result of player's Final Trial attempt
};
