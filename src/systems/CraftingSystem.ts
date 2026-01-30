/**
 * Crafting System - v0.5
 * 
 * Players can craft items at their Base using Components (🧩) and Alloys (⚙)
 * Crafting costs 1 AP and can only be done at player's own Base
 */

import type { Player } from "../entities/Player";
import type { Item } from "../entities/Item";

export type CraftRecipe = {
    id: string;
    name: string;
    description: string;
    emoji: string;
    cost: {
        components: number;  // 🧩
        alloys: number;      // ⚙
        materials: number;   // 🧱
        prestige: number;    // Prestige cost (spent)
    };
    result: {
        type: "weapon" | "module" | "amulet";
        itemId?: string;     // For weapons/amulets
        moduleId?: string;   // For modules
    };
    item?: Item; // The actual item (for weapons/amulets)
};

// MVP Recipes for v0.5
export const CRAFT_RECIPES: CraftRecipe[] = [
    // Weapons
    {
        id: "blaster_core",
        name: "Blaster Core",
        description: "+1 ⚔",
        emoji: "🔫",
        cost: { components: 2, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "blaster_core" },
        item: {
            id: "blaster_core",
            name: "Blaster Core",
            type: "weapon",
            rarity: "common",
            description: "+1 ⚔",
            emoji: "🔫",
            effectId: "blaster_core",
        },
    },
    {
        id: "shock_blade",
        name: "Shock Blade",
        description: "+1 ⚔, no 💀 on win",
        emoji: "⚡",
        cost: { components: 2, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "shock_blade" },
        item: {
            id: "shock_blade",
            name: "Shock Blade",
            type: "weapon",
            rarity: "common",
            description: "+1 ⚔, no 💀 on win",
            emoji: "⚡",
            effectId: "shock_blade",
        },
    },
    {
        id: "plasma_edge",
        name: "Plasma Edge",
        description: "+2 ⚔ if roll ≥1 ⚔",
        emoji: "⚡",
        cost: { components: 3, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "plasma_edge" },
        item: {
            id: "plasma_edge",
            name: "Plasma Edge",
            type: "weapon",
            rarity: "uncommon",
            description: "+2 ⚔ if roll ≥1 ⚔",
            emoji: "⚡",
            effectId: "plasma_edge",
        },
    },
    {
        id: "heavy_cannon",
        name: "Heavy Cannon",
        description: "+3 ⚔, first move costs slot",
        emoji: "💥",
        cost: { components: 4, alloys: 2, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "heavy_cannon" },
        item: {
            id: "heavy_cannon",
            name: "Heavy Cannon",
            type: "weapon",
            rarity: "uncommon",
            description: "+3 ⚔, first move costs slot",
            emoji: "💥",
            effectId: "heavy_cannon",
        },
    },
    {
        id: "arc_rifle",
        name: "Arc Rifle",
        description: "+1 ⚔ per tile moved (max +3)",
        emoji: "🏹",
        cost: { components: 3, alloys: 2, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "arc_rifle" },
        item: {
            id: "arc_rifle",
            name: "Arc Rifle",
            type: "weapon",
            rarity: "uncommon",
            description: "+1 ⚔ per tile moved (max +3)",
            emoji: "🏹",
            effectId: "arc_rifle",
        },
    },
    {
        id: "void_launcher",
        name: "Void Launcher",
        description: "+2 ⚔, bypass Guardian",
        emoji: "🌀",
        cost: { components: 4, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "void_launcher" },
        item: {
            id: "void_launcher",
            name: "Void Launcher",
            type: "weapon",
            rarity: "uncommon",
            description: "+2 ⚔, bypass Guardian",
            emoji: "🌀",
            effectId: "void_launcher",
        },
    },
    // Modules (special crafted items)
    {
        id: "reroll_module",
        name: "Reroll Module",
        description: "1 reroll per combat (if 0⚔)",
        emoji: "🎲",
        cost: { components: 2, alloys: 0, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "reroll_module" },
        item: {
            id: "reroll_module",
            name: "Reroll Module",
            type: "spell", // Stored in spells slot
            rarity: "uncommon",
            description: "1 reroll per combat (if 0⚔)",
            emoji: "🎲",
            effectId: "reroll_module",
        },
    },
    {
        id: "shield_matrix",
        name: "Shield Matrix",
        description: "Ignore first 💀 per combat",
        emoji: "🛡️",
        cost: { components: 2, alloys: 0, materials: 1, prestige: 0 },
        result: { type: "module", moduleId: "shield_matrix" },
        item: {
            id: "shield_matrix",
            name: "Shield Matrix",
            type: "spell", // Stored in spells slot
            rarity: "uncommon",
            description: "Ignore first 💀 per combat",
            emoji: "🛡️",
            effectId: "shield_matrix",
        },
    },
    {
        id: "threat_scanner",
        name: "Threat Scanner",
        description: "See monster type before explore",
        emoji: "📡",
        cost: { components: 2, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "threat_scanner" },
        item: {
            id: "threat_scanner",
            name: "Threat Scanner",
            type: "spell",
            rarity: "uncommon",
            description: "See monster type before explore",
            emoji: "📡",
            effectId: "threat_scanner",
        },
    },
    {
        id: "phase_shift",
        name: "Phase Shift",
        description: "Teleport to adjacent tile",
        emoji: "✨",
        cost: { components: 3, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "phase_shift" },
        item: {
            id: "phase_shift",
            name: "Phase Shift",
            type: "spell",
            rarity: "uncommon",
            description: "Teleport to adjacent tile",
            emoji: "✨",
            effectId: "phase_shift",
        },
    },
    {
        id: "stasis_field",
        name: "Stasis Field",
        description: "Cancel all 💀 this combat",
        emoji: "🧊",
        cost: { components: 4, alloys: 0, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "stasis_field" },
        item: {
            id: "stasis_field",
            name: "Stasis Field",
            type: "spell",
            rarity: "uncommon",
            description: "Cancel all 💀 this combat",
            emoji: "🧊",
            effectId: "stasis_field",
        },
    },
    {
        id: "overcharge",
        name: "Overcharge",
        description: "Double weapon ⚔ this combat",
        emoji: "⚡",
        cost: { components: 3, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "overcharge" },
        item: {
            id: "overcharge",
            name: "Overcharge",
            type: "spell",
            rarity: "uncommon",
            description: "Double weapon ⚔ this combat",
            emoji: "⚡",
            effectId: "overcharge",
        },
    },
    {
        id: "hunters_mark",
        name: "Hunter's Mark",
        description: "Next Hunter gives ×2 reward",
        emoji: "🎯",
        cost: { components: 2, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "hunters_mark" },
        item: {
            id: "hunters_mark",
            name: "Hunter's Mark",
            type: "spell",
            rarity: "uncommon",
            description: "Next Hunter gives ×2 reward",
            emoji: "🎯",
            effectId: "hunters_mark",
        },
    },
    {
        id: "overdrive",
        name: "Overdrive",
        description: "+3 ⚔ next combat (one-time)",
        emoji: "⚡",
        cost: { components: 3, alloys: 0, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "overdrive" },
        item: {
            id: "overdrive",
            name: "Overdrive",
            type: "spell", // One-time use
            rarity: "uncommon",
            description: "+3 ⚔ next combat (one-time)",
            emoji: "⚡",
            effectId: "overdrive",
        },
    },
    {
        id: "emergency_repair",
        name: "Emergency Repair",
        description: "Restore 3 HP",
        emoji: "🧰",
        cost: { components: 2, alloys: 0, materials: 1, prestige: 0 },
        result: { type: "module", moduleId: "emergency_repair" },
        item: {
            id: "emergency_repair",
            name: "Emergency Repair",
            type: "spell",
            rarity: "uncommon",
            description: "Restore 3 HP",
            emoji: "🧰",
            effectId: "emergency_repair",
        },
    },
    {
        id: "escape_pod",
        name: "Escape Pod",
        description: "Teleport to Base",
        emoji: "🚀",
        cost: { components: 3, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "escape_pod" },
        item: {
            id: "escape_pod",
            name: "Escape Pod",
            type: "spell",
            rarity: "uncommon",
            description: "Teleport to Base",
            emoji: "🚀",
            effectId: "escape_pod",
        },
    },
    // Amulet (Relic)
    {
        id: "core_relic",
        name: "Core Relic",
        description: "+1 ⚔ and ignore 1 💀 per combat",
        emoji: "💎",
        cost: { components: 4, alloys: 0, materials: 0, prestige: 2 },
        result: { type: "amulet", itemId: "core_relic" },
        item: {
            id: "core_relic",
            name: "Core Relic",
            type: "amulet",
            rarity: "legendary",
            description: "+1 ⚔ and ignore 1 💀 per combat",
            emoji: "💎",
            effectId: "core_relic",
        },
    },
    {
        id: "explorers_charm",
        name: "Explorer's Charm",
        description: "Explore doesn't spend slot (1/turn)",
        emoji: "🧭",
        cost: { components: 3, alloys: 0, materials: 0, prestige: 1 },
        result: { type: "amulet", itemId: "explorers_charm" },
        item: {
            id: "explorers_charm",
            name: "Explorer's Charm",
            type: "amulet",
            rarity: "legendary",
            description: "Explore doesn't spend slot (1/turn)",
            emoji: "🧭",
            effectId: "explorers_charm",
        },
    },
    {
        id: "survivors_mark",
        name: "Survivor's Mark",
        description: "At 1 HP: +2 HP once per game",
        emoji: "❤️",
        cost: { components: 3, alloys: 0, materials: 0, prestige: 1 },
        result: { type: "amulet", itemId: "survivors_mark" },
        item: {
            id: "survivors_mark",
            name: "Survivor's Mark",
            type: "amulet",
            rarity: "legendary",
            description: "At 1 HP: +2 HP once per game",
            emoji: "❤️",
            effectId: "survivors_mark",
        },
    },
    {
        id: "war_medal",
        name: "War Medal",
        description: "+1 🧩 per monster kill",
        emoji: "🎖️",
        cost: { components: 4, alloys: 0, materials: 0, prestige: 1 },
        result: { type: "amulet", itemId: "war_medal" },
        item: {
            id: "war_medal",
            name: "War Medal",
            type: "amulet",
            rarity: "legendary",
            description: "+1 🧩 per monster kill",
            emoji: "🎖️",
            effectId: "war_medal",
        },
    },
    {
        id: "void_pendant",
        name: "Void Pendant",
        description: "Recall doesn't consume use",
        emoji: "💠",
        cost: { components: 5, alloys: 0, materials: 0, prestige: 2 },
        result: { type: "amulet", itemId: "void_pendant" },
        item: {
            id: "void_pendant",
            name: "Void Pendant",
            type: "amulet",
            rarity: "legendary",
            description: "Recall doesn't consume use",
            emoji: "💠",
            effectId: "void_pendant",
        },
    },
    {
        id: "guardians_crest",
        name: "Guardian's Crest",
        description: "×2 Guardian rewards",
        emoji: "🛡️",
        cost: { components: 4, alloys: 0, materials: 0, prestige: 2 },
        result: { type: "amulet", itemId: "guardians_crest" },
        item: {
            id: "guardians_crest",
            name: "Guardian's Crest",
            type: "amulet",
            rarity: "legendary",
            description: "×2 Guardian rewards",
            emoji: "🛡️",
            effectId: "guardians_crest",
        },
    },
];

export class CraftingSystem {
    /**
     * Get all recipes a player can craft (has resources for)
     */
    getAvailableRecipes(player: Player): CraftRecipe[] {
        return CRAFT_RECIPES.filter(recipe => this.canCraft(player, recipe));
    }

    /**
     * Check if player can afford a recipe
     */
    canCraft(player: Player, recipe: CraftRecipe): boolean {
        return (
            player.components >= recipe.cost.components &&
            player.alloys >= recipe.cost.alloys &&
            player.materials >= recipe.cost.materials &&
            player.prestige >= recipe.cost.prestige &&
            this.hasSlotFor(player, recipe)
        );
    }

    /**
     * Check if player can afford a recipe with discounts.
     */
    canCraftWithDiscount(
        player: Player,
        recipe: CraftRecipe,
        discount: { components?: number; alloys?: number; materials?: number; prestige?: number },
    ): boolean {
        const components = Math.max(0, recipe.cost.components - (discount.components ?? 0));
        const alloys = Math.max(0, recipe.cost.alloys - (discount.alloys ?? 0));
        const materials = Math.max(0, recipe.cost.materials - (discount.materials ?? 0));
        const prestige = Math.max(0, recipe.cost.prestige - (discount.prestige ?? 0));
        return (
            player.components >= components &&
            player.alloys >= alloys &&
            player.materials >= materials &&
            player.prestige >= prestige &&
            this.hasSlotFor(player, recipe)
        );
    }

    /**
     * Check if player has a slot for the crafted item
     */
    hasSlotFor(player: Player, recipe: CraftRecipe): boolean {
        switch (recipe.result.type) {
            case "weapon":
                return player.inventory.weapons.some(w => w === null);
            case "amulet":
                return player.inventory.amulet === null;
            case "module":
                return player.inventory.spells.some(s => s === null);
            default:
                return false;
        }
    }

    /**
     * Craft an item (deduct resources, add item to inventory)
     * Returns true if successful
     */
    craft(player: Player, recipeId: string): { success: boolean; message: string } {
        const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
        if (!recipe) {
            return { success: false, message: "Recipe not found" };
        }

        if (!this.canCraft(player, recipe)) {
            return { success: false, message: "Cannot afford recipe" };
        }

        this.applyRecipeCost(player, recipe, {});
        this.applyRecipeResult(player, recipe);
        return { success: true, message: `Crafted ${recipe.name}!` };
    }

    craftWithDiscount(
        player: Player,
        recipeId: string,
        discount: { components?: number; alloys?: number; materials?: number; prestige?: number },
    ): { success: boolean; message: string } {
        const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
        if (!recipe) {
            return { success: false, message: "Recipe not found" };
        }

        if (!this.canCraftWithDiscount(player, recipe, discount)) {
            return { success: false, message: "Cannot afford recipe" };
        }

        this.applyRecipeCost(player, recipe, discount);
        this.applyRecipeResult(player, recipe);
        return { success: true, message: `Crafted ${recipe.name}!` };
    }

    private applyRecipeCost(
        player: Player,
        recipe: CraftRecipe,
        discount: { components?: number; alloys?: number; materials?: number; prestige?: number },
    ): void {
        const components = Math.max(0, recipe.cost.components - (discount.components ?? 0));
        const alloys = Math.max(0, recipe.cost.alloys - (discount.alloys ?? 0));
        const materials = Math.max(0, recipe.cost.materials - (discount.materials ?? 0));
        const prestige = Math.max(0, recipe.cost.prestige - (discount.prestige ?? 0));
        player.components -= components;
        player.alloys -= alloys;
        player.materials -= materials;
        player.prestige -= prestige;
    }

    private applyRecipeResult(player: Player, recipe: CraftRecipe): void {
        if (!recipe.item) return;
        switch (recipe.result.type) {
            case "weapon": {
                const slot = player.inventory.weapons.findIndex(w => w === null);
                if (slot >= 0) {
                    player.inventory.weapons[slot] = { ...recipe.item };
                }
                break;
            }
            case "amulet": {
                player.inventory.amulet = { ...recipe.item };
                break;
            }
            case "module": {
                const slot = player.inventory.spells.findIndex(s => s === null);
                if (slot >= 0) {
                    player.inventory.spells[slot] = { ...recipe.item };
                }
                break;
            }
        }
    }
}

/**
 * Prestige spending helpers (v0.5)
 */
export function canSpendPrestige(player: Player, amount: number): boolean {
    return player.prestige >= amount;
}

export function spendPrestige(player: Player, amount: number): boolean {
    if (!canSpendPrestige(player, amount)) return false;
    player.prestige -= amount;
    return true;
}

/**
 * Prestige spend options (v0.5)
 */
export const PRESTIGE_SPENDS = {
    REROLL_DICE: { cost: 1, description: "Reroll dice" },
    IGNORE_SKULL: { cost: 1, description: "Ignore 1 💀" },
    EXTRA_MODULE_SLOT: { cost: 2, description: "Extra module slot" },
    CRAFT_AMULET: { cost: 2, description: "Craft amulet" },
};
