export type ItemType = "weapon" | "spell" | "amulet";
export type ItemRarity = "common" | "uncommon" | "legendary";

export type Item = {
    id: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    description: string;
    emoji: string;
    // Effect hooks (for future implementation)
    effectId?: string;
};

// ========================================
// ITEM POOLS (v0.3 - Fixed, deterministic)
// ========================================

// Common Items (from CommonLoot token)
export const COMMON_ITEMS: Item[] = [
    {
        id: "blaster_core",
        name: "Blaster Core",
        type: "weapon",
        rarity: "common",
        description: "+1 ⚔",
        emoji: "🔫",
        effectId: "blaster_core",
    },
    {
        id: "shock_blade",
        name: "Shock Blade",
        type: "weapon",
        rarity: "common",
        description: "+1 ⚔, no 💀 on win",
        emoji: "⚡",
        effectId: "shock_blade",
    },
    {
        id: "reroll_module",
        name: "Reroll Module",
        type: "spell",
        rarity: "common",
        description: "1 reroll per combat (if 0⚔)",
        emoji: "🎲",
        effectId: "reroll_module",
    },
];

// Uncommon Items (from UncommonLoot token)
export const UNCOMMON_ITEMS: Item[] = [
    {
        id: "plasma_edge",
        name: "Plasma Edge",
        type: "weapon",
        rarity: "uncommon",
        description: "+2 ⚔ if roll ≥1 ⚔",
        emoji: "⚡",
        effectId: "plasma_edge",
    },
    {
        id: "arc_rifle",
        name: "Arc Rifle",
        type: "weapon",
        rarity: "uncommon",
        description: "+1 ⚔ per tile moved (max +3)",
        emoji: "🏹",
        effectId: "arc_rifle",
    },
    {
        id: "shield_matrix",
        name: "Shield Matrix",
        type: "spell",
        rarity: "uncommon",
        description: "-1 💀 per combat",
        emoji: "🛡️",
        effectId: "shield_matrix",
    },
];

// Spells (from SpellToken - one-time use)
export const SPELL_ITEMS: Item[] = [
    {
        id: "overdrive",
        name: "Overdrive",
        type: "spell",
        rarity: "uncommon",
        description: "+3 ⚔ next combat (one-time)",
        emoji: "⚡",
        effectId: "overdrive",
    },
    {
        id: "emergency_repair",
        name: "Emergency Repair",
        type: "spell",
        rarity: "uncommon",
        description: "Heal +3 HP (one-time)",
        emoji: "🧰",
        effectId: "emergency_repair",
    },
    {
        id: "escape_pod",
        name: "Escape Pod",
        type: "spell",
        rarity: "uncommon",
        description: "Teleport to Base (no recall)",
        emoji: "🚀",
        effectId: "escape_pod",
    },
];

// Legendary Items (from Legendary token - winner only)
export const LEGENDARY_ITEMS: Item[] = [
    {
        id: "core_relic",
        name: "Core Relic",
        type: "amulet",
        rarity: "legendary",
        description: "+1 ⚔ and -1 💀",
        emoji: "💎",
        effectId: "core_relic",
    },
    {
        id: "void_pendant",
        name: "Void Pendant",
        type: "amulet",
        rarity: "legendary",
        description: "Recall doesn't consume use",
        emoji: "💠",
        effectId: "void_pendant",
    },
    {
        id: "guardians_crest",
        name: "Guardian's Crest",
        type: "amulet",
        rarity: "legendary",
        description: "×2 rewards from Guardians",
        emoji: "🛡️",
        effectId: "guardians_crest",
    },
];

// Get items by token type
import type { TokenType } from "../board/TileDeck";

export function getItemsForToken(token: TokenType): Item[] {
    switch (token) {
        case "CommonLoot":
            return COMMON_ITEMS;
        case "UncommonLoot":
            return UNCOMMON_ITEMS;
        case "SpellToken":
            return SPELL_ITEMS;
        case "Legendary":
            return LEGENDARY_ITEMS;
        case "Medkit":
            return []; // Medkit is applied immediately, no choice
        default:
            return [];
    }
}
