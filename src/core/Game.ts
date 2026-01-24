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
import { MODULES, type ModuleType, canAffordModule } from "../entities/BuildingType";

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

    // Callback for showing dice roll UI
    public onDiceRoll: ((result: { swords: number; skulls: number }, callback: () => void) => void) | null = null;

    constructor(public state: GameState) {
        this.exploration = new ExplorationSystem(state.tileDeck);
    }

    get currentPlayer() {
        return this.state.players[this.state.currentPlayerIndex];
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
        if (this.state.actionPoints <= 0) return;
        if (this.state.gameOver) return;

        const player = this.currentPlayer;
        const from = player.position;
        const isSame = from.q === target.q && from.r === target.r;

        // Tile Placement mode: player selects where to place new tile
        if (this.state.uiMode === "TILE_PLACEMENT") {
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

            // Final Tile - triggers Final Phase!
            if (newTile.isFinalTile) {
                this.state.isFinalPhase = true;
                this.state.finalRoundsLeft = 6; // 6 rounds countdown
                this.state.finalThreatHp = 40;  // 40 HP shared boss
                this.addLog(`🚨 FINAL TILE REVEALED! Final Threat spawned (40 HP)! 6 rounds remaining!`);
            }

            this.addLog(
                `[Round ${this.state.round}] ${player.id} placed tile at ${target.q},${target.r} (Tier ${newTile.tier}${newTile.isFinalTile ? " - FINAL" : ""})`
            );

            // AUTO-MOVE: Player moves onto the new tile
            player.position = target;

            // AUTO-COMBAT: If there's a threat, fight immediately
            if (newTile.encounterActive === true) {
                const outcome = this.combat.fightOnce(player, newTile);
                
                this.addLog(
                    `${player.id} fought Threat (⚔${outcome.roll.swords}/💀${outcome.roll.skulls}) ${outcome.killed ? "WON" : "LOST"}`
                );
                
                // Show dice roll UI if callback is set (after combat resolved)
                if (this.onDiceRoll) {
                    this.onDiceRoll(outcome.roll, () => {
                        // Dice dismissed - state already updated
                    });
                }

                if (outcome.killed) {
                    // Victory! Award Prestige based on tier
                    const prestigeGain = newTile.tier === 1 ? 1 : newTile.tier === 2 ? 2 : 3;
                    player.prestige += prestigeGain;
                    this.addLog(`${player.id} +${prestigeGain} Prestige (combat)`);
                } else {
                    // Pushed back to original position
                    player.position = from;
                }
            }

            // Explore + auto-move + combat = turn ends
            this.forceEndTurnAfterEncounter();
            return;
        }

        // Regular click = Move (only before action!)
        if (!isSame && !isNeighbor(from, target)) return;

        // Karak 2: Movement is always BEFORE action, never after!
        if (this.state.actionUsedInCurrentSlot) {
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

            player.position = target;
            this.state.movedInCurrentSlot = true;
        }

        const tile = this.state.board.getTile(target);
        if (!tile) return;

        // Enter fog: reveal (resources + threat)
        if (!tile.discovered) {
            this.exploration.reveal(tile);
        }

        // Local threat active → combat → turn ends
        if (tile.encounterActive === true) {
            this.state.phase = Phase.ResolveAction;

            const outcome = this.combat.fightOnce(this.currentPlayer, tile);
            
            // Show dice roll UI if callback is set
            if (this.onDiceRoll) {
                this.onDiceRoll(outcome.roll, () => {
                    // Continue after user dismisses dice
                });
            }
            
            this.addLog(
                `${this.currentPlayer.id} fought Threat (⚔${outcome.roll.swords}/💀${outcome.roll.skulls}) ${outcome.killed ? "WON" : "LOST"}`
            );

            if (outcome.killed) {
                // Victory! Award Prestige
                const prestigeGain = tile.tier === 1 ? 1 : tile.tier === 2 ? 2 : 3;
                player.prestige += prestigeGain;
                this.addLog(`${player.id} +${prestigeGain} Prestige (combat)`);
            } else {
                // Pushed back
                player.position = from;
            }

            // Combat ends turn
            this.forceEndTurnAfterEncounter();
            return;
        } else {
            this.state.phase = Phase.AwaitInput;
        }
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
        if (tile.type !== TileType.Resource) return false;
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
            if (tile.resources.biomass) p.biomass += tile.resources.biomass;
            if (tile.resources.materials) p.materials += tile.resources.materials;
            if (tile.resources.alloys) p.alloys += tile.resources.alloys;

            // Log
            const parts: string[] = [];
            if (tile.resources.biomass) parts.push(`${tile.resources.biomass} 🧬`);
            if (tile.resources.materials) parts.push(`${tile.resources.materials} 🧱`);
            if (tile.resources.alloys) parts.push(`${tile.resources.alloys} ⚙`);

            this.addLog(`[Round ${this.state.round}] ${p.id} GATHERED ${parts.join(", ")}`);
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

        // Need 2 Materials
        if (p.materials < 2) return false;

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

        // Spend resources
        p.materials -= 2;

        // Mark tile as player's Base
        tile.ownerId = p.id;
        p.basePosition = { ...p.position };

        // Prestige for Base
        p.prestige += 2;

        this.addLog(`🏠 ${p.id} built BASE at ${p.position.q},${p.position.r}! +2 Prestige`);

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

            // Final Phase: decrease round counter
            if (this.state.isFinalPhase && this.state.finalRoundsLeft > 0) {
                this.state.finalRoundsLeft--;
                this.addLog(`⏳ Final Phase: ${this.state.finalRoundsLeft} rounds left`);

                // Game over?
                if (this.state.finalRoundsLeft === 0 && this.state.finalThreatHp > 0) {
                    this.endGameMissionFailed();
                    return;
                }
            }
        }

        this.state.currentPlayerIndex = nextIndex;

        // New turn: 2 action slots
        this.state.actionPoints = 2;
        this.state.movedInCurrentSlot = false;
        this.state.actionUsedInCurrentSlot = false;
        this.state.uiMode = "NONE";

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
