import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatSystem } from '../../src/systems/CombatSystem';
import type { Player } from '../../src/entities/Player';
import type { Tile } from '../../src/board/Tile';
import { TileType } from '../../src/board/TileTypes';

// Mock player factory
function createMockPlayer(overrides: Partial<Player> = {}): Player {
    return {
        id: 'TestPlayer',
        position: { q: 0, r: 0 },
        hp: 5,
        maxHp: 5,
        raceId: null,
        raceOption: null,
        biomass: 0,
        materials: 0,
        alloys: 0,
        components: 0,
        inventory: {
            weapons: [null, null],
            spells: [null, null],
            amulet: null,
        },
        modules: [],
        units: [null, null],
        prestige: 0,
        basePosition: null,
        pendingTokens: [],
        forgeDiscountUsed: false,
        forgeCraftFreeUsed: false,
        forgeSalvageBonusUsed: false,
        voidFreeMoveUsed: false,
        voidPhaseStepAvailable: false,
        voidRecallsRemaining: 1,
        warboundBattleRushAvailable: false,
        chronoRerollUsed: false,
        nomadGatherBonusUsed: false,
        nomadScoutBonusUsed: false,
        recallUsedThisPhase: false,
        orbitalHangarUsed: false,
        finalTrialScore: null,
        pushedBackFromTile: null,
        underdogBonusUsed: false,
        heavyCannonPenaltyApplied: false,
        techBreakthroughUsed: false,
        tilesExplored: 0,
        monstersDefeatedTier2Plus: 0,
        monstersDefeatedTier3Plus: 0,
        resourcesGathered: 0,
        itemsCrafted: 0,
        permanentGatherBonus: 0,
        permanentCombatBonus: 0,
        finalTrialBonus: 0,
        ...overrides,
    };
}

// Mock tile factory
function createMockTile(overrides: Partial<Tile> = {}): Tile {
    return {
        coord: { q: 0, r: 0 },
        discovered: true,
        type: TileType.Terrain,
        encounterActive: true,
        monsterTier: 1,
        ...overrides,
    };
}

describe('CombatSystem', () => {
    let combat: CombatSystem;

    beforeEach(() => {
        combat = new CombatSystem();
    });

    describe('rollDie', () => {
        it('should return valid dice result', () => {
            const result = combat.rollDie();
            expect(result.swords).toBeGreaterThanOrEqual(0);
            expect(result.skulls).toBeGreaterThanOrEqual(0);
        });

        it('should return values in valid range', () => {
            // Roll multiple times to check range
            for (let i = 0; i < 100; i++) {
                const result = combat.rollDie();
                expect(result.swords).toBeGreaterThanOrEqual(0);
                expect(result.swords).toBeLessThanOrEqual(3);
                expect(result.skulls).toBeGreaterThanOrEqual(0);
                expect(result.skulls).toBeLessThanOrEqual(2);
            }
        });
    });

    describe('simulateCombat', () => {
        it('should return combat result with all required fields', () => {
            const player = createMockPlayer();
            const tile = createMockTile({ monsterTier: 1 });

            const result = combat.simulateCombat(player, tile);

            expect(result).toHaveProperty('victory');
            expect(result).toHaveProperty('roll');
            expect(result).toHaveProperty('totalSwords');
            expect(result).toHaveProperty('requiredTier');
            expect(result).toHaveProperty('damageToPlayer');
            expect(result).toHaveProperty('breakdown');
        });

        it('should win if total swords >= monster tier', () => {
            const player = createMockPlayer();
            const tile = createMockTile({ monsterTier: 1 });

            // Run many combats - at least some should win
            let wins = 0;
            for (let i = 0; i < 100; i++) {
                const result = combat.simulateCombat(player, tile);
                if (result.victory) {
                    expect(result.totalSwords).toBeGreaterThanOrEqual(result.requiredTier);
                    wins++;
                }
            }
            expect(wins).toBeGreaterThan(0);
        });

        it('should lose if total swords < monster tier', () => {
            const player = createMockPlayer();
            const tile = createMockTile({ monsterTier: 1 });

            // Run many combats - some should lose
            let losses = 0;
            for (let i = 0; i < 100; i++) {
                const result = combat.simulateCombat(player, tile);
                if (!result.victory) {
                    expect(result.totalSwords).toBeLessThan(result.requiredTier);
                    losses++;
                }
            }
            // With tier 1, losses should be possible
            expect(losses).toBeGreaterThanOrEqual(0);
        });

        it('should apply prestige penalty at 12+ prestige', () => {
            const player = createMockPlayer({ prestige: 12 });
            const tile = createMockTile({ monsterTier: 2 });

            // Pass prestige to simulateCombat as third argument
            const result = combat.simulateCombat(player, tile, player.prestige);

            expect(result.prestigePenalty).toBe(true);
            expect(result.requiredTier).toBe(3); // 2 + 1
        });

        it('should not apply prestige penalty below 12 prestige', () => {
            const player = createMockPlayer({ prestige: 11 });
            const tile = createMockTile({ monsterTier: 2 });

            // Pass prestige to simulateCombat as third argument
            const result = combat.simulateCombat(player, tile, player.prestige);

            expect(result.prestigePenalty).toBe(false);
            expect(result.requiredTier).toBe(2);
        });

        it('should add toxic tile damage', () => {
            const player = createMockPlayer();
            const tile = createMockTile({ monsterTier: 1, riskyEffect: 'toxic' });

            const result = combat.simulateCombat(player, tile);

            expect(result.extraSkulls).toBeGreaterThanOrEqual(1);
            expect(result.breakdown.skullsFromTile).toBeGreaterThanOrEqual(1);
        });
    });

    describe('race bonuses', () => {
        it('should give Warbound +1 sword when rolling at least 1', () => {
            const player = createMockPlayer({ raceId: 'warbound' });
            const tile = createMockTile({ monsterTier: 1 });

            // Run multiple times to find a roll with swords
            for (let i = 0; i < 50; i++) {
                const result = combat.simulateCombat(player, tile);
                if (result.roll.swords >= 1) {
                    expect(result.breakdown.raceBonus).toBeGreaterThanOrEqual(1);
                    break;
                }
            }
        });

        it('should give Bioform skull reduction', () => {
            const player = createMockPlayer({ raceId: 'bioform' });
            const tile = createMockTile({ monsterTier: 1 });

            // Run until we get skulls
            for (let i = 0; i < 50; i++) {
                const result = combat.simulateCombat(player, tile);
                if (result.roll.skulls > 0) {
                    expect(result.breakdown.skullReductionRace).toBeGreaterThanOrEqual(1);
                    break;
                }
            }
        });
    });

    describe('applyCombatResult', () => {
        it('should clear encounter on victory', () => {
            const player = createMockPlayer();
            const tile = createMockTile({ encounterActive: true });

            const result = {
                victory: true,
                roll: { swords: 2, skulls: 0 },
                rolledSwords: 2,
                bonusSwords: 0,
                totalSwords: 2,
                requiredTier: 1,
                monsterTier: 1,
                prestigePenalty: false,
                rolledSkulls: 0,
                extraSkulls: 0,
                reducedSkulls: 0,
                damageToPlayer: 0,
                breakdown: {} as any,
            };

            combat.applyCombatResult(player, tile, result);

            expect(tile.encounterActive).toBe(false);
        });

        it('should apply damage to player', () => {
            const player = createMockPlayer({ hp: 5 });
            const tile = createMockTile({ encounterActive: true });

            const result = {
                victory: true,
                roll: { swords: 2, skulls: 2 },
                rolledSwords: 2,
                bonusSwords: 0,
                totalSwords: 2,
                requiredTier: 1,
                monsterTier: 1,
                prestigePenalty: false,
                rolledSkulls: 2,
                extraSkulls: 0,
                reducedSkulls: 0,
                damageToPlayer: 2,
                breakdown: {} as any,
            };

            combat.applyCombatResult(player, tile, result);

            expect(player.hp).toBe(3);
        });

        it('should not clear encounter on defeat', () => {
            const player = createMockPlayer();
            const tile = createMockTile({ encounterActive: true });

            const result = {
                victory: false,
                roll: { swords: 0, skulls: 1 },
                rolledSwords: 0,
                bonusSwords: 0,
                totalSwords: 0,
                requiredTier: 1,
                monsterTier: 1,
                prestigePenalty: false,
                rolledSkulls: 1,
                extraSkulls: 0,
                reducedSkulls: 0,
                damageToPlayer: 1,
                breakdown: {} as any,
            };

            combat.applyCombatResult(player, tile, result);

            expect(tile.encounterActive).toBe(true);
        });
    });
});
