import type { HexCoord } from "../board/Hex";
import { isNeighbor, neighbors } from "../board/Hex";
import { TileType } from "../board/TileTypes";
import { Phase } from "./Phase";
import type { GameState } from "./GameState";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { SettlementSystem } from "../systems/SettlementSystem";
import { applyRotation, canMoveBetween } from "../board/BlockedEdges";
import type { Tile } from "../board/Tile";
import type { Player } from "../entities/Player";
import { MODULES, type ModuleType, canAffordModule } from "../entities/BuildingType";
import { CraftingSystem, CRAFT_RECIPES, canSpendPrestige, spendPrestige } from "../systems/CraftingSystem";
import { UNIT_DEFINITIONS, createUnit, canAffordUnit, type UnitType } from "../entities/Unit";
import type { RaceId, RaceOption } from "../entities/Race";

export function applyRaceBonusesToPlayer(player: Player): void {
    if (!player.raceId || !player.raceOption) return;
    
    // 🧬 Bioform Option A: +1 max HP
    if (player.raceId === "bioform" && player.raceOption === "A") {
        player.maxHp += 1;
        player.hp += 1; // Also heal the extra HP
    }
    
    // 🌀 Void Option B: 2 recalls per game
    if (player.raceId === "void" && player.raceOption === "B") {
        player.voidRecallsRemaining = 2;
    }
}

/**
 * Game - Cosmic Frontier
 * 
 * - Tile Placement (players build the map via Explore)
 * - Base + Modules system
 * - Final Threat (40 HP shared boss, 6 rounds countdown)
 */
export class Game {
    private exploration: ExplorationSystem;
    private combat = new CombatSystem();
    private settlement = new SettlementSystem();
    private crafting = new CraftingSystem();

    // Callback for showing dice roll UI
    public onDiceRoll: ((result: { swords: number; skulls: number }, callback: () => void) => void) | null = null;

    // Callback for toast notifications
    public onToast: ((message: string, type: "info" | "success" | "warning" | "error") => void) | null = null;
    
    // Callback for syncing state after combat resolution (multiplayer)
    public onCombatResolved: (() => void) | null = null;

    constructor(public state: GameState) {
        this.exploration = new ExplorationSystem(state.tileDeck);
    }

    get currentPlayer() {
        return this.state.players[this.state.currentPlayerIndex];
    }
    
    /**
     * Set player race and option (v0.5)
     * Call this when player selects race in lobby
     */
    setPlayerRace(playerId: string, raceId: RaceId, raceOption: RaceOption): void {
        const player = this.state.players.find(p => p.id === playerId);
        if (!player) return;
        
        player.raceId = raceId;
        player.raceOption = raceOption;
        
        // Apply race-specific initial bonuses
        this.applyRaceBonuses(player);
    }
    
    /**
     * Apply race bonuses to player (called once at game start)
     */
    private applyRaceBonuses(player: Player): void {
        applyRaceBonusesToPlayer(player);
    }
    
    /**
     * Apply all race bonuses at game start (for server-authoritative games)
     * Call this after loading/receiving game state
     */
    applyAllRaceBonuses(): void {
        for (const player of this.state.players) {
            this.applyRaceBonuses(player);
        }
    }

    public addLog(message: string) {
        this.state.eventLog.push(message);
        if (this.state.eventLog.length > 10) {
            this.state.eventLog.shift();
        }
        console.log(message);
    }

    /**
     * Karak 2 rules: Move requires an available action slot.
     * If current slot is used (move/action) → finish it and start new slot.
     */
    private tryFinishCurrentSlotAndStartNew(): boolean {
        if (this.state.movedInCurrentSlot || this.state.actionUsedInCurrentSlot) {
            this.state.actionPoints -= 1;
            if (this.state.actionPoints <= 0) {
                this.endTurn();
                return false;
            }
            this.state.movedInCurrentSlot = false;
            this.state.actionUsedInCurrentSlot = false;
        }
        return true;
    }

    private forceEndTurnAfterEncounter() {
        this.state.actionPoints = 0;
        this.endTurn();
    }

    // ========================================
    // HEX CLICK (MOVEMENT + TILE PLACEMENT)
    // ========================================

    handleHexClick(target: HexCoord): void {
        if (this.state.phase !== Phase.AwaitInput) return;
        if (this.state.gameOver) return;

        const player = this.currentPlayer;
        const hasPostActionMove = player.voidPhaseStepAvailable || player.warboundBattleRushAvailable;
        if (this.state.actionPoints <= 0 && !hasPostActionMove) return;
        const from = player.position;
        const isSame = from.q === target.q && from.r === target.r;

        // Tile Placement mode: player selects where to place new tile
        if (this.state.uiMode === "TILE_PLACEMENT") {
            if (this.state.actionPoints <= 0) return;
            const existingTile = this.state.board.getTile(target);
            if (existingTile) return; // tile already exists

            // Must have at least one discovered neighbor
            const hasOpenNeighbor = neighbors(target).some((n) => {
                const t = this.state.board.getTile(n);
                return t && t.discovered;
            });

            if (!hasOpenNeighbor) return;

            this.state.phase = Phase.ResolveAction;
            this.state.uiMode = "NONE";

            // Create empty tile
            const newTile: Tile = {
                coord: target,
                discovered: false,
                type: TileType.Empty,
            };

            this.state.board.setTile(newTile);

            // Draw tile from deck and apply template
            const applied = this.exploration.applyTemplate(newTile);
            if (!applied) {
                this.addLog("Tile deck exhausted!");
                this.state.phase = Phase.AwaitInput;
                return;
            }

            // Mark tile as discovered
            newTile.discovered = true;

            // Apply rotation to blockedEdges
            if (newTile.blockedEdges && this.state.pendingTileRotation > 0) {
                newTile.blockedEdges = applyRotation(
                    newTile.blockedEdges,
                    this.state.pendingTileRotation
                );
            }
            newTile.rotation = this.state.pendingTileRotation;

            // Reset rotation and selected position
            this.state.pendingTileRotation = 0;
            this.state.selectedPlacementPosition = null;

            // Prestige for exploring Tier 2+
            if (newTile.tier && newTile.tier >= 2) {
                const prestigeGain = newTile.tier === 2 ? 1 : 2;
                player.prestige += prestigeGain;
                this.addLog(`${player.id} +${prestigeGain} Prestige (explore Tier ${newTile.tier})`);
            }
            
            // 🏕️ Nomad Option B: +1🧩 on first entry to Tier 3+ tile
            if (newTile.tier && newTile.tier >= 3 && player.raceId === "nomad" && player.raceOption === "B" && !player.nomadScoutBonusUsed) {
                player.components += 1;
                player.nomadScoutBonusUsed = true;
                this.addLog(`🏕️ ${player.id} Scout's Instinct: +1🧩`);
                if (this.onToast) {
                    this.onToast(`🏕️ Scout's Instinct! +1🧩`, "success");
                }
            }
            
            // 🌀 Void Option A: After Explore, can Move for free
            if (player.raceId === "void" && player.raceOption === "A") {
                player.voidPhaseStepAvailable = true;
                this.addLog(`🌀 ${player.id} Phase Step ready!`);
            }

            // Final Tile - triggers Orbital Phase / Final Preparation (v0.5)
            if (newTile.isFinalTile) {
                this.state.isFinalPhase = true;
                this.state.isFinalPreparation = true;
                this.state.finalPrepRoundsLeft = 4; // 4 rounds for preparation
                
                // Reset recall flags for all players
                for (const p of this.state.players) {
                    p.recallUsedThisPhase = false;
                }
                
                this.addLog(`🚨 FINAL TILE REVEALED! Orbital Phase begins! 4 rounds to prepare!`);
                this.addLog(`📡 RECALL TO BASE available for each player (1 use)`);
                
                if (this.onToast) {
                    this.onToast(`🚨 ORBITAL PHASE! Explore disabled. Prepare for Final Trial!`, "warning");
                }
            }

            this.addLog(
                `[Round ${this.state.round}] ${player.id} placed tile at ${target.q},${target.r} (Tier ${newTile.tier}${newTile.isFinalTile ? " - FINAL" : ""})`
            );

            // AUTO-MOVE: Player moves onto the new tile
            player.position = target;

            // AUTO-COMBAT: If there's a threat, show dice FIRST then apply results
            if (newTile.encounterActive === true) {
                this.state.phase = Phase.ResolveAction;
                
                // Show dice UI FIRST - combat applied AFTER animation
                if (this.onDiceRoll) {
                    // Simulate combat (calculate result without applying)
                    const outcome = this.combat.simulateCombat(player, newTile, player.prestige);
                    
                    this.onDiceRoll(outcome.roll, () => {
                        // AFTER dice animation: NOW apply results
                        this.combat.applyCombatResult(player, newTile, outcome);
                        
                        // v0.5: Detailed combat logging with breakdown
                        const tierNote = outcome.prestigePenalty 
                            ? `👹T${outcome.monsterTier}+1(prestige)=${outcome.requiredTier}⚔` 
                            : `👹T${outcome.monsterTier}=${outcome.requiredTier}⚔`;
                        const dmgNote = outcome.damageToPlayer > 0 ? `, took ${outcome.damageToPlayer}💀` : "";
                        this.addLog(
                            `${player.id} vs ${tierNote}: 🎲${outcome.roll.swords}+${outcome.bonusSwords}=${outcome.totalSwords}⚔ → ${outcome.victory ? "WON" : "PUSHBACK"}${dmgNote}`
                        );
                        
                        if (outcome.victory) {
                            this.awardCombatRewards(player, newTile);
                            this.showVictoryResult(outcome);
                        } else {
                            player.position = { q: from.q, r: from.r }; // Pushback
                            player.pushedBackFromTile = { q: target.q, r: target.r }; // v0.5: Mark tile
                            this.showDefeatResult(outcome);
                            this.forceEndTurnAfterEncounter();
                        }
                        
                        // Trigger state sync after combat resolution
                        if (this.onCombatResolved) {
                            this.onCombatResolved();
                        }
                    });
                    return; // Wait for dice callback
                }
                
                // Fallback without dice UI
                const outcome = this.combat.fightOnce(player, newTile, player.prestige);
                if (outcome.killed) {
                    this.awardCombatRewards(player, newTile);
                } else {
                    player.position = from;
                    player.pushedBackFromTile = { q: newTile.coord.q, r: newTile.coord.r }; // v0.5: Mark tile
                    this.forceEndTurnAfterEncounter();
                }
            } else {
                // No combat - just end turn
                if (player.voidPhaseStepAvailable) {
                    this.state.phase = Phase.AwaitInput;
                    this.state.uiMode = "NONE";
                    this.state.actionUsedInCurrentSlot = true;
                } else {
                    this.forceEndTurnAfterEncounter();
                }
            }
            return;
        }

        // Regular click = Move (only before action!)
        if (!isSame && !isNeighbor(from, target)) return;

        // Karak 2: Movement is always BEFORE action, never after!
        const usedPostActionMove = this.state.actionUsedInCurrentSlot && hasPostActionMove;
        if (this.state.actionUsedInCurrentSlot && !hasPostActionMove) {
            return; // already did action in slot → move forbidden
        }

        // If already moved in current slot → finish and start new slot
        if (this.state.movedInCurrentSlot) {
            if (!this.tryFinishCurrentSlotAndStartNew()) return;
        }

        const moved = !isSame && isNeighbor(from, target);

        if (moved) {
            // Check blocked edges (mountains/cliffs)
            const fromTile = this.state.board.getTile(from);
            const targetTile = this.state.board.getTile(target) || null;

            if (fromTile && !canMoveBetween(fromTile, target, targetTile)) {
                this.addLog(`[Round ${this.state.round}] ${player.id} cannot move - blocked by terrain!`);
                return;
            }

            // 🌪 Gravity Rift: Leaving always consumes a slot (overrides Void Navigator)
            const leavingRift = fromTile?.riskyEffect === "rift";
            if (leavingRift) {
                this.addLog(`🌪 Gravity Rift! ${player.id} spent extra effort leaving`);
                if (this.onToast) {
                    this.onToast(`🌪 Gravity Rift slows your movement!`, "warning");
                }
            }

            player.position = target;
            
            // ⚙ Void Navigators: Once per turn, one Move does not consume a slot
            // (Gravity Rift overrides this!)
            if (player.voidPhaseStepAvailable) {
                player.voidPhaseStepAvailable = false;
                // Don't set movedInCurrentSlot - this move is free!
                this.addLog(`🌀 ${player.id} Phase Step move`);
            } else if (player.warboundBattleRushAvailable) {
                player.warboundBattleRushAvailable = false;
                // Don't set movedInCurrentSlot - this move is free!
                this.addLog(`⚔️ ${player.id} Battle Rush move`);
            } else if (player.raceId === "void" && !player.voidFreeMoveUsed && !leavingRift) {
                player.voidFreeMoveUsed = true;
                // Don't set movedInCurrentSlot - this move is free!
                this.addLog(`${player.id} used Void Navigator free move`);
            } else {
                this.state.movedInCurrentSlot = true;
            }
        }

        const tile = this.state.board.getTile(target);
        if (!tile) return;

        // Enter fog: reveal (resources + threat)
        if (!tile.discovered) {
            this.exploration.reveal(tile);
        }

        // Local threat active → combat → turn ends
        if (tile.encounterActive === true) {
            // v0.5: Combat retry restriction - can't attack same tile after pushback
            if (player.pushedBackFromTile && 
                player.pushedBackFromTile.q === target.q && 
                player.pushedBackFromTile.r === target.r) {
                this.addLog(`${player.id} cannot retry this monster after pushback!`);
                if (this.onToast) {
                    this.onToast(`🚫 Cannot retry after pushback!`, "error");
                }
                // Move back to previous position
                player.position = from;
                return;
            }
            
            this.state.phase = Phase.ResolveAction;

            // Show dice UI FIRST - combat applied AFTER animation
            if (this.onDiceRoll) {
                // Simulate combat (calculate result without applying)
                const outcome = this.combat.simulateCombat(player, tile, player.prestige);
                
                this.onDiceRoll(outcome.roll, () => {
                    // AFTER dice animation: NOW apply results
                    this.combat.applyCombatResult(player, tile, outcome);
                    
                    // v0.5: Detailed combat logging with breakdown
                    const tierNote = outcome.prestigePenalty 
                        ? `👹T${outcome.monsterTier}+1(prestige)=${outcome.requiredTier}⚔` 
                        : `👹T${outcome.monsterTier}=${outcome.requiredTier}⚔`;
                    const dmgNote = outcome.damageToPlayer > 0 ? `, took ${outcome.damageToPlayer}💀` : "";
                    this.addLog(
                        `${player.id} vs ${tierNote}: 🎲${outcome.roll.swords}+${outcome.bonusSwords}=${outcome.totalSwords}⚔ → ${outcome.victory ? "WON" : "PUSHBACK"}${dmgNote}`
                    );
                    
                    if (outcome.victory) {
                        this.awardCombatRewards(player, tile);
                        this.showVictoryResult(outcome);
                    } else {
                        player.position = from;
                        player.pushedBackFromTile = { q: tile.coord.q, r: tile.coord.r }; // v0.5: Mark tile
                        this.showDefeatResult(outcome);
                        this.forceEndTurnAfterEncounter();
                    }
                    
                    // Trigger state sync after combat resolution
                    if (this.onCombatResolved) {
                        this.onCombatResolved();
                    }
                });
                return; // Wait for dice callback
            }
            
            // Fallback without dice UI
            const outcome = this.combat.fightOnce(player, tile, player.prestige);
            this.addLog(
                `${player.id} fought Threat ${outcome.killed ? "WON" : "PUSHBACK"}`
            );
            if (outcome.killed) {
                this.awardCombatRewards(player, tile);
            } else {
                player.position = from;
                player.pushedBackFromTile = { q: tile.coord.q, r: tile.coord.r }; // v0.5: Mark tile
                this.forceEndTurnAfterEncounter();
            }
            return;
        } else {
            this.state.phase = Phase.AwaitInput;
            if (usedPostActionMove) {
                this.tryFinishCurrentSlotAndStartNew();
            }
        }
    }

    /**
     * Set up pending reward choice after defeating a monster
     * v0.5: New tier-based rewards with Components (no direct item drops)
     * 
     * Tier 1 (HP 1): +1 Prestige (AUTOMATIC)
     * Tier 2 (HP 2): +1 Prestige +1 Component (AUTOMATIC)
     * Tier 3 (HP 3): +2 Prestige +2 Components (CHOICE)
     * Tier 4 (HP 4): +3 Prestige +3 Components (CHOICE)
     * Tier 6 (HP 6): +5 Prestige +4 Components (CHOICE)
     */
    private awardCombatRewards(player: Player, tile: Tile): void {
        const monsterTier = tile.monsterTier ?? 1;
        
        // v0.5: Underdog Bonus - +1🧩 for lowest prestige player on first Tier 3+ kill
        let underdogBonus = 0;
        if (monsterTier >= 3 && !player.underdogBonusUsed) {
            // Check if this player has the LOWEST prestige (not tied)
            const otherPlayers = this.state.players.filter(p => p.id !== player.id);
            const playerPrestige = player.prestige;
            const isLowest = otherPlayers.every(p => p.prestige > playerPrestige);
            const isTied = otherPlayers.some(p => p.prestige === playerPrestige);
            
            if (isLowest && !isTied) {
                underdogBonus = 1;
                player.underdogBonusUsed = true;
                this.addLog(`🌟 ${player.id} Underdog Bonus! +1🧩`);
                if (this.onToast) {
                    this.onToast(`🌟 Underdog Bonus! +1🧩`, "success");
                }
            }
        }
        
        // ========================================
        // RACE BONUSES ON KILL (v0.5)
        // ========================================
        
        // 🧬 Bioform Option B: Heal +1 HP after each monster kill
        if (player.raceId === "bioform" && player.raceOption === "B") {
            if (player.hp < player.maxHp) {
                player.hp += 1;
                this.addLog(`🧬 ${player.id} Regeneration: +1 HP`);
            }
        }
        
        // 🔨 Forge Option B: +1🧩 on first Tier 2+ monster kill
        if (player.raceId === "forge" && player.raceOption === "B" && !player.forgeSalvageBonusUsed && monsterTier >= 2) {
            underdogBonus += 1; // Add to component bonus
            player.forgeSalvageBonusUsed = true;
            this.addLog(`🔨 ${player.id} Salvage Expert: +1🧩`);
            if (this.onToast) {
                this.onToast(`🔨 Salvage Expert! +1🧩`, "success");
            }
        }
        
        // ⚔️ Warbound Option B: Free move after defeating monster
        if (player.raceId === "warbound" && player.raceOption === "B") {
            player.warboundBattleRushAvailable = true;
            this.addLog(`⚔️ ${player.id} Battle Rush ready!`);
        }
        
        // v0.5: New tier-based rewards
        let prestigeGain = 1;
        let componentGain = 0;
        
        switch (monsterTier) {
            case 1:
                prestigeGain = 1;
                componentGain = 0;
                break;
            case 2:
                prestigeGain = 1;
                componentGain = 1;
                break;
            case 3:
                prestigeGain = 2;
                componentGain = 2;
                break;
            case 4:
                prestigeGain = 3;
                componentGain = 3;
                break;
            case 6:
                prestigeGain = 5;
                componentGain = 4;
                break;
            default:
                prestigeGain = 1;
                componentGain = 0;
        }
        
        // v0.5: Apply component multiplier from game modifier
        const finalComponentGain = Math.round(componentGain * this.state.componentMultiplier);
        
        // v0.5: No more direct item drops from monsters
        // Clear any legacy pending rewards
        tile.pendingRewards = [];
        
        // v0.5: Tier 1-2 rewards are AUTOMATIC (no choice dialog)
        if (monsterTier <= 2) {
            player.prestige += prestigeGain;
            player.components += finalComponentGain;
            
            const parts: string[] = [`+${prestigeGain} Prestige`];
            if (finalComponentGain > 0) {
                parts.push(`+${finalComponentGain} 🧩`);
            }
            
            this.addLog(`${player.id} defeated Tier ${monsterTier} threat: ${parts.join(", ")}`);
            if (this.onToast) {
                this.onToast(`⚔️ Threat defeated: ${parts.join(", ")}`, "success");
            }
            
            // End turn immediately (no choice needed)
            if (player.warboundBattleRushAvailable) {
                this.state.phase = Phase.AwaitInput;
                this.state.uiMode = "NONE";
                this.state.actionUsedInCurrentSlot = true;
                return;
            }
            this.forceEndTurnAfterEncounter();
            return;
        }
        
        // Tier 3+: Show reward choice dialog
        this.state.phase = Phase.ResolveAction;
        this.state.actionPoints = 0; // Prevent any actions
        
        // v0.5: Add underdog bonus to component reward (after multiplier)
        const totalComponents = finalComponentGain + underdogBonus;
        
        // Set up pending reward choice
        this.state.pendingRewardChoice = {
            playerId: player.id,
            monsterTier,
            standardReward: { prestige: prestigeGain, tokens: [], components: totalComponents },
        };
        
        this.addLog(`${player.id} defeated Tier ${monsterTier} threat! Choose reward...`);
        // Toast shown after dice animation
    }
    
    /**
     * Show victory result after dice animation (with breakdown)
     */
    showVictoryResult(outcome?: import("../systems/CombatSystem").CombatResult): void {
        if (this.onToast) {
            if (outcome) {
                const b = outcome.breakdown;
                
                // Build sword breakdown
                const swordParts: string[] = [`🎲${b.diceRoll}`];
                if (b.raceBonus > 0) swordParts.push(`+${b.raceBonus}🧬`);
                if (b.unitBonus > 0) swordParts.push(`+${b.unitBonus}🤖`);
                if (b.weaponBonus > 0) swordParts.push(`+${b.weaponBonus}⚔`);
                if (b.moduleBonus > 0) swordParts.push(`+${b.moduleBonus}🔧`);
                if (b.amuletBonus > 0) swordParts.push(`+${b.amuletBonus}📿`);
                
                // Monster info
                const tierInfo = outcome.prestigePenalty 
                    ? `👹T${outcome.monsterTier}+1(prestige)=${outcome.requiredTier}⚔`
                    : `👹T${outcome.monsterTier}=${outcome.requiredTier}⚔`;
                
                // Damage info
                const dmgInfo = outcome.damageToPlayer > 0 
                    ? ` | 💀${outcome.damageToPlayer} dmg`
                    : "";
                
                this.onToast(`✅ WIN! ${swordParts.join("")}=${outcome.totalSwords}⚔ ≥ ${tierInfo}${dmgInfo}`, "success");
            } else {
                this.onToast(`🎉 Threat eliminated!`, "success");
            }
        }
    }
    
    /**
     * Show defeat result after dice animation (with breakdown)
     */
    showDefeatResult(outcome?: import("../systems/CombatSystem").CombatResult): void {
        if (this.onToast) {
            if (outcome) {
                const b = outcome.breakdown;
                
                // Build sword breakdown
                const swordParts: string[] = [`🎲${b.diceRoll}`];
                if (b.raceBonus > 0) swordParts.push(`+${b.raceBonus}🧬`);
                if (b.unitBonus > 0) swordParts.push(`+${b.unitBonus}🤖`);
                if (b.weaponBonus > 0) swordParts.push(`+${b.weaponBonus}⚔`);
                if (b.moduleBonus > 0) swordParts.push(`+${b.moduleBonus}🔧`);
                if (b.amuletBonus > 0) swordParts.push(`+${b.amuletBonus}📿`);
                
                // Monster info with explanation
                const tierInfo = outcome.prestigePenalty 
                    ? `👹T${outcome.monsterTier}+1(prestige)=${outcome.requiredTier}⚔`
                    : `👹T${outcome.monsterTier}=${outcome.requiredTier}⚔`;
                
                // Damage info
                const dmgInfo = outcome.damageToPlayer > 0 
                    ? ` | 💀${outcome.damageToPlayer} dmg`
                    : "";
                
                this.onToast(`❌ PUSHBACK! ${swordParts.join("")}=${outcome.totalSwords}⚔ < ${tierInfo}${dmgInfo}`, "error");
            } else {
                this.onToast(`💥 Pushed back!`, "error");
            }
        }
    }

    /**
     * Player chooses reward after defeating monster (v0.5)
     * Now includes Components instead of item tokens
     */
    chooseReward(choice: "standard" | "recover" | "push"): void {
        const pending = this.state.pendingRewardChoice;
        if (!pending) return;
        
        const player = this.state.players.find(p => p.id === pending.playerId);
        if (!player) return;
        
        switch (choice) {
            case "standard":
                // Standard: Prestige + Components (v0.5)
                player.prestige += pending.standardReward.prestige;
                player.components += pending.standardReward.components;
                
                const parts: string[] = [`+${pending.standardReward.prestige} Prestige`];
                if (pending.standardReward.components > 0) {
                    parts.push(`+${pending.standardReward.components} 🧩`);
                }
                this.addLog(`${player.id} chose Standard Reward: ${parts.join(", ")}`);
                
                if (this.onToast) {
                    this.onToast(`🎖️ ${parts.join(", ")}`, "success");
                }
                break;
                
            case "recover":
                // Recover: +2 HP (only if not full HP)
                const healed = Math.min(2, player.maxHp - player.hp);
                player.hp = Math.min(player.maxHp, player.hp + 2);
                this.addLog(`${player.id} chose Recover: +${healed} HP`);
                if (this.onToast) {
                    this.onToast(`❤️ +${healed} HP`, "success");
                }
                break;
                
            case "push":
                // Push Forward: +1 extra Prestige (not available at 10+)
                if (player.prestige < 10) {
                    player.prestige += pending.standardReward.prestige + 1;
                    this.addLog(`${player.id} chose Push Forward: +${pending.standardReward.prestige + 1} Prestige`);
                    if (this.onToast) {
                        this.onToast(`⭐ +${pending.standardReward.prestige + 1} Prestige`, "success");
                    }
                }
                break;
        }
        
        this.state.pendingRewardChoice = null;
        
        // v0.5: No more pending tokens (items come from crafting now)
        // End turn immediately
        if (player.warboundBattleRushAvailable) {
            this.state.phase = Phase.AwaitInput;
            this.state.uiMode = "NONE";
            this.state.actionUsedInCurrentSlot = true;
            return;
        }
        this.forceEndTurnAfterEncounter();
    }
    
    /**
     * Called after player selects equipment from token
     */
    finishTokenSelection(): void {
        const player = this.currentPlayer;
        
        // If more tokens pending, keep waiting
        if (player.pendingTokens.length > 0) {
            return;
        }
        
        // All tokens claimed - end turn
        this.forceEndTurnAfterEncounter();
    }

    // ========================================
    // GATHER
    // ========================================

    doGather(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;

        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);

        if (!tile) return false;
        if (!tile.discovered) return false;
        // Can gather from Resource tiles OR StartingSector (player's home zone)
        if (tile.type !== TileType.Resource && tile.type !== TileType.StartingSector) return false;
        if (tile.encounterActive === true) return false;

        // Check resources
        const hasResources = tile.resources && Object.keys(tile.resources).length > 0;
        if (!hasResources) return false;

        const map = (tile.cooldownUntilRoundByPlayer ??= {});
        const cooldown = map[p.id] ?? 0;
        if (cooldown > this.state.round) return false;

        this.state.phase = Phase.ResolveAction;

        // Collect all resources
        if (tile.resources) {
            let bonusBiomass = 0;
            let bonusMaterials = 0;
            let bonusAlloys = 0;
            
            // SupplyDepot: +1 to each resource type gathered
            const hasSupplyDepot = p.modules.includes("SupplyDepot");
            
            // 🏕️ Nomad passive: First Gather each turn gives +1 of any resource
            let nomadBonus = 0;
            let nomadBonusType: string | null = null;
            if (p.raceId === "nomad" && !p.nomadGatherBonusUsed) {
                nomadBonus = 1;
                p.nomadGatherBonusUsed = true;
                // Give bonus to first resource type found
                if (tile.resources.biomass) {
                    nomadBonusType = "biomass";
                } else if (tile.resources.materials) {
                    nomadBonusType = "materials";
                } else if (tile.resources.alloys) {
                    nomadBonusType = "alloys";
                }
            }
            
            if (tile.resources.biomass) {
                p.biomass += tile.resources.biomass;
                if (hasSupplyDepot) { p.biomass += 1; bonusBiomass = 1; }
                if (nomadBonusType === "biomass") { p.biomass += 1; bonusBiomass += 1; }
            }
            if (tile.resources.materials) {
                p.materials += tile.resources.materials;
                if (hasSupplyDepot) { p.materials += 1; bonusMaterials = 1; }
                if (nomadBonusType === "materials") { p.materials += 1; bonusMaterials += 1; }
            }
            if (tile.resources.alloys) {
                p.alloys += tile.resources.alloys;
                if (hasSupplyDepot) { p.alloys += 1; bonusAlloys = 1; }
                if (nomadBonusType === "alloys") { p.alloys += 1; bonusAlloys += 1; }
            }

            // Log
            const parts: string[] = [];
            if (tile.resources.biomass) {
                const bonus = bonusBiomass ? `+${bonusBiomass}` : "";
                parts.push(`${tile.resources.biomass}${bonus} 🧬`);
            }
            if (tile.resources.materials) {
                const bonus = bonusMaterials ? `+${bonusMaterials}` : "";
                parts.push(`${tile.resources.materials}${bonus} 🧱`);
            }
            if (tile.resources.alloys) {
                const bonus = bonusAlloys ? `+${bonusAlloys}` : "";
                parts.push(`${tile.resources.alloys}${bonus} ⚙`);
            }

            const depotText = hasSupplyDepot ? " (🏠 SupplyDepot bonus!)" : "";
            const nomadText = nomadBonus > 0 ? " (🏕️ Nomad bonus!)" : "";
            this.addLog(`[Round ${this.state.round}] ${p.id} GATHERED ${parts.join(", ")}${depotText}${nomadText}`);
            if (this.onToast) {
                this.onToast(`📦 Gathered: ${parts.join(", ")}${depotText}${nomadText}`, "success");
            }
        }

        // ⚡ Unstable Ground: -1 HP every Gather
        // 🏕️ Nomad Option A: Can Gather on Risky Tiles without penalty
        const nomadHazardResistant = p.raceId === "nomad" && p.raceOption === "A";
        if (tile.riskyEffect === "unstable" && !nomadHazardResistant) {
            p.hp = Math.max(0, p.hp - 1);
            this.addLog(`⚡ Unstable Ground! ${p.id} took 1 damage`);
            if (this.onToast) {
                this.onToast(`⚡ Unstable Ground! -1 HP`, "warning");
            }
        } else if (tile.riskyEffect === "unstable" && nomadHazardResistant) {
            this.addLog(`🏕️ ${p.id} Hazard Resistant - ignored Unstable Ground!`);
        }

        map[p.id] = this.state.round + 1;

        this.state.actionUsedInCurrentSlot = true;
        this.state.uiMode = "NONE";
        this.state.phase = Phase.AwaitInput;

        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }

    // ========================================
    // TRADE
    // ========================================

    doTrade(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;

        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        if (!tile || tile.type !== TileType.LandingHub) return false;

        this.state.phase = Phase.ResolveAction;
        const didTrade = this.settlement.trade(p);

        if (didTrade) {
            this.addLog(`${p.id} TRADE at Landing Hub`);
        }

        this.state.actionUsedInCurrentSlot = true;
        this.state.uiMode = "NONE";
        this.state.phase = Phase.AwaitInput;

        if (didTrade) {
            this.tryFinishCurrentSlotAndStartNew();
            return true;
        }

        return false;
    }

    // ========================================
    // HEAL
    // ========================================

    doHeal(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;

        const p = this.currentPlayer;
        if (p.hp >= p.maxHp) return false;

        const healed = Math.min(2, p.maxHp - p.hp);
        p.hp = Math.min(p.maxHp, p.hp + 2);
        this.addLog(`${p.id} HEAL: +${healed} HP`);
        if (this.onToast) {
            this.onToast(`❤️ +${healed} HP`, "success");
        }

        this.state.actionUsedInCurrentSlot = true;
        this.state.uiMode = "NONE";
        this.state.phase = Phase.AwaitInput;

        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }

    // ========================================
    // FINAL THREAT COMBAT
    // ========================================

    canAttackFinalThreat(): boolean {
        if (!this.state.isFinalPhase) return false;
        if (this.state.finalThreatHp <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        return true;
    }

    doAttackFinalThreat(): boolean {
        if (!this.canAttackFinalThreat()) return false;

        const p = this.currentPlayer;
        this.state.phase = Phase.ResolveAction;

        // Roll Hero Die
        const roll = this.combat.rollDie();

        // Apply damage
        this.state.finalThreatHp = Math.max(0, this.state.finalThreatHp - roll.swords);
        p.hp = Math.max(0, p.hp - roll.skulls);

        this.addLog(`${p.id} attacks Final Threat! (⚔${roll.swords}/💀${roll.skulls}) HP: ${this.state.finalThreatHp}/40`);

        // Check if Final Threat is defeated
        if (this.state.finalThreatHp <= 0) {
            this.addLog(`🏆 ${p.id} DEFEATED the Final Threat!`);
            this.state.winnerId = p.id;
            this.state.gameOver = true;
            return true;
        }

        // Combat ends turn
        this.forceEndTurnAfterEncounter();
        return true;
    }

    // ========================================
    // BASE & MODULES SYSTEM
    // ========================================

    /**
     * Check if player can build Base
     */
    canBuildBase(): boolean {
        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);

        // Can't if already have a Base
        if (p.basePosition) return false;

        // Can't on Landing Hub
        if (!tile || tile.type === TileType.LandingHub) return false;

        // Only on discovered tiles
        if (!tile.discovered) return false;

        // Can't if threat is active
        if (tile.encounterActive) return false;

        // Can't if already someone's Base
        if (tile.ownerId) return false;

        // Can't if another player is standing here
        const otherPlayersHere = this.state.players.filter(
            other => other.id !== p.id &&
                other.position.q === p.position.q &&
                other.position.r === p.position.r
        );
        if (otherPlayersHere.length > 0) return false;

        // 🧱 Forge Syndicate: First Build action costs -1 Materials
        const cost = (p.raceId === "forge" && !p.forgeDiscountUsed) ? 1 : 2;
        if (p.materials < cost) return false;

        return true;
    }

    /**
     * Build Base on current tile
     * Cost: 2 Materials, only 1 per player
     */
    doBuildBase(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        if (!this.canBuildBase()) return false;

        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        if (!tile) return false;

        this.state.phase = Phase.ResolveAction;

        // 🧱 Forge Syndicate: First Build action costs -1 Materials
        let cost = 2;
        if (p.raceId === "forge" && !p.forgeDiscountUsed) {
            cost = 1;
            p.forgeDiscountUsed = true;
            this.addLog(`${p.id} used Forge Syndicate discount (-1 🧱)`);
        }

        // Spend resources
        p.materials -= cost;

        // Mark tile as player's Base
        tile.ownerId = p.id;
        p.basePosition = { ...p.position };

        // Prestige for Base
        p.prestige += 2;

        this.addLog(`🏠 ${p.id} built BASE at ${p.position.q},${p.position.r}! +2 Prestige`);
        if (this.onToast) {
            this.onToast(`🏠 Base established! +2 Prestige`, "success");
        }

        this.state.actionUsedInCurrentSlot = true;
        this.state.phase = Phase.AwaitInput;
        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }

    /**
     * Check if player is in their own Base
     */
    isInOwnBase(): boolean {
        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        return tile?.ownerId === p.id;
    }

    /**
     * Get list of modules player can build
     */
    getAvailableModules(): ModuleType[] {
        const p = this.currentPlayer;

        // Must be in own Base
        if (!this.isInOwnBase()) return [];

        return (Object.keys(MODULES) as ModuleType[]).filter(type => {
            const module = MODULES[type];
            return (
                !p.modules.includes(type) &&
                canAffordModule(module, p.materials, p.alloys, p.biomass)
            );
        });
    }

    /**
     * Build modules in own Base
     * KEY: can build ANY number of modules in ONE action (1 slot)!
     */
    doBuildModules(moduleTypes: ModuleType[]): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        if (!this.isInOwnBase()) return false;
        if (moduleTypes.length === 0) return false;

        const p = this.currentPlayer;

        // Check if all modules can be built
        let totalMaterials = 0, totalAlloys = 0, totalBiomass = 0;
        let totalPrestige = 0;
        const validModules: ModuleType[] = [];

        for (const type of moduleTypes) {
            const module = MODULES[type];
            if (!module) continue;
            if (p.modules.includes(type)) continue; // already have it

            totalMaterials += module.cost.materials;
            totalAlloys += module.cost.alloys;
            totalBiomass += module.cost.biomass;
            totalPrestige += module.prestigeGain;
            validModules.push(type);
        }

        // Check if can afford ALL modules
        if (p.materials < totalMaterials || p.alloys < totalAlloys || p.biomass < totalBiomass) {
            this.addLog(`${p.id} cannot afford all selected modules`);
            return false;
        }

        if (validModules.length === 0) return false;

        this.state.phase = Phase.ResolveAction;

        // Spend resources
        p.materials -= totalMaterials;
        p.alloys -= totalAlloys;
        p.biomass -= totalBiomass;

        // Add modules
        for (const type of validModules) {
            p.modules.push(type);
            const module = MODULES[type];
            this.addLog(`🏗 ${p.id} built ${module.description}`);
        }

        // Award Prestige
        p.prestige += totalPrestige;
        this.addLog(`${p.id} +${totalPrestige} Prestige (${validModules.length} modules)`);
        if (this.onToast) {
            this.onToast(`🏗️ Built ${validModules.length} module(s)! +${totalPrestige} Prestige`, "success");
        }

        this.state.actionUsedInCurrentSlot = true;
        this.state.phase = Phase.AwaitInput;
        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }

    // Legacy aliases for compatibility
    canBuildOutpost = this.canBuildBase.bind(this);
    doBuildOutpost = this.doBuildBase.bind(this);
    isInOwnOutpost = this.isInOwnBase.bind(this);
    getAvailableDistricts = this.getAvailableModules.bind(this);
    doBuildDistricts = this.doBuildModules.bind(this);

    // ========================================
    // EXPLORE
    // ========================================

    doExplore(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        
        // v0.5: Block Explore during Final Preparation
        if (this.state.isFinalPreparation) {
            if (this.onToast) {
                this.onToast(`🚫 Explore disabled during Orbital Phase!`, "error");
            }
            return false;
        }

        // If already moved (without action) → finish current slot before Explore
        if (this.state.movedInCurrentSlot && !this.state.actionUsedInCurrentSlot) {
            if (!this.tryFinishCurrentSlotAndStartNew()) return false;
        }

        // Toggle placement mode
        if (this.state.uiMode === "TILE_PLACEMENT") {
            this.state.uiMode = "NONE";
            this.state.pendingTileTier = undefined;
            this.state.pendingTileRotation = 0;
        } else {
            this.state.uiMode = "TILE_PLACEMENT";
            this.state.pendingTileTier = 1; // Will be determined by deck
            this.state.pendingTileRotation = 0;
        }

        return true;
    }

    rotatePendingTile(): void {
        if (this.state.uiMode !== "TILE_PLACEMENT") return;
        this.state.pendingTileRotation = (this.state.pendingTileRotation + 1) % 6;
        this.state.selectedPlacementPosition = null;
    }

    // ========================================
    // CRAFTING SYSTEM (v0.5)
    // ========================================

    /**
     * Check if player can craft (must be in own base)
     */
    canCraft(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        return this.isInOwnBase();
    }

    /**
     * Get available craft recipes for current player
     */
    getAvailableCraftRecipes() {
        const player = this.currentPlayer;
        return this.crafting.getAvailableRecipes(player);
    }

    /**
     * Get all craft recipes (for UI display)
     */
    getAllCraftRecipes() {
        return CRAFT_RECIPES;
    }

    /**
     * Toggle craft menu
     */
    toggleCraftMenu(): boolean {
        if (!this.canCraft() && this.state.uiMode !== "CRAFT_MENU") {
            if (this.onToast) {
                this.onToast(`🚫 Must be at your Base to craft!`, "error");
            }
            return false;
        }

        if (this.state.uiMode === "CRAFT_MENU") {
            this.state.uiMode = "NONE";
        } else {
            this.state.uiMode = "CRAFT_MENU";
        }
        return true;
    }

    /**
     * Craft an item (costs 1 AP, or 0 AP for Forge Option A once per turn)
     */
    doCraft(recipeId: string): boolean {
        if (!this.canCraft()) return false;

        const player = this.currentPlayer;
        const result = this.crafting.craft(player, recipeId);

        if (result.success) {
            // 🔨 Forge Option A: First craft per turn is free (0 AP)
            const isForgeFreeC = player.raceId === "forge" && player.raceOption === "A" && !player.forgeCraftFreeUsed;
            
            if (isForgeFreeC) {
                player.forgeCraftFreeUsed = true;
                this.addLog(`🔨 ${player.id} crafted ${result.message} (Master Crafter - FREE!)`);
                if (this.onToast) {
                    this.onToast(`🔨 ${result.message} (FREE!)`, "success");
                }
                // Don't consume action slot
                this.state.uiMode = "NONE";
            } else {
                this.addLog(`🔧 ${player.id} crafted ${result.message}`);
                if (this.onToast) {
                    this.onToast(`🔧 ${result.message}`, "success");
                }
                this.state.actionUsedInCurrentSlot = true;
                this.state.uiMode = "NONE";
                this.tryFinishCurrentSlotAndStartNew();
            }
            return true;
        } else {
            if (this.onToast) {
                this.onToast(`❌ ${result.message}`, "error");
            }
            return false;
        }
    }

    // ========================================
    // UNIT HIRING (v0.5)
    // ========================================

    /**
     * Check if player can hire units (must be in own base)
     */
    canHireUnit(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        if (!this.isInOwnBase()) return false;
        
        // Check if player has empty unit slots
        const player = this.currentPlayer;
        const hasEmptySlot = player.units.some(u => u === null);
        return hasEmptySlot;
    }

    /**
     * Get available units player can hire
     */
    getAvailableUnits(): UnitType[] {
        const player = this.currentPlayer;
        
        // Must be in base and have empty slot
        if (!this.isInOwnBase()) return [];
        if (!player.units.some(u => u === null)) return [];
        
        return (Object.keys(UNIT_DEFINITIONS) as UnitType[]).filter(type => {
            return canAffordUnit(type, player.components, player.alloys, player.materials);
        });
    }

    /**
     * Hire a unit (costs 1 AP)
     */
    doHireUnit(unitType: UnitType): boolean {
        if (!this.canHireUnit()) return false;
        
        const player = this.currentPlayer;
        const def = UNIT_DEFINITIONS[unitType];
        
        // Check resources
        if (!canAffordUnit(unitType, player.components, player.alloys, player.materials)) {
            if (this.onToast) {
                this.onToast(`❌ Not enough resources!`, "error");
            }
            return false;
        }
        
        // Find empty slot
        const slotIndex = player.units.findIndex(u => u === null);
        if (slotIndex < 0) {
            if (this.onToast) {
                this.onToast(`❌ No empty unit slots!`, "error");
            }
            return false;
        }
        
        // Spend resources
        player.components -= def.cost.components;
        player.alloys -= def.cost.alloys;
        player.materials -= def.cost.materials;
        
        // Create and add unit
        const unit = createUnit(unitType);
        player.units[slotIndex] = unit;
        
        this.addLog(`🤖 ${player.id} hired ${def.name}`);
        if (this.onToast) {
            this.onToast(`🤖 ${def.name} hired!`, "success");
        }
        
        this.state.actionUsedInCurrentSlot = true;
        this.state.uiMode = "NONE";
        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }

    // ========================================
    // PRESTIGE SPENDING (v0.5)
    // ========================================

    /**
     * Check if player can spend prestige
     */
    canSpendPrestige(amount: number): boolean {
        return canSpendPrestige(this.currentPlayer, amount);
    }

    /**
     * Spend prestige (generic)
     */
    spendPrestige(amount: number): boolean {
        return spendPrestige(this.currentPlayer, amount);
    }

    // ========================================
    // RECALL TO BASE (v0.5 - Orbital Phase)
    // ========================================

    /**
     * Check if player can recall to base
     * v0.5: Void Navigators Option B gets 2 recalls per game
     */
    canRecallToBase(): boolean {
        if (!this.state.isFinalPreparation) return false;
        
        const player = this.currentPlayer;
        
        // Must have a base
        if (!player.basePosition) return false;
        
        // Check remaining recalls (Void Option B has 2, others have 1)
        
        // For Void Option B, check voidRecallsRemaining
        if (player.raceId === "void" && player.raceOption === "B") {
            if (player.voidRecallsRemaining <= 0) return false;
        } else {
            // Normal: only use once per Orbital Phase
            if (player.recallUsedThisPhase) return false;
        }
        
        // Already at base?
        if (player.position.q === player.basePosition.q && 
            player.position.r === player.basePosition.r) {
            return false;
        }
        
        return true;
    }

    /**
     * Recall player to their base (free action)
     * v0.5: Void Navigators Option B gets 2 recalls per game
     */
    doRecallToBase(): boolean {
        if (!this.canRecallToBase()) {
            if (this.onToast) {
                const player = this.currentPlayer;
                if (!this.state.isFinalPreparation) {
                    this.onToast(`🚫 Recall only available during Orbital Phase!`, "error");
                } else if (player.raceId === "void" && player.raceOption === "B" && player.voidRecallsRemaining <= 0) {
                    this.onToast(`🚫 All 2 Recalls used!`, "error");
                } else if (player.recallUsedThisPhase) {
                    this.onToast(`🚫 Already used Recall this phase!`, "error");
                } else if (!player.basePosition) {
                    this.onToast(`🚫 You don't have a Base!`, "error");
                }
            }
            return false;
        }

        const player = this.currentPlayer;
        const base = player.basePosition!;
        
        player.position = { q: base.q, r: base.r };
        
        // Track recall usage
        if (player.raceId === "void" && player.raceOption === "B") {
            player.voidRecallsRemaining--;
            this.addLog(`📡 ${player.id} RECALLED to Base! (${player.voidRecallsRemaining} recalls left)`);
        } else {
            player.recallUsedThisPhase = true;
            this.addLog(`📡 ${player.id} RECALLED to Base!`);
        }
        
        if (this.onToast) {
            this.onToast(`📡 Recalled to Base!`, "success");
        }
        
        return true;
    }

    // ========================================
    // ORBITAL HANGAR TELEPORT (v0.5)
    // ========================================

    /**
     * Check if player can use Orbital Hangar teleport
     */
    canUseOrbitalHangar(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        
        const player = this.currentPlayer;
        
        // Must have Orbital Hangar module
        if (!player.modules.includes("OrbitalHangar")) return false;
        
        // Can only use once per game
        if (player.orbitalHangarUsed) return false;
        
        // Must be at own base
        if (!this.isInOwnBase()) return false;
        
        return true;
    }

    /**
     * Get valid teleport destinations for Orbital Hangar
     * Only safe, discovered tiles (no active encounters, not Final Tile)
     */
    getOrbitalHangarDestinations(): HexCoord[] {
        const destinations: HexCoord[] = [];
        const player = this.currentPlayer;
        
        for (const tile of this.state.board.getAllTiles()) {
            // Must be discovered
            if (!tile.discovered) continue;
            
            // No active encounters
            if (tile.encounterActive) continue;
            
            // Not the Final Tile
            if (tile.isFinalTile) continue;
            
            // Not current position
            if (tile.coord.q === player.position.q && 
                tile.coord.r === player.position.r) continue;
            
            destinations.push(tile.coord);
        }
        
        return destinations;
    }

    /**
     * Use Orbital Hangar to teleport (costs 1 AP)
     */
    doOrbitalHangarTeleport(destination: HexCoord): boolean {
        if (!this.canUseOrbitalHangar()) return false;
        
        const destinations = this.getOrbitalHangarDestinations();
        const isValid = destinations.some(d => d.q === destination.q && d.r === destination.r);
        
        if (!isValid) {
            if (this.onToast) {
                this.onToast(`🚫 Invalid teleport destination!`, "error");
            }
            return false;
        }
        
        const player = this.currentPlayer;
        player.position = { q: destination.q, r: destination.r };
        player.orbitalHangarUsed = true;
        
        this.addLog(`🚀 ${player.id} used Orbital Hangar teleport!`);
        if (this.onToast) {
            this.onToast(`🚀 Teleported via Orbital Hangar!`, "success");
        }
        
        // Costs 1 AP (full slot)
        this.state.actionUsedInCurrentSlot = true;
        this.tryFinishCurrentSlotAndStartNew();
        
        return true;
    }

    // ========================================
    // FINAL TRIAL (v0.5)
    // ========================================

    /**
     * Calculate Final Trial score for a player
     * Score = weapon bonuses + module bonuses + optional prestige spend
     */
    calculateFinalTrialScore(player: Player, prestigeSpend: number = 0): number {
        let score = 0;
        
        // Weapon bonuses
        for (const weapon of player.inventory.weapons) {
            if (!weapon) continue;
            
            switch (weapon.effectId) {
                case "blaster_core":
                case "pulse_blade":
                    score += 1;
                    break;
                case "plasma_edge":
                case "shock_pike":
                    score += 2;
                    break;
                case "heavy_cannon":
                case "quantum_blade":
                    score += 3;
                    break;
            }
        }
        
        // Module bonuses (from spells that are actually modules)
        for (const spell of player.inventory.spells) {
            if (!spell) continue;
            
            switch (spell.effectId) {
                case "reroll_module":
                case "shield_matrix":
                    score += 1;
                    break;
                case "overdrive":
                    score += 2;
                    break;
            }
        }
        
        // Amulet bonus
        if (player.inventory.amulet) {
            switch (player.inventory.amulet.effectId) {
                case "stabilizer_plating":
                    score += 1;
                    break;
                case "core_relic":
                    score += 3;
                    break;
                case "chrono_shield":
                    score += 2;
                    break;
            }
        }
        
        // Prestige spend (1 Prestige = 1 score point)
        score += prestigeSpend;
        
        return score;
    }

    /**
     * Start Final Trial for current player
     */
    doFinalTrial(prestigeSpend: number = 0): boolean {
        if (!this.state.finalTrialStarted) return false;
        
        const player = this.currentPlayer;
        
        // Already did trial?
        if (player.finalTrialScore !== null) {
            if (this.onToast) {
                this.onToast(`🚫 Already completed Final Trial!`, "error");
            }
            return false;
        }
        
        // Can afford prestige spend?
        if (prestigeSpend > 0 && !canSpendPrestige(player, prestigeSpend)) {
            if (this.onToast) {
                this.onToast(`🚫 Not enough Prestige!`, "error");
            }
            return false;
        }
        
        // Spend prestige
        if (prestigeSpend > 0) {
            spendPrestige(player, prestigeSpend);
        }
        
        // Calculate score
        const score = this.calculateFinalTrialScore(player, prestigeSpend);
        player.finalTrialScore = score;
        
        // Record result
        this.state.finalTrialResults.push({ playerId: player.id, score });
        
        this.addLog(`🎯 ${player.id} completed Final Trial! Score: ${score}`);
        if (this.onToast) {
            this.onToast(`🎯 Final Trial Score: ${score}`, "info");
        }
        
        // Check if all players completed
        const allCompleted = this.state.players.every(p => p.finalTrialScore !== null);
        if (allCompleted) {
            this.resolveVictory();
        }
        
        return true;
    }

    /**
     * Resolve victory after all Final Trials complete
     */
    private resolveVictory(): void {
        // Find best trial score
        const bestTrialResult = this.state.finalTrialResults.reduce((best, curr) => 
            curr.score > best.score ? curr : best
        );
        
        // Winner of Final Trial gets +5 Prestige
        const trialWinner = this.state.players.find(p => p.id === bestTrialResult.playerId);
        if (trialWinner) {
            trialWinner.prestige += 5;
            this.addLog(`🏆 ${trialWinner.id} won Final Trial! +5 Prestige`);
        }
        
        // Find player with highest prestige
        const winner = this.state.players.reduce((best, curr) => {
            if (curr.prestige > best.prestige) return curr;
            if (curr.prestige === best.prestige) {
                // Tie-breaker: higher Final Trial score
                const currScore = curr.finalTrialScore ?? 0;
                const bestScore = best.finalTrialScore ?? 0;
                return currScore > bestScore ? curr : best;
            }
            return best;
        });
        
        this.state.gameOver = true;
        this.state.winnerId = winner.id;
        
        this.addLog(`🎉 ${winner.id} WINS with ${winner.prestige} Prestige!`);
        if (this.onToast) {
            this.onToast(`🎉 ${winner.id} WINS!`, "success");
        }
    }

    selectPlacementPosition(coord: HexCoord | null): void {
        if (this.state.uiMode !== "TILE_PLACEMENT") return;
        this.state.selectedPlacementPosition = coord;
    }

    placeTileAtSelected(): boolean {
        if (this.state.uiMode !== "TILE_PLACEMENT") return false;
        if (!this.state.selectedPlacementPosition) return false;

        const target = this.state.selectedPlacementPosition;
        this.handleHexClick(target);
        return true;
    }

    // ========================================
    // TURN MANAGEMENT
    // ========================================

    public endTurn(): void {
        this.state.phase = Phase.EndTurn;

        const prevIndex = this.state.currentPlayerIndex;
        const nextIndex = (prevIndex + 1) % this.state.players.length;

        // New round?
        if (nextIndex === 0) {
            this.state.round += 1;

            // v0.5: Final Preparation countdown
            if (this.state.isFinalPreparation && this.state.finalPrepRoundsLeft > 0) {
                this.state.finalPrepRoundsLeft--;
                this.addLog(`⏳ Orbital Phase: ${this.state.finalPrepRoundsLeft} rounds left`);
                
                if (this.onToast) {
                    this.onToast(`⏳ ${this.state.finalPrepRoundsLeft} rounds until Final Trial!`, "warning");
                }

                // Preparation over? Start Final Trial!
                if (this.state.finalPrepRoundsLeft === 0) {
                    this.startFinalTrial();
                    return;
                }
            }
            
            // Legacy: Final Phase with Final Threat (kept for compatibility)
            if (this.state.isFinalPhase && !this.state.isFinalPreparation && this.state.finalRoundsLeft > 0) {
                this.state.finalRoundsLeft--;
                this.addLog(`⏳ Final Phase: ${this.state.finalRoundsLeft} rounds left`);

                if (this.state.finalRoundsLeft === 0 && this.state.finalThreatHp > 0) {
                    this.endGameMissionFailed();
                    return;
                }
            }
        }

        this.state.currentPlayerIndex = nextIndex;

        const currentPlayer = this.state.players[nextIndex];

        // Check if player is KO'd (0 HP) - skip turn and heal
        if (currentPlayer.hp <= 0) {
            currentPlayer.hp = 3;
            this.addLog(`💤 ${currentPlayer.id} was KO'd! Resting... (+3 HP, turn skipped)`);
            if (this.onToast) {
                this.onToast(`💤 ${currentPlayer.id} is recovering from wounds...`, "warning");
            }
            
            // Recursively call endTurn to move to next player
            this.endTurn();
            return;
        }

        // New turn: 2 action slots
        this.state.actionPoints = 2;
        this.state.movedInCurrentSlot = false;
        this.state.actionUsedInCurrentSlot = false;
        this.state.uiMode = "NONE";
        
        // v0.5: Reset all race flags for new turn
        currentPlayer.voidFreeMoveUsed = false;
        currentPlayer.voidPhaseStepAvailable = false;
        currentPlayer.warboundBattleRushAvailable = false;
        currentPlayer.chronoRerollUsed = false;
        currentPlayer.nomadGatherBonusUsed = false;
        currentPlayer.forgeCraftFreeUsed = false;
        
        // v0.5: Reset combat retry restriction
        currentPlayer.pushedBackFromTile = null;

        this.state.phase = Phase.AwaitInput;
    }
    
    /**
     * Start Final Trial phase (v0.5)
     * All players must complete their trial
     */
    private startFinalTrial(): void {
        this.state.isFinalPreparation = false;
        this.state.finalTrialStarted = true;
        this.state.finalTrialResults = [];
        
        // Reset all players' trial scores
        for (const p of this.state.players) {
            p.finalTrialScore = null;
        }
        
        this.addLog(`🎯 FINAL TRIAL BEGINS! Each player makes one attempt.`);
        if (this.onToast) {
            this.onToast(`🎯 FINAL TRIAL! Complete your attempt!`, "warning");
        }
        
        // First player starts
        this.state.currentPlayerIndex = 0;
        this.state.phase = Phase.AwaitInput;
    }

    private endGameMissionFailed(): void {
        this.state.gameOver = true;
        this.state.missionFailed = true;
        this.state.winnerId = null;

        this.addLog(`💀 MISSION FAILED! Final Threat survived (${this.state.finalThreatHp} HP left)`);
        this.addLog(`No winner - expedition failed.`);
    }
}
