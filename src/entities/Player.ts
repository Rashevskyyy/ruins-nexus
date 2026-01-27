import type { HexCoord } from "../board/Hex";
import type { Item } from "./Item";
import type { ModuleType } from "./BuildingType";
import type { TokenType } from "../board/TileDeck";
import type { RaceId, RaceOption } from "./Race";
import type { Unit } from "./Unit";

export type Player = {
    id: string;
    position: HexCoord;
    hp: number;
    maxHp: number; // для отрисовки всех слотов HP

    // Race (v0.5 - now with option choice)
    raceId: RaceId | null;
    raceOption: RaceOption | null; // A or B, selected at lobby

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

    // ========================================
    // RACE FLAGS (v0.5)
    // ========================================
    
    // Forge Syndicate
    forgeDiscountUsed: boolean;     // Passive: first build -1 material (per game)
    forgeCraftFreeUsed: boolean;    // Option A: free craft this turn
    forgeSalvageBonusUsed: boolean; // Option B: +1🧩 on first T2+ kill (per game)
    
    // Void Navigators
    voidFreeMoveUsed: boolean;      // Passive: free move this turn
    voidPhaseStepAvailable: boolean; // Option A: free move after explore this turn
    voidRecallsRemaining: number;    // Option B: 2 recalls per game (instead of 1)
    
    // Warbound Legion
    warboundBattleRushAvailable: boolean; // Option B: free move after kill this turn
    
    // Chrono Ascendants
    chronoRerollUsed: boolean;      // Passive: 1 free die reroll this turn
    
    // Nomad Consortium
    nomadGatherBonusUsed: boolean;  // Passive: +1 resource on first gather this turn
    nomadScoutBonusUsed: boolean;   // Option B: +1🧩 on first T3+ tile entry (per game)
    
    // ========================================
    // OTHER FLAGS
    // ========================================
    
    // v0.5: Orbital Phase
    recallUsedThisPhase: boolean;   // Can only recall to base once per Orbital Phase
    
    // v0.5: Orbital Hangar
    orbitalHangarUsed: boolean;     // Can only use Orbital Hangar once per game
    
    // v0.5: Final Trial
    finalTrialScore: number | null; // Result of player's Final Trial attempt
    
    // v0.5: Combat retry restriction
    pushedBackFromTile: HexCoord | null; // Tile player was pushed back from this turn (can't retry)
    
    // v0.5: Underdog Bonus
    underdogBonusUsed: boolean; // +1🧩 on first Tier 3+ kill if lowest prestige
    
    // v0.5: Heavy Cannon penalty
    heavyCannonPenaltyApplied: boolean; // First move costs extra this turn
};
