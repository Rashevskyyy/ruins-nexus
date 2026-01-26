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
        id: "pulse_blade",
        name: "Pulse Blade",
        type: "weapon",
        rarity: "common",
        description: "+1 ⚔ once per combat",
        emoji: "🗡️",
        effectId: "pulse_blade",
    },
    {
        id: "shock_pike",
        name: "Shock Pike",
        type: "weapon",
        rarity: "common",
        description: "If roll ≥2 ⚔ then +1 ⚔",
        emoji: "⚡",
        effectId: "shock_pike",
    },
    {
        id: "stabilizer_plating",
        name: "Stabilizer Plating",
        type: "amulet",
        rarity: "common",
        description: "Ignore first 💀 once per combat",
        emoji: "🛡️",
        effectId: "stabilizer_plating",
    },
];

// Uncommon Items (from UncommonLoot token)
export const UNCOMMON_ITEMS: Item[] = [
    {
        id: "targeting_array",
        name: "Targeting Array",
        type: "weapon",
        rarity: "uncommon",
        description: "1 reroll per combat",
        emoji: "🎯",
        effectId: "targeting_array",
    },
    {
        id: "reinforced_suit",
        name: "Reinforced Suit",
        type: "amulet",
        rarity: "uncommon",
        description: "Max HP +1",
        emoji: "🧥",
        effectId: "reinforced_suit",
    },
    {
        id: "heavy_striker",
        name: "Heavy Striker",
        type: "weapon",
        rarity: "uncommon",
        description: "If roll 0 ⚔, reroll once per combat",
        emoji: "🔨",
        effectId: "heavy_striker",
    },
];

// Spells (from SpellToken - one-time use)
export const SPELL_ITEMS: Item[] = [
    {
        id: "overcharge",
        name: "Overcharge",
        type: "spell",
        rarity: "uncommon",
        description: "+2 ⚔ to next roll (one-time)",
        emoji: "⚡",
        effectId: "overcharge",
    },
    {
        id: "med_gel",
        name: "Med Gel",
        type: "spell",
        rarity: "uncommon",
        description: "Heal +2 HP (one-time)",
        emoji: "💊",
        effectId: "med_gel",
    },
    {
        id: "scanner_pulse",
        name: "Scanner Pulse",
        type: "spell",
        rarity: "uncommon",
        description: "View top 2 tiles of deck (one-time)",
        emoji: "📡",
        effectId: "scanner_pulse",
    },
];

// Legendary Items (from Legendary token - winner only)
export const LEGENDARY_ITEMS: Item[] = [
    {
        id: "quantum_blade",
        name: "Quantum Blade",
        type: "weapon",
        rarity: "legendary",
        description: "+2 ⚔ per combat",
        emoji: "⚔️",
        effectId: "quantum_blade",
    },
    {
        id: "chrono_shield",
        name: "Chrono Shield",
        type: "amulet",
        rarity: "legendary",
        description: "Ignore all 💀 once per combat",
        emoji: "🔮",
        effectId: "chrono_shield",
    },
    {
        id: "void_capacitor",
        name: "Void Capacitor",
        type: "amulet",
        rarity: "legendary",
        description: "Unlimited rerolls per combat",
        emoji: "💠",
        effectId: "void_capacitor",
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
