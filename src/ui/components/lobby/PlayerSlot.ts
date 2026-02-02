/**
 * PlayerSlot - Player slot component for lobby player list
 * Matching mockup design with minimal backgrounds
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';

// Player colors (matches mockup)
const PLAYER_COLORS = [0xff6b6b, 0x00aaff, 0xffd700, 0x00ff88];

// Race colors for display
const RACE_COLORS: Record<string, number> = {
    'Warden': 0x00ff88,   // Green
    'Striker': 0xffd700,   // Yellow/Gold
    'Mystic': 0xcc66ff,    // Purple
    'Seeker': 0x00ff88,    // Green
    'Smith': 0xffaa00,     // Orange
    'Runner': 0x00ddff,    // Cyan
    'Breaker': 0xff6666,   // Red
    'Oracle': 0xcc66ff,    // Purple
};

export interface PlayerSlotData {
    id: string;
    name: string;
    colorIndex: number; // 0-3
    race?: string;
    raceIcon?: string;
    isHost: boolean;
    isReady: boolean;
    isYou: boolean;
}

export interface PlayerSlotOptions {
    data: PlayerSlotData | null;
    width?: number;
    height?: number;
}

export class PlayerSlot extends PIXI.Container {
    private bg: PIXI.Graphics;
    private leftAccent: PIXI.Graphics;
    private colorDot: PIXI.Graphics;
    private nameText: PIXI.Text | null = null;
    private tagText: PIXI.Text | null = null;
    private raceContainer: PIXI.Container | null = null;
    private hostBadge: PIXI.Text | null = null;
    private readyBadge: PIXI.Container | null = null;

    private data: PlayerSlotData | null;
    private slotWidth: number;
    private slotHeight: number;

    constructor(options: PlayerSlotOptions) {
        super();

        this.data = options.data;
        this.slotWidth = options.width ?? 268;
        this.slotHeight = options.height ?? 52;

        this.bg = new PIXI.Graphics();
        this.leftAccent = new PIXI.Graphics();
        this.colorDot = new PIXI.Graphics();

        this.addChild(this.bg);
        this.addChild(this.leftAccent);
        this.addChild(this.colorDot);

        this.create();
    }

    private create(): void {
        this.createBackground();

        if (this.data) {
            this.createFilledSlot();
        } else {
            this.createEmptySlot();
        }
    }

    private createBackground(): void {
        this.bg.clear();
        this.leftAccent.clear();

        if (!this.data) {
            // Empty slot - very subtle, almost invisible
            // No background, just the content
        } else if (this.data.isYou) {
            // Your slot - subtle red left accent line + very subtle bg
            this.bg.roundRect(0, 0, this.slotWidth, this.slotHeight, 8);
            this.bg.fill({ color: 0xff6b6b, alpha: 0.05 });

            // Red accent line on left
            this.leftAccent.roundRect(0, 4, 3, this.slotHeight - 8, 2);
            this.leftAccent.fill({ color: 0xff6b6b, alpha: 0.8 });
        } else {
            // Other player - minimal/no background
            // Just a very subtle separator line at bottom if needed
        }
    }

    private createFilledSlot(): void {
        if (!this.data) return;

        const color = PLAYER_COLORS[this.data.colorIndex % PLAYER_COLORS.length];
        const hasTag = this.data.isYou || this.data.isHost;

        // Color dot with glow effect
        this.colorDot.clear();
        // Glow
        this.colorDot.circle(16, this.slotHeight / 2, 8);
        this.colorDot.fill({ color, alpha: 0.25 });
        // Main dot
        this.colorDot.circle(16, this.slotHeight / 2, 5);
        this.colorDot.fill({ color });

        // Name - larger and bolder
        this.nameText = new PIXI.Text({
            text: this.data.name,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 15,
                fontWeight: '700',
                fill: 0xffffff,
            }),
        });
        const nameY = hasTag ? 10 : (this.slotHeight - this.nameText.height) / 2;
        this.nameText.position.set(32, nameY);
        this.addChild(this.nameText);

        // Tag (YOU • HOST) - smaller, below name
        if (hasTag) {
            const tagParts: string[] = [];
            if (this.data.isYou) tagParts.push('YOU');
            if (this.data.isHost) tagParts.push('HOST');

            this.tagText = new PIXI.Text({
                text: tagParts.join(' • '),
                style: new PIXI.TextStyle({
                    fontFamily: FONT_FAMILIES.heading,
                    fontSize: 9,
                    fontWeight: '700',
                    fill: 0xff6b6b,
                    letterSpacing: 0.5,
                }),
            });
            this.tagText.position.set(32, 28);
            this.addChild(this.tagText);
        }

        // Race display - right side with race-specific color
        if (this.data.race) {
            this.raceContainer = new PIXI.Container();

            const raceColor = RACE_COLORS[this.data.race] || 0x00ddff;

            const raceIcon = new PIXI.Text({
                text: this.data.raceIcon || '👽',
                style: { fontSize: 13 },
            });
            this.raceContainer.addChild(raceIcon);

            const raceName = new PIXI.Text({
                text: this.data.race,
                style: new PIXI.TextStyle({
                    fontFamily: FONT_FAMILIES.heading,
                    fontSize: 12,
                    fontWeight: '600',
                    fill: raceColor,
                }),
            });
            raceName.position.set(20, 1);
            this.raceContainer.addChild(raceName);

            // Position from right
            const raceWidth = 20 + raceName.width;
            this.raceContainer.position.set(this.slotWidth - raceWidth - 35, (this.slotHeight - 16) / 2);
            this.addChild(this.raceContainer);
        }

        // Host badge (crown) - rightmost
        if (this.data.isHost) {
            this.hostBadge = new PIXI.Text({
                text: '👑',
                style: { fontSize: 14 },
            });
            this.hostBadge.position.set(this.slotWidth - 22, (this.slotHeight - 18) / 2);
            this.addChild(this.hostBadge);
        }

        // Ready badge - green pill
        if (this.data.isReady && !this.data.isHost) {
            this.createReadyBadge();
        }
    }

    private createReadyBadge(): void {
        this.readyBadge = new PIXI.Container();

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 48, 20, 10);
        bg.fill({ color: 0x00aa55 }); // Solid green like mockup
        this.readyBadge.addChild(bg);

        const text = new PIXI.Text({
            text: 'READY',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 9,
                fontWeight: '700',
                fill: 0xffffff,
                letterSpacing: 0.5,
            }),
        });
        text.position.set((48 - text.width) / 2, 4);
        this.readyBadge.addChild(text);

        this.readyBadge.position.set(this.slotWidth - 58, (this.slotHeight - 20) / 2);
        this.addChild(this.readyBadge);
    }

    private createEmptySlot(): void {
        // Gray dot - smaller and subtle
        this.colorDot.clear();
        this.colorDot.circle(16, this.slotHeight / 2, 5);
        this.colorDot.fill({ color: 0x444455 });

        // Waiting text - gray, italic style
        this.nameText = new PIXI.Text({
            text: 'Waiting for player...',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 13,
                fill: 0x555566,
            }),
        });
        this.nameText.position.set(32, (this.slotHeight - this.nameText.height) / 2);
        this.addChild(this.nameText);
    }

    update(data: PlayerSlotData | null): void {
        // Remove old children except bg, leftAccent and colorDot
        while (this.children.length > 3) {
            this.removeChildAt(3);
        }

        this.data = data;
        this.nameText = null;
        this.tagText = null;
        this.raceContainer = null;
        this.hostBadge = null;
        this.readyBadge = null;

        this.create();
    }
}
