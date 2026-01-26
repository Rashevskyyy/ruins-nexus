import { Board } from "../board/Board";
import { Phase } from "./Phase";
import type { Player } from "../entities/Player";
import { TileDeck } from "../board/TileDeck";
import type { HexCoord } from "../board/Hex";
import { type ModifierId, type GameModifier, GAME_MODIFIERS, getRandomModifier, ASYMMETRIC_BONUSES, getRiskyTilesCount } from "./GameModifiers";

export type UIMode = "NONE" | "EXPLORE_TARGETING" | "TILE_PLACEMENT" | "BUILD_MENU" | "CRAFT_MENU";

export type GameState = {
    board: Board;
    players: Player[];
    currentPlayerIndex: number;
    phase: Phase;
    round: number; // full round = all players had a turn
    actionPoints: number; // 2 action slots per turn (Karak 2 rules)
    uiMode: UIMode;
    
    // v0.5: Game Modifier (selected at lobby or random)
    modifierId: ModifierId;
    componentMultiplier: number; // For component rewards (1.0 = normal)

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

/**
 * Create initial game state
 * @param playerCount - Number of players (1-4), defaults to 4
 * @param modifierId - Game modifier (default: random)
 */
export function createInitialState(playerCount: number = 4, modifierId?: ModifierId): GameState {
    // Clamp player count to 1-4
    const count = Math.max(1, Math.min(4, playerCount));
    
    // Select modifier (random if not specified)
    const selectedModifierId = modifierId ?? getRandomModifier();
    const modifier = GAME_MODIFIERS[selectedModifierId];
    
    // Create board with starting sectors for each player (randomized positions)
    const board = Board.createForGame(count);
    
    // Get starting positions from the board (must match the random positions created above)
    const startingPositions = Board.getStartingPositions(count, board);

    // Create players with modifier bonuses
    const players: Player[] = Array.from({ length: count }).map((_, i) => {
        const startPos = startingPositions[i];
        
        // Base stats
        let hp = 5;
        let maxHp = 5;
        let biomass = 0;
        let materials = 0;
        let alloys = 0;
        
        // v0.5: Asymmetric Start modifier
        if (modifier.asymmetricStart) {
            const bonus = ASYMMETRIC_BONUSES[i % ASYMMETRIC_BONUSES.length];
            if (bonus.resource === "biomass") biomass += 1;
            if (bonus.resource === "materials") materials += 1;
            if (bonus.resource === "alloys") alloys += 1;
            if (bonus.hp) {
                hp += bonus.hp;
                maxHp += bonus.hp;
            }
        }
        
        return {
            id: `P${i + 1}`,
            position: startPos, // Start in own sector, not hub
            hp,
            maxHp,
            raceId: null, // Set in lobby before game starts
            raceOption: null, // Set in lobby (A or B)
            biomass,
            materials,
            alloys,
            components: 0, // v0.5: crafting components
            inventory: {
                weapons: [null, null],     // v0.5: 2 weapon slots
                spells: [null, null],      // v0.5: 2 module slots
                amulet: null,              // v0.5: 1 amulet slot
            },
            modules: [],
            units: [null, null], // v0.5: 2 unit slots
            prestige: 0,
            basePosition: null, // Players must BUILD their base (not automatic)
            pendingTokens: [],
            // Race flags (v0.5)
            forgeDiscountUsed: false,
            forgeCraftFreeUsed: false,
            forgeSalvageBonusUsed: false,
            voidFreeMoveUsed: false,
            voidPhaseStepAvailable: false,
            voidRecallsRemaining: 1, // Default 1, becomes 2 if Void+OptionB
            warboundBattleRushAvailable: false,
            chronoRerollUsed: false,
            nomadGatherBonusUsed: false,
            nomadScoutBonusUsed: false,
            // Other flags
            recallUsedThisPhase: false,  // v0.5
            orbitalHangarUsed: false,    // v0.5
            finalTrialScore: null,       // v0.5
            pushedBackFromTile: null,    // v0.5: Combat retry restriction
            underdogBonusUsed: false,    // v0.5: Underdog Bonus
        };
    });
    
    // Get risky tiles count from modifier
    const riskyTiles = getRiskyTilesCount(modifier);

    return {
        board,
        players,
        currentPlayerIndex: 0,
        phase: Phase.AwaitInput,
        round: 1,
        actionPoints: 2,
        uiMode: "NONE",
        // v0.5: Game Modifier
        modifierId: selectedModifierId,
        componentMultiplier: modifier.componentMultiplier ?? 1.0,
        movedInCurrentSlot: false,
        actionUsedInCurrentSlot: false,
        tileDeck: new TileDeck(riskyTiles.tier1, riskyTiles.tier2),
        pendingTileRotation: 0,
        selectedPlacementPosition: null,
        eventLog: [`🎛️ Modifier: ${modifier.name}`],
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
