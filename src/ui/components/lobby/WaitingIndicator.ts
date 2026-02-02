/**
 * WaitingIndicator - Pulsing waiting indicator for lobby
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';

export interface WaitingIndicatorOptions {
    message?: string;
}

export class WaitingIndicator extends PIXI.Container {
    private bg: PIXI.Graphics;
    private dot: PIXI.Graphics;
    private text: PIXI.Text;
    private time = 0;

    private message: string;

    constructor(options: WaitingIndicatorOptions = {}) {
        super();

        this.message = options.message ?? 'Waiting for players...';

        // Background pill
        this.bg = new PIXI.Graphics();
        this.bg.roundRect(0, 0, 220, 40, 20);
        this.bg.fill({ color: 0xffaa00, alpha: 0.1 });
        this.bg.roundRect(0, 0, 220, 40, 20);
        this.bg.stroke({ color: 0xffaa00, width: 1, alpha: 0.2 });
        this.addChild(this.bg);

        // Pulsing dot
        this.dot = new PIXI.Graphics();
        this.drawDot(1);
        this.addChild(this.dot);

        // Text
        this.text = new PIXI.Text({
            text: this.message,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 13,
                fill: 0xffaa00,
            }),
        });
        this.text.position.set(35, (40 - this.text.height) / 2);
        this.addChild(this.text);
    }

    private drawDot(scale: number): void {
        this.dot.clear();
        this.dot.circle(20, 20, 4 * scale);
        this.dot.fill({ color: 0xffaa00 });
    }

    /**
     * Update the pulse animation - call this in the game loop
     */
    update(deltaMs: number): void {
        this.time += deltaMs;

        // Sine wave pulse: 0.75 second period
        const phase = (this.time / 750) * Math.PI;
        const pulse = 0.4 + Math.abs(Math.sin(phase)) * 0.6;

        this.dot.alpha = pulse;
        this.drawDot(0.7 + pulse * 0.3);
    }

    setMessage(message: string): void {
        this.message = message;
        this.text.text = message;
    }

    getWidth(): number {
        return 220;
    }

    getHeight(): number {
        return 40;
    }
}
