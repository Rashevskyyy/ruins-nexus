/**
 * Cosmic Frontier - Color Palette
 */

export const COLORS = {
    // Backgrounds
    bgDark: 0x0a0e17,
    bgMid: 0x0d1525,
    bgLight: 0x141e2d,
    bgCard: 0x141e2d,
    
    // Primary (Cyan/Blue)
    primary: 0x00aaff,
    primaryLight: 0x00ddff,
    primaryDark: 0x0088cc,
    primaryDeep: 0x0055cc,
    
    // Secondary (Green)
    secondary: 0x00aa66,
    secondaryDark: 0x007744,
    secondaryLight: 0x00ff88,
    
    // Accent (Gold/Yellow)
    accent: 0xffd700,
    accentDark: 0xffaa00,
    accentLight: 0xffc864,
    
    // Text colors
    textWhite: 0xffffff,
    textLight: 0xaaaaaa,
    textMuted: 0x5a6a7a,
    textDark: 0x4a5568,
    textLabel: 0x6a7a8a,
    
    // Status colors
    success: 0x00ff88,
    error: 0xff6666,
    warning: 0xffaa00,
    
    // UI Element colors
    border: 0x1a2a3a,
    borderLight: 0x2a4a6a,
    borderSubtle: 0x1a2a3a,
    
    // Button-specific
    buttonPrimaryGradientStart: 0x0088ff,
    buttonPrimaryGradientEnd: 0x0055cc,
    buttonSecondaryGradientStart: 0x00aa66,
    buttonSecondaryGradientEnd: 0x007744,
    buttonTertiaryBg: 0x1a1a2e,
    
    // Card colors
    cardBg: 0x141e2d,
    cardBgDark: 0x0f1420,
    cardBorder: 0x1a2a3a,
    
    // Particle colors
    particleCyan: 0x00c8ff,
    particlePurple: 0x9664ff,
    particleGreen: 0x00ff96,
    particleOrange: 0xffc864,
    
    // Shadow/glow colors (for alpha operations)
    glowCyan: 0x00aaff,
    glowPrimary: 0x0064ff,
    glowSecondary: 0x006644,
} as const;

// Gradient definitions for use with Graphics API
export const GRADIENTS = {
    primaryButton: {
        colors: [0x0088ff, 0x0055cc],
        positions: [0, 1],
    },
    secondaryButton: {
        colors: [0x00aa66, 0x007744],
        positions: [0, 1],
    },
    background: {
        colors: [0x0a0e17, 0x0d1525, 0x0a1020],
        positions: [0, 0.5, 1],
    },
    title: {
        colors: [0x00ddff, 0x00aaff, 0x0088cc],
        positions: [0, 0.5, 1],
    },
} as const;

// RGBA values for shadows and glows (as hex with alpha)
export const SHADOWS = {
    primaryButton: { color: 0x0064ff, alpha: 0.4, blur: 30 },
    secondaryButton: { color: 0x006644, alpha: 0.3, blur: 30 },
    card: { color: 0x000000, alpha: 0.5, blur: 60 },
    glow: { color: 0x00aaff, alpha: 0.1, blur: 40 },
} as const;
