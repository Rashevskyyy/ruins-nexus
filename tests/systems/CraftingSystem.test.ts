import { describe, it, expect, beforeEach } from 'vitest';
import { CraftingSystem, CRAFT_RECIPES, canSpendPrestige, spendPrestige } from '../../src/systems/CraftingSystem';
import type { Player } from '../../src/entities/Player';

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
        materials: 5,
        alloys: 5,
        components: 10,
        inventory: {
            weapons: [null, null],
            spells: [null, null],
            amulet: null,
        },
        modules: [],
        units: [null, null],
        prestige: 5,
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

describe('CraftingSystem', () => {
    let crafting: CraftingSystem;

    beforeEach(() => {
        crafting = new CraftingSystem();
    });

    describe('CRAFT_RECIPES', () => {
        it('should have defined recipes', () => {
            expect(CRAFT_RECIPES.length).toBeGreaterThan(0);
        });

        it('should have valid recipe structure', () => {
            for (const recipe of CRAFT_RECIPES) {
                expect(recipe.id).toBeDefined();
                expect(recipe.name).toBeDefined();
                expect(recipe.cost).toBeDefined();
                expect(recipe.cost.components).toBeGreaterThanOrEqual(0);
                expect(recipe.result.type).toMatch(/^(weapon|module|amulet)$/);
            }
        });

        it('should have unique recipe IDs', () => {
            const ids = CRAFT_RECIPES.map(r => r.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('canCraft', () => {
        it('should return true when player has enough resources', () => {
            const player = createMockPlayer({
                components: 10,
                alloys: 5,
                materials: 5,
            });
            const recipe = CRAFT_RECIPES.find(r => r.id === 'blaster_core')!;
            
            expect(crafting.canCraft(player, recipe)).toBe(true);
        });

        it('should return false when player lacks components', () => {
            const player = createMockPlayer({
                components: 0,
                alloys: 5,
            });
            const recipe = CRAFT_RECIPES.find(r => r.id === 'blaster_core')!;
            
            expect(crafting.canCraft(player, recipe)).toBe(false);
        });

        it('should return false when no weapon slots available', () => {
            const player = createMockPlayer({
                components: 10,
                alloys: 5,
                inventory: {
                    weapons: [{ id: '1', name: 'W1', type: 'weapon', rarity: 'common', description: '', emoji: '', effectId: 'a' },
                              { id: '2', name: 'W2', type: 'weapon', rarity: 'common', description: '', emoji: '', effectId: 'b' }],
                    spells: [null, null],
                    amulet: null,
                },
            });
            const recipe = CRAFT_RECIPES.find(r => r.id === 'blaster_core')!;
            
            expect(crafting.canCraft(player, recipe)).toBe(false);
        });

        it('should check prestige cost for expensive recipes', () => {
            const player = createMockPlayer({
                components: 10,
                prestige: 0, // Not enough for core_relic (costs 2)
            });
            const recipe = CRAFT_RECIPES.find(r => r.id === 'core_relic')!;
            
            expect(crafting.canCraft(player, recipe)).toBe(false);
        });
    });

    describe('hasSlotFor', () => {
        it('should return true for empty weapon slot', () => {
            const player = createMockPlayer();
            const recipe = CRAFT_RECIPES.find(r => r.result.type === 'weapon')!;
            
            expect(crafting.hasSlotFor(player, recipe)).toBe(true);
        });

        it('should return false for full weapon slots', () => {
            const player = createMockPlayer({
                inventory: {
                    weapons: [{ id: '1', name: 'W1', type: 'weapon', rarity: 'common', description: '', emoji: '', effectId: 'a' },
                              { id: '2', name: 'W2', type: 'weapon', rarity: 'common', description: '', emoji: '', effectId: 'b' }],
                    spells: [null, null],
                    amulet: null,
                },
            });
            const recipe = CRAFT_RECIPES.find(r => r.result.type === 'weapon')!;
            
            expect(crafting.hasSlotFor(player, recipe)).toBe(false);
        });

        it('should return false when amulet slot is taken', () => {
            const player = createMockPlayer({
                inventory: {
                    weapons: [null, null],
                    spells: [null, null],
                    amulet: { id: 'x', name: 'A', type: 'amulet', rarity: 'common', description: '', emoji: '', effectId: 'x' },
                },
            });
            const recipe = CRAFT_RECIPES.find(r => r.result.type === 'amulet')!;
            
            expect(crafting.hasSlotFor(player, recipe)).toBe(false);
        });
    });

    describe('craft', () => {
        it('should successfully craft an item', () => {
            const player = createMockPlayer({
                components: 10,
                alloys: 5,
            });
            const initialComponents = player.components;
            
            const result = crafting.craft(player, 'blaster_core');
            
            expect(result.success).toBe(true);
            expect(player.components).toBeLessThan(initialComponents);
            expect(player.inventory.weapons.some(w => w?.id === 'blaster_core')).toBe(true);
        });

        it('should fail for unknown recipe', () => {
            const player = createMockPlayer();
            
            const result = crafting.craft(player, 'unknown_recipe');
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('Recipe not found');
        });

        it('should fail when cannot afford', () => {
            const player = createMockPlayer({
                components: 0,
                alloys: 0,
            });
            
            const result = crafting.craft(player, 'blaster_core');
            
            expect(result.success).toBe(false);
            expect(result.message).toBe('Cannot afford recipe');
        });

        it('should place weapon in first available slot', () => {
            const player = createMockPlayer({
                components: 10,
                alloys: 5,
            });
            
            crafting.craft(player, 'blaster_core');
            
            expect(player.inventory.weapons[0]).not.toBeNull();
            expect(player.inventory.weapons[1]).toBeNull();
        });

        it('should place module in spells slot', () => {
            const player = createMockPlayer({
                components: 10,
            });
            
            crafting.craft(player, 'reroll_module');
            
            expect(player.inventory.spells[0]).not.toBeNull();
            expect(player.inventory.spells[0]?.effectId).toBe('reroll_module');
        });

        it('should place amulet in amulet slot', () => {
            const player = createMockPlayer({
                components: 10,
                prestige: 5,
            });
            
            crafting.craft(player, 'core_relic');
            
            expect(player.inventory.amulet).not.toBeNull();
            expect(player.inventory.amulet?.effectId).toBe('core_relic');
        });
    });

    describe('craftWithDiscount', () => {
        it('should apply component discount', () => {
            const player = createMockPlayer({
                components: 1, // Only 1, but blaster needs 2
                alloys: 5,
            });
            
            // Without discount - should fail
            expect(crafting.canCraft(player, CRAFT_RECIPES.find(r => r.id === 'blaster_core')!)).toBe(false);
            
            // With discount - should succeed
            const result = crafting.craftWithDiscount(player, 'blaster_core', { components: 1 });
            expect(result.success).toBe(true);
        });
    });

    describe('getAvailableRecipes', () => {
        it('should return recipes player can afford', () => {
            const player = createMockPlayer({
                components: 2,
                alloys: 1,
            });
            
            const available = crafting.getAvailableRecipes(player);
            
            expect(available.length).toBeGreaterThan(0);
            for (const recipe of available) {
                expect(crafting.canCraft(player, recipe)).toBe(true);
            }
        });

        it('should return empty for broke player', () => {
            const player = createMockPlayer({
                components: 0,
                alloys: 0,
                materials: 0,
            });
            
            const available = crafting.getAvailableRecipes(player);
            
            expect(available.length).toBe(0);
        });
    });
});

describe('Prestige helpers', () => {
    describe('canSpendPrestige', () => {
        it('should return true when player has enough prestige', () => {
            const player = createMockPlayer({ prestige: 5 });
            expect(canSpendPrestige(player, 3)).toBe(true);
        });

        it('should return false when player lacks prestige', () => {
            const player = createMockPlayer({ prestige: 2 });
            expect(canSpendPrestige(player, 5)).toBe(false);
        });

        it('should return true for exact amount', () => {
            const player = createMockPlayer({ prestige: 5 });
            expect(canSpendPrestige(player, 5)).toBe(true);
        });
    });

    describe('spendPrestige', () => {
        it('should deduct prestige and return true', () => {
            const player = createMockPlayer({ prestige: 10 });
            
            const result = spendPrestige(player, 3);
            
            expect(result).toBe(true);
            expect(player.prestige).toBe(7);
        });

        it('should return false and not deduct when insufficient', () => {
            const player = createMockPlayer({ prestige: 2 });
            
            const result = spendPrestige(player, 5);
            
            expect(result).toBe(false);
            expect(player.prestige).toBe(2);
        });
    });
});
