/**
 * LobbyCard - Card component with gradient background and neon border glow
 * Following mockup: linear-gradient(180deg, rgba(18, 26, 40, 0.95) 0%, rgba(12, 18, 28, 0.98) 100%)
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';

export interface LobbyCardOptions {
    width: number;
    height: number;
    headerIcon?: string;
    headerTitle?: string;
    headerRight?: string;
    borderColor?: number;
    borderGlow?: boolean;
    borderRadius?: number;
}

export class LobbyCard extends PIXI.Container {
    private glowBg: PIXI.Graphics;
    private bg: PIXI.Graphics;
    private headerBg: PIXI.Graphics | null = null;
    private headerIcon: PIXI.Text | null = null;
    private headerTitle: PIXI.Text | null = null;
    private headerRightText: PIXI.Text | null = null;
    private bodyContainer: PIXI.Container;

    private options: Required<Omit<LobbyCardOptions, 'headerIcon' | 'headerTitle' | 'headerRight'>> & {
        headerIcon?: string;
        headerTitle?: string;
        headerRight?: string;
    };

    constructor(options: LobbyCardOptions) {
        super();

        this.options = {
            width: options.width,
            height: options.height,
            headerIcon: options.headerIcon,
            headerTitle: options.headerTitle,
            headerRight: options.headerRight,
            borderColor: options.borderColor ?? 0x00aaff,
            borderGlow: options.borderGlow ?? true,
            borderRadius: options.borderRadius ?? 16,
        };

        // Glow layer (behind main bg)
        this.glowBg = new PIXI.Graphics();
        this.addChild(this.glowBg);

        // Main background
        this.bg = new PIXI.Graphics();
        this.addChild(this.bg);

        // Header (if title provided)
        if (this.options.headerTitle) {
            this.createHeader();
        }

        // Body container
        this.bodyContainer = new PIXI.Container();
        this.bodyContainer.y = this.options.headerTitle ? 50 : 0;
        this.addChild(this.bodyContainer);

        this.drawBackground();
    }

    private drawBackground(): void {
        const { width, height, borderColor, borderGlow, borderRadius } = this.options;

        this.glowBg.clear();
        this.bg.clear();

        // Outer neon glow effect (multiple layers for soft glow)
        if (borderGlow) {
            // Outermost glow - very soft
            // this.glowBg.roundRect(-4, -4, width + 8, height + 8, borderRadius + 4);
            // this.glowBg.fill({ color: borderColor, alpha: 0.05 });
            //
            // // Middle glow
            // this.glowBg.roundRect(-2, -2, width + 4, height + 4, borderRadius + 2);
            // this.glowBg.fill({ color: borderColor, alpha: 0.5 });
        }

        // Main card background - gradient from top to bottom
        // Top part: rgba(18, 26, 40, 0.95) = 0x121a28
        // this.bg.roundRect(0, 0, width, height, borderRadius);
        // this.bg.fill({ color: 0x121a28, alpha: 0.95 });

        // Bottom gradient overlay: rgba(12, 18, 28, 0.98) = 0x0c121c
        // Create gradient effect by layering
        // const gradientHeight = height * 0.6;
        // this.bg.roundRect(0, height - gradientHeight, width, gradientHeight, borderRadius);
        // this.bg.fill({ color: 0x0c121c, alpha: 0.5 });

        // Border with neon effect
        this.bg.roundRect(0, 0, width, height, borderRadius);
        this.bg.stroke({ color: borderColor, width: 1, alpha: 0.5
        });

        // Inner subtle border for depth
        this.bg.roundRect(1, 1, width - 2, height - 2, borderRadius - 1);
        this.bg.stroke({ color: 0xffffff, width: 1, alpha: 0.03 });
    }

    private createHeader(): void {
        const { width, borderRadius, headerIcon, headerTitle, headerRight } = this.options;

        // Header background
        this.headerBg = new PIXI.Graphics();

        // Top rounded part
        this.headerBg.roundRect(0, 0, width, 50, borderRadius);
        this.headerBg.fill({ color: 0x000000, alpha: 0.25 });

        // Fill in bottom corners
        // this.headerBg.rect(0, 34, width, 16);
        // this.headerBg.fill({ color: 0x000000, alpha: 0.25 });

        // Bottom border line
        this.headerBg.moveTo(0, 49);
        this.headerBg.lineTo(width, 49);
        this.headerBg.stroke({ color: 0xffffff, width: 1, alpha: 0.05 });

        this.addChild(this.headerBg);

        // Icon
        if (headerIcon) {
            this.headerIcon = new PIXI.Text({
                text: headerIcon,
                style: { fontSize: 18 },
            });
            this.headerIcon.position.set(18, 14);
            this.addChild(this.headerIcon);
        }

        // Title
        if (headerTitle) {
            this.headerTitle = new PIXI.Text({
                text: headerTitle,
                style: new PIXI.TextStyle({
                    fontFamily: FONT_FAMILIES.heading,
                    fontSize: 14,
                    fontWeight: '700',
                    fill: 0x00ddff,
                    letterSpacing: 1.5,
                }),
            });
            this.headerTitle.position.set(headerIcon ? 44 : 18, 16);
            this.addChild(this.headerTitle);
        }

        // Right text
        if (headerRight) {
            this.headerRightText = new PIXI.Text({
                text: headerRight,
                style: new PIXI.TextStyle({
                    fontFamily: FONT_FAMILIES.heading,
                    fontSize: 13,
                    fill: 0x666666,
                }),
            });
            this.headerRightText.position.set(width - this.headerRightText.width - 18, 17);
            this.addChild(this.headerRightText);
        }
    }

    get body(): PIXI.Container {
        return this.bodyContainer;
    }

    setHeaderRight(text: string): void {
        if (this.headerRightText) {
            this.headerRightText.text = text;
            this.headerRightText.x = this.options.width - this.headerRightText.width - 18;
        }
    }

    get contentWidth(): number {
        return this.options.width;
    }

    get contentHeight(): number {
        return this.options.height - (this.options.headerTitle ? 50 : 0);
    }

    setBorderColor(color: number): void {
        this.options.borderColor = color;
        this.drawBackground();
    }
}
