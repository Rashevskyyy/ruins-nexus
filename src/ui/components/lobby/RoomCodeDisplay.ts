/**
 * RoomCodeDisplay - Interactive room code display with glow effect and copy functionality
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';
import { tweenTo, TIMING } from '../../styles/animations';

export interface RoomCodeDisplayOptions {
    code: string;
    onCopy?: () => void;
}

export class RoomCodeDisplay extends PIXI.Container {
    private labelText: PIXI.Text;
    private codeText: PIXI.Text;
    private glowText: PIXI.Text;
    private hintText: PIXI.Text;
    private copiedText: PIXI.Text | null = null;

    private code: string;
    private onCopy: () => void;

    constructor(options: RoomCodeDisplayOptions) {
        super();

        this.code = options.code;
        this.onCopy = options.onCopy ?? (() => {});

        // Label
        this.labelText = new PIXI.Text({
            text: 'ROOM CODE (CLICK TO COPY)',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 11,
                fontWeight: '600',
                fill: 0x5a7a6a,
                letterSpacing: 1.5,
            }),
        });
        this.labelText.anchor.set(0.5, 0);
        this.labelText.position.set(0, 0);
        this.addChild(this.labelText);

        // Glow text (behind main text)
        this.glowText = new PIXI.Text({
            text: this.code,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.title,
                fontSize: 42,
                fontWeight: '900',
                fill: 0x00ff88,
                letterSpacing: 12,
            }),
        });
        this.glowText.anchor.set(0.5, 0);
        this.glowText.position.set(0, 25);
        this.glowText.alpha = 0.5;
        // Create blur effect using filters
        const blurFilter = new PIXI.BlurFilter({
            strength: 8,
            quality: 4,
        });
        this.glowText.filters = [blurFilter];
        this.addChild(this.glowText);

        // Main code text
        this.codeText = new PIXI.Text({
            text: this.code,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.title,
                fontSize: 42,
                fontWeight: '900',
                fill: 0x00ff88,
                letterSpacing: 12,
            }),
        });
        this.codeText.anchor.set(0.5, 0);
        this.codeText.position.set(0, 25);
        this.addChild(this.codeText);

        // Hint text
        this.hintText = new PIXI.Text({
            text: 'Share this code with friends!',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 11,
                fill: 0x4a6a5a,
            }),
        });
        this.hintText.anchor.set(0.5, 0);
        this.hintText.position.set(0, 85);
        this.addChild(this.hintText);

        this.setupInteraction();
    }

    private setupInteraction(): void {
        this.eventMode = 'static';
        this.cursor = 'pointer';

        // Create hit area
        this.hitArea = new PIXI.Rectangle(-100, -10, 200, 120);

        this.on('pointerover', () => {
            tweenTo(this.codeText, { scaleX: 1.05, scaleY: 1.05 }, TIMING.buttonHover);
            // Increase glow blur on hover
            const blurFilter = this.glowText.filters?.[0] as PIXI.BlurFilter;
            if (blurFilter) {
                blurFilter.strength = 15;
            }
        });

        this.on('pointerout', () => {
            tweenTo(this.codeText, { scaleX: 1, scaleY: 1 }, TIMING.buttonHover);
            // Reset glow blur
            const blurFilter = this.glowText.filters?.[0] as PIXI.BlurFilter;
            if (blurFilter) {
                blurFilter.strength = 8;
            }
        });

        this.on('pointerdown', async () => {
            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(this.code);
                this.showCopiedFeedback();
                this.onCopy();
            } catch (err) {
                console.error('Failed to copy room code:', err);
            }
        });
    }

    private showCopiedFeedback(): void {
        // Flash effect on code
        const originalTint = this.codeText.tint;
        this.codeText.tint = 0xffffff;
        setTimeout(() => {
            this.codeText.tint = originalTint;
        }, 100);

        // Show "Copied!" text
        if (this.copiedText) {
            this.copiedText.destroy();
        }

        this.copiedText = new PIXI.Text({
            text: '✓ Copied!',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 12,
                fontWeight: '700',
                fill: 0x00ff88,
            }),
        });
        this.copiedText.anchor.set(0.5, 0);
        this.copiedText.position.set(0, 75);
        this.copiedText.alpha = 0;
        this.addChild(this.copiedText);

        // Fade in
        tweenTo(this.copiedText, { alpha: 1 }, 150);

        // Hide hint temporarily
        this.hintText.visible = false;

        // Fade out and clean up after delay
        setTimeout(() => {
            if (this.copiedText) {
                tweenTo(this.copiedText, { alpha: 0 }, 300);
                setTimeout(() => {
                    if (this.copiedText) {
                        this.copiedText.destroy();
                        this.copiedText = null;
                    }
                    this.hintText.visible = true;
                }, 300);
            }
        }, 1200);
    }

    setCode(code: string): void {
        this.code = code;
        this.codeText.text = code;
        this.glowText.text = code;
    }

    getHeight(): number {
        return 110;
    }
}
