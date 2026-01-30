import type { Player } from "../entities/Player";
import type { Tile } from "../board/Tile";
import { DiceResolver, type DiceResult } from "./DiceResolver";

/**
 * Detailed breakdown of combat bonuses for UI
 */
export type CombatBreakdown = {
    // Sword sources
    diceRoll: number;           // Base dice roll
    raceBonus: number;          // From race passive (e.g. Warbound +1)
    unitBonus: number;          // From units (Assault Drone etc)
    buildingBonus: number;      // From base buildings (AssaultBay etc)
    weaponBonus: number;        // From weapons
    moduleBonus: number;        // From modules/spells
    amuletBonus: number;        // From amulet
    preCombatBonus: number;     // From pre-combat spending
    
    // Skull reduction sources
    skullsFromDice: number;
    skullsFromTile: number;     // Toxic zone etc
    skullReductionRace: number;
    skullReductionUnit: number;
    skullReductionBuilding: number; // From base buildings (ShieldArray etc)
    skullReductionEquip: number;
    preCombatSkullReduction: number;
    
    // Labels for UI display
    labels: string[];
};

/**
 * Combat result with detailed info for logging/UI
 */
export type CombatResult = {
    victory: boolean;           // true if monster defeated
    roll: DiceResult;           // Raw dice roll
    rolledSwords: number;       // Swords from dice
    bonusSwords: number;        // Bonus swords from equipment/units
    totalSwords: number;        // Total swords (rolled + bonus)
    requiredTier: number;       // Monster tier to beat
    monsterTier: number;        // Base monster tier (before prestige)
    prestigePenalty: boolean;   // True if prestige added +1 to required
    rolledSkulls: number;       // Skulls from dice
    extraSkulls: number;        // Extra skulls from tile effects
    reducedSkulls: number;      // Skulls reduced by equipment/units
    damageToPlayer: number;     // Final damage to player
    breakdown: CombatBreakdown; // Detailed breakdown
};

export class CombatSystem {
    private dice = new DiceResolver();

    /**
     * Roll Hero Die
     */
    rollDie(): DiceResult {
        return this.dice.rollHeroDie();
    }

    /**
     * v0.5: New combat system - single check, no HP accumulation
     * 
     * Combat is a CHECK:
     * - totalSwords >= monsterTier = VICTORY
     * - else: PUSHBACK (player moves back, monster stays, no state change)
     * 
     * Player still takes skull damage regardless of outcome
     */
    simulateCombat(
        player: Player,
        tile: Tile,
        prestige: number = 0,
        modifiers: {
            extraSkulls?: number;
            equipmentPenalty?: number;
            preCombat?: { bonusSwords?: number; skullReduction?: number; rerollIfZero?: boolean };
        } = {},
    ): CombatResult {
        const monsterTier = tile.monsterTier ?? 1;
        
        // Prestige Pressure: +1 tier at 12+ prestige
        const prestigePenalty = prestige >= 12;
        const requiredTier = prestigePenalty ? monsterTier + 1 : monsterTier;
        
        // Roll dice
        let roll = this.dice.rollHeroDie();
        let rolledSwords = roll.swords;
        let rolledSkulls = roll.skulls;
        
        // Breakdown tracking
        const breakdown: CombatBreakdown = {
            diceRoll: roll.swords,
            raceBonus: 0,
            unitBonus: 0,
            buildingBonus: 0,
            weaponBonus: 0,
            moduleBonus: 0,
            amuletBonus: 0,
            preCombatBonus: 0,
            skullsFromDice: roll.skulls,
            skullsFromTile: 0,
            skullReductionRace: 0,
            skullReductionUnit: 0,
            skullReductionBuilding: 0,
            skullReductionEquip: 0,
            preCombatSkullReduction: 0,
            labels: [],
        };
        
        let bonusSwords = 0;
        let reducedSkulls = 0;
        let extraSkulls = 0;
        
        const syncRollBreakdown = () => {
            rolledSwords = roll.swords;
            rolledSkulls = roll.skulls;
            breakdown.diceRoll = roll.swords;
            breakdown.skullsFromDice = roll.skulls;
        };

        // ========================================
        // RISKY TILE: Toxic Zone (+1 💀)
        // ========================================
        if (tile.riskyEffect === "toxic") {
            extraSkulls += 1;
            breakdown.skullsFromTile += 1;
            breakdown.labels.push("☣️ Toxic +1💀");
        }

        if (modifiers.extraSkulls) {
            extraSkulls += modifiers.extraSkulls;
            breakdown.skullsFromTile += modifiers.extraSkulls;
            breakdown.labels.push("🌠 Event +💀");
        }

        // ========================================
        // PRESTIGE PRESSURE: No rerolls at 15+ prestige
        // v0.6: Blocks ALL reroll sources (Chrono, Units, Modules, Equipment)
        // ========================================
        const canReroll = prestige < 15;
        let rerollUsed = false; // v0.5: Only 1 reroll per combat!
        
        if (!canReroll) {
            breakdown.labels.push("🚫 Prestige 15+: No rerolls");
        }
        
        // ========================================
        // CHRONO PASSIVE: Once per turn free die reroll
        // v0.6: ALSO blocked by Prestige ≥15 (no exceptions!)
        // ========================================
        if (canReroll && player.raceId === "chrono" && !player.chronoRerollUsed && roll.swords === 0) {
            roll = this.dice.rollHeroDie();
            syncRollBreakdown();
            breakdown.labels.push("⏳ Chrono reroll");
            player.chronoRerollUsed = true; // Will be reset at turn start
            // Note: Chrono reroll does NOT set rerollUsed, so equipment rerolls can still trigger
        }
        
        // ========================================
        // REROLL PRIORITY (only first available source used):
        // 1. Tactical Scanner (Unit)
        // 2. TacticalUplink (Module)
        // 3. Reroll Module (Equipment)
        // 4. Heavy Striker (Weapon)
        // ========================================
        
        const hasTacticalUnit = player.units?.some(u => u?.type === "tactical");
        const hasTacticalUplink = player.modules.includes("TacticalUplink");
        const hasRerollModule = player.inventory.spells.some(s => s && s.effectId === "reroll_module");
        const hasHeavyStriker = player.inventory.weapons.some(w => w && w.effectId === "heavy_striker");
        const hasPreCombatReroll = modifiers.preCombat?.rerollIfZero ?? false;
        
        // Only reroll if rolled 0 swords AND prestige < 15
        if (roll.swords === 0 && canReroll && !rerollUsed) {
            if (hasPreCombatReroll) {
                roll = this.dice.rollHeroDie();
                syncRollBreakdown();
                breakdown.labels.push("🧩 Pre-combat reroll");
                rerollUsed = true;
            } else if (hasTacticalUnit) {
                roll = this.dice.rollHeroDie();
                syncRollBreakdown();
                breakdown.labels.push("📡 Tactical Scanner reroll");
                rerollUsed = true;
            } else if (hasTacticalUplink) {
                roll = this.dice.rollHeroDie();
                syncRollBreakdown();
                breakdown.labels.push("🏠 TacticalUplink reroll");
                rerollUsed = true;
            } else if (hasRerollModule) {
                roll = this.dice.rollHeroDie();
                syncRollBreakdown();
                breakdown.labels.push("🎲 Reroll Module reroll");
                rerollUsed = true;
            } else if (hasHeavyStriker) {
                roll = this.dice.rollHeroDie();
                syncRollBreakdown();
                breakdown.labels.push("⚔ Heavy Striker reroll");
                rerollUsed = true;
            }
        }

        syncRollBreakdown();

        // ========================================
        // RACE PASSIVES (v0.5 - updated)
        // ========================================
        
        // 🧬 Bioform Collective: Ignore first 💀 in every combat
        if (player.raceId === "bioform" && (rolledSkulls + extraSkulls) > 0) {
            reducedSkulls += 1;
            breakdown.skullReductionRace += 1;
            breakdown.labels.push("🧬 Bioform -1💀");
        }
        
        // ⏳ Chrono Ascendants Option A: First 💀 becomes 0
        if (player.raceId === "chrono" && player.raceOption === "A" && (rolledSkulls + extraSkulls) > 0) {
            reducedSkulls += 1;
            breakdown.skullReductionRace += 1;
            breakdown.labels.push("⏳ Temporal Shield -1💀");
        }
        
        // ⚔️ Warbound Legion: If rolled at least 1⚔ → +1⚔
        if (player.raceId === "warbound" && rolledSwords >= 1) {
            bonusSwords += 1;
            breakdown.raceBonus += 1;
            breakdown.labels.push("⚔️ Warbound +1⚔");
        }
        
        // ⚔️ Warbound Legion Option A: +1⚔ against Tier 3+ monsters
        if (player.raceId === "warbound" && player.raceOption === "A" && monsterTier >= 3) {
            bonusSwords += 1;
            breakdown.raceBonus += 1;
            breakdown.labels.push("⚔️ Monster Hunter +1⚔");
        }

        if (player.permanentCombatBonus > 0) {
            bonusSwords += player.permanentCombatBonus;
            breakdown.moduleBonus += player.permanentCombatBonus;
            breakdown.labels.push(`🏆 Objective +${player.permanentCombatBonus}⚔`);
        }

        const preCombatBonusSwords = modifiers.preCombat?.bonusSwords ?? 0;
        if (preCombatBonusSwords > 0) {
            bonusSwords += preCombatBonusSwords;
            breakdown.preCombatBonus += preCombatBonusSwords;
            breakdown.labels.push(`🎯 Pre-combat +${preCombatBonusSwords}⚔`);
        }

        // ========================================
        // UNIT BONUSES (v0.5)
        // ========================================
        if (player.units) {
            for (const unit of player.units) {
                if (!unit) continue;
                switch (unit.type) {
                    case "assault":
                        bonusSwords += 1;
                        breakdown.unitBonus += 1;
                        breakdown.labels.push("🤖 Assault +1⚔");
                        break;
                    case "shield":
                        if (rolledSkulls + extraSkulls > reducedSkulls) {
                            reducedSkulls += 1;
                            breakdown.skullReductionUnit += 1;
                            breakdown.labels.push("🛡️ Shield -1💀");
                        }
                        break;
                    // tactical reroll handled separately
                }
            }
        }

        // ========================================
        // BASE BUILDING BONUSES (player.modules)
        // ========================================
        
        // AssaultBay: +1 ⚔ when roll has ⚔
        if (player.modules.includes("AssaultBay") && rolledSwords >= 1) {
            bonusSwords += 1;
            breakdown.buildingBonus += 1;
            breakdown.labels.push("🏠 AssaultBay +1⚔");
        }
        
        // ShieldArray: ignore 1 💀
        if (player.modules.includes("ShieldArray") && (rolledSkulls + extraSkulls) > reducedSkulls) {
            reducedSkulls += 1;
            breakdown.skullReductionBuilding += 1;
            breakdown.labels.push("🏠 ShieldArray -1💀");
        }
        
        // TacticalUplink: handled in reroll section below

        // Pulse Blade / Blaster Core: +1 ⚔
        const hasPulseBlade = player.inventory.weapons.some(
            w => w && (w.effectId === "pulse_blade" || w.effectId === "blaster_core")
        );
        if (hasPulseBlade) {
            bonusSwords += 1;
            breakdown.weaponBonus += 1;
            breakdown.labels.push("⚔ Blaster +1⚔");
        }

        // Shock Pike: If roll ≥2 ⚔ then +1 ⚔
        const hasShockPike = player.inventory.weapons.some(
            w => w && w.effectId === "shock_pike"
        );
        if (hasShockPike && roll.swords >= 2) {
            bonusSwords += 1;
            breakdown.weaponBonus += 1;
            breakdown.labels.push("⚔ Shock Pike +1⚔");
        }

        // Plasma Edge: +2 ⚔ if roll ≥1 ⚔
        const hasPlasmaEdge = player.inventory.weapons.some(
            w => w && w.effectId === "plasma_edge"
        );
        if (hasPlasmaEdge && roll.swords >= 1) {
            bonusSwords += 2;
            breakdown.weaponBonus += 2;
            breakdown.labels.push("⚔ Plasma Edge +2⚔");
        }

        // Heavy Cannon: +3 ⚔
        const hasHeavyCannon = player.inventory.weapons.some(
            w => w && w.effectId === "heavy_cannon"
        );
        if (hasHeavyCannon) {
            bonusSwords += 3;
            breakdown.weaponBonus += 3;
            breakdown.labels.push("⚔ Heavy Cannon +3⚔");
        }

        // Quantum Blade (Legendary): +2 ⚔
        const hasQuantumBlade = player.inventory.weapons.some(
            w => w && w.effectId === "quantum_blade"
        );
        if (hasQuantumBlade) {
            bonusSwords += 2;
            breakdown.weaponBonus += 2;
            breakdown.labels.push("⚔ Quantum Blade +2⚔");
        }

        // ========================================
        // AMULET/ARMOR EFFECTS
        // ========================================

        // Stabilizer Plating: Ignore first 💀
        if (player.inventory.amulet?.effectId === "stabilizer_plating" && roll.skulls > 0) {
            reducedSkulls += 1;
            breakdown.skullReductionEquip += 1;
            breakdown.labels.push("📿 Stabilizer -1💀");
        }

        // Shield Matrix: Ignore first 💀
        const hasShieldMatrix = player.inventory.spells.some(
            s => s && s.effectId === "shield_matrix"
        );
        if (hasShieldMatrix && roll.skulls > 0) {
            reducedSkulls += 1;
            breakdown.skullReductionEquip += 1;
            breakdown.labels.push("🔧 Shield Matrix -1💀");
        }

        // Core Relic: +1 ⚔ and ignore 1 💀
        if (player.inventory.amulet?.effectId === "core_relic") {
            bonusSwords += 1;
            breakdown.amuletBonus += 1;
            breakdown.labels.push("📿 Core Relic +1⚔");
            if (roll.skulls > 0) {
                reducedSkulls += 1;
                breakdown.skullReductionEquip += 1;
                breakdown.labels.push("📿 Core Relic -1💀");
            }
        }

        // Chrono Shield (Legendary): Ignore ALL 💀
        if (player.inventory.amulet?.effectId === "chrono_shield" && roll.skulls > 0) {
            const totalSkullsToReduce = roll.skulls + extraSkulls;
            breakdown.skullReductionEquip += totalSkullsToReduce - reducedSkulls;
            reducedSkulls = totalSkullsToReduce;
            breakdown.labels.push("📿 Chrono Shield ALL💀");
        }

        const preCombatSkullReduction = modifiers.preCombat?.skullReduction ?? 0;
        if (preCombatSkullReduction > 0 && (rolledSkulls + extraSkulls) > reducedSkulls) {
            const reducible = Math.min(preCombatSkullReduction, rolledSkulls + extraSkulls - reducedSkulls);
            reducedSkulls += reducible;
            breakdown.preCombatSkullReduction += reducible;
            breakdown.labels.push(`🎯 Pre-combat -${reducible}💀`);
        }

        // ========================================
        // MODULE/SPELL EFFECTS (one-time, consume spell)
        // ========================================

        // Overdrive / Overcharge: +2 ⚔ (one-time)
        const overdriveIndex = player.inventory.spells.findIndex(
            s => s && (s.effectId === "overdrive" || s.effectId === "overcharge")
        );
        if (overdriveIndex >= 0) {
            bonusSwords += 2;
            breakdown.moduleBonus += 2;
            breakdown.labels.push("🔧 Overdrive +2⚔");
            player.inventory.spells[overdriveIndex] = null; // Consume
        }

        // ========================================
        // CALCULATE RESULTS
        // ========================================
        const equipmentPenalty = modifiers.equipmentPenalty ?? 0;
        if (equipmentPenalty > 0) {
            bonusSwords = Math.max(0, bonusSwords - equipmentPenalty);
            breakdown.labels.push(`⚠️ Equipment -${equipmentPenalty}⚔`);
        }

        const totalSwords = roll.swords + bonusSwords;
        const damageToPlayer = Math.max(0, roll.skulls + extraSkulls - reducedSkulls);
        
        // v0.5: Single check - victory if totalSwords >= requiredTier
        const victory = totalSwords >= requiredTier;

        // Detailed logging with full breakdown
        console.log(`[Combat] ═══════════════════════════════════════`);
        console.log(`[Combat] Monster: Tier ${monsterTier}${prestigePenalty ? ` (+1 Prestige Penalty) = ${requiredTier}` : ""}`);
        console.log(`[Combat] Required: ${requiredTier}⚔ to defeat`);
        console.log(`[Combat] ───────────────────────────────────────`);
        console.log(`[Combat] 🎲 Dice Roll: ${roll.swords}⚔ ${roll.skulls}💀`);
        if (breakdown.raceBonus > 0) console.log(`[Combat] 🧬 Race Bonus: +${breakdown.raceBonus}⚔`);
        if (breakdown.unitBonus > 0) console.log(`[Combat] 🤖 Unit Bonus: +${breakdown.unitBonus}⚔`);
        if (breakdown.buildingBonus > 0) console.log(`[Combat] 🏠 Building Bonus: +${breakdown.buildingBonus}⚔`);
        if (breakdown.weaponBonus > 0) console.log(`[Combat] ⚔ Weapon Bonus: +${breakdown.weaponBonus}⚔`);
        if (breakdown.moduleBonus > 0) console.log(`[Combat] 🔧 Module Bonus: +${breakdown.moduleBonus}⚔`);
        if (breakdown.amuletBonus > 0) console.log(`[Combat] 📿 Amulet Bonus: +${breakdown.amuletBonus}⚔`);
        console.log(`[Combat] ───────────────────────────────────────`);
        console.log(`[Combat] ⚔ TOTAL: ${totalSwords}⚔ vs ${requiredTier} needed`);
        console.log(`[Combat] 💀 Damage: ${damageToPlayer} (${roll.skulls}+${extraSkulls}-${reducedSkulls})`);
        console.log(`[Combat] Result: ${victory ? "✅ VICTORY" : "❌ PUSHBACK"}`);
        console.log(`[Combat] ═══════════════════════════════════════`);

        return {
            victory,
            roll,
            monsterTier,
            prestigePenalty,
            rolledSwords: roll.swords,
            bonusSwords,
            totalSwords,
            requiredTier,
            rolledSkulls: roll.skulls,
            extraSkulls,
            reducedSkulls,
            damageToPlayer,
            breakdown,
        };
    }

    /**
     * Apply combat results after dice animation
     * v0.5: No HP tracking on monsters - just clear encounter if victory
     */
    applyCombatResult(player: Player, tile: Tile, result: CombatResult): void {
        // ⏳ Chrono Ascendants Option B: No damage on pushback
        const chronoSafeRetreat = player.raceId === "chrono" && player.raceOption === "B" && !result.victory;
        
        // Player takes damage (unless Chrono Option B on pushback)
        if (!chronoSafeRetreat) {
            player.hp = Math.max(0, player.hp - result.damageToPlayer);
        }
        
        if (result.victory) {
            // Monster defeated - clear encounter
            tile.encounterActive = false;
            tile.enemyHp = undefined;
        }
        // If not victory: encounter stays active, player will be pushed back by Game.ts
    }

    /**
     * Legacy method - wraps new system for compatibility
     */
    fightOnce(
        player: Player,
        tile: Tile,
        prestige: number = 0,
        modifiers: { extraSkulls?: number; equipmentPenalty?: number } = {},
    ): { killed: boolean; roll: DiceResult; bonusSwords: number; reducedSkulls: number } {
        const result = this.simulateCombat(player, tile, prestige, modifiers);
        this.applyCombatResult(player, tile, result);
        
        return {
            killed: result.victory,
            roll: result.roll,
            bonusSwords: result.bonusSwords,
            reducedSkulls: result.reducedSkulls,
        };
    }

    /**
     * Use Med Gel spell (heal +2 HP)
     */
    useMedGel(player: Player): boolean {
        const medGelIndex = player.inventory.spells.findIndex(
            s => s && s.effectId === "med_gel"
        );
        if (medGelIndex >= 0) {
            player.hp = Math.min(player.maxHp, player.hp + 2);
            player.inventory.spells[medGelIndex] = null;
            return true;
        }
        return false;
    }
}
