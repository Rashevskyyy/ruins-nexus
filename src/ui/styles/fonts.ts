/**
 * Cosmic Frontier - Font Configuration
 */

import * as PIXI from 'pixi.js';
import { COLORS } from './colors';

// Font families with fallbacks
export const FONT_FAMILIES = {
    title: 'Orbitron, "Arial Black", sans-serif',
    heading: 'Rajdhani, "Segoe UI", sans-serif',
    body: 'Rajdhani, "Segoe UI", sans-serif',
    mono: '"Courier New", monospace',
} as const;

// Predefined text styles
export const TEXT_STYLES = {
    // Title styles
    gameTitle: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.title,
        fontSize: 56,
        fontWeight: '900',
        fill: COLORS.primaryLight,
        letterSpacing: 4,
        dropShadow: {
            color: COLORS.glowCyan,
            blur: 15,
            alpha: 0.8,
            distance: 0,
        },
    }),
    
    subtitle: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.heading,
        fontSize: 18,
        fontWeight: '500',
        fill: COLORS.textMuted,
        letterSpacing: 6,
    }),
    
    // Heading styles
    h1: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.heading,
        fontSize: 32,
        fontWeight: '700',
        fill: COLORS.textWhite,
    }),
    
    h2: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.heading,
        fontSize: 24,
        fontWeight: '700',
        fill: COLORS.textWhite,
    }),
    
    h3: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.heading,
        fontSize: 20,
        fontWeight: '600',
        fill: COLORS.textWhite,
    }),
    
    // Body styles
    body: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 16,
        fontWeight: '500',
        fill: COLORS.textWhite,
    }),
    
    bodySmall: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 14,
        fontWeight: '500',
        fill: COLORS.textLight,
    }),
    
    // Button styles
    button: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.heading,
        fontSize: 18,
        fontWeight: '700',
        fill: COLORS.textWhite,
        letterSpacing: 2,
    }),
    
    buttonSmall: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.heading,
        fontSize: 14,
        fontWeight: '600',
        fill: COLORS.textWhite,
        letterSpacing: 1,
    }),
    
    // Label styles
    label: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 12,
        fontWeight: '500',
        fill: COLORS.textLabel,
        letterSpacing: 1.5,
    }),
    
    // Input styles
    input: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 16,
        fontWeight: '500',
        fill: COLORS.textWhite,
    }),
    
    placeholder: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 16,
        fontWeight: '500',
        fill: COLORS.textDark,
    }),
    
    // Icon style (for emojis)
    icon: new PIXI.TextStyle({
        fontSize: 24,
    }),
    
    iconLarge: new PIXI.TextStyle({
        fontSize: 72,
    }),
    
    // Version/meta
    version: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.mono,
        fontSize: 12,
        fontWeight: '500',
        fill: COLORS.textMuted,
    }),
    
    // Feature row
    feature: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 13,
        fontWeight: '500',
        fill: COLORS.textMuted,
    }),
    
    // Info/tip
    info: new PIXI.TextStyle({
        fontFamily: FONT_FAMILIES.body,
        fontSize: 13,
        fontWeight: '500',
        fill: 0x77aaaa,
    }),
} as const;

// Create a clone of a style with overrides
export function createTextStyle(
    baseStyle: keyof typeof TEXT_STYLES,
    overrides: Partial<PIXI.TextStyleOptions>
): PIXI.TextStyle {
    const base = TEXT_STYLES[baseStyle];
    return new PIXI.TextStyle({
        ...base,
        ...overrides,
    } as PIXI.TextStyleOptions);
}
