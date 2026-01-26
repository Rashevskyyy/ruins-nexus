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
        description: "+1 ⚔ per combat",
        emoji: "🔫",
        cost: { components: 2, alloys: 1, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "blaster_core" },
        item: {
            id: "blaster_core",
            name: "Blaster Core",
            type: "weapon",
            rarity: "common",
            description: "+1 ⚔ per combat",
            emoji: "🔫",
            effectId: "blaster_core",
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
        description: "+3 ⚔ per combat, -1 Move per turn",
        emoji: "💥",
        cost: { components: 4, alloys: 2, materials: 0, prestige: 0 },
        result: { type: "weapon", itemId: "heavy_cannon" },
        item: {
            id: "heavy_cannon",
            name: "Heavy Cannon",
            type: "weapon",
            rarity: "uncommon",
            description: "+3 ⚔ per combat, -1 Move per turn",
            emoji: "💥",
            effectId: "heavy_cannon",
        },
    },
    // Modules (special crafted items)
    {
        id: "reroll_module",
        name: "Reroll Module",
        description: "1 free reroll per combat",
        emoji: "🎲",
        cost: { components: 2, alloys: 0, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "reroll_module" },
        item: {
            id: "reroll_module",
            name: "Reroll Module",
            type: "spell", // Stored in spells slot
            rarity: "uncommon",
            description: "1 free reroll per combat",
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
        id: "overdrive",
        name: "Overdrive",
        description: "+2 ⚔ next combat (one-time)",
        emoji: "⚡",
        cost: { components: 3, alloys: 0, materials: 0, prestige: 0 },
        result: { type: "module", moduleId: "overdrive" },
        item: {
            id: "overdrive",
            name: "Overdrive",
            type: "spell", // One-time use
            rarity: "uncommon",
            description: "+2 ⚔ next combat (one-time)",
            emoji: "⚡",
            effectId: "overdrive",
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

        // Deduct resources
        player.components -= recipe.cost.components;
        player.alloys -= recipe.cost.alloys;
        player.materials -= recipe.cost.materials;
        player.prestige -= recipe.cost.prestige;

        // Add item to inventory
        if (recipe.item) {
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

        return { success: true, message: `Crafted ${recipe.name}!` };
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
