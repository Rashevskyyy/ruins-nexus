/**
 * CarouselArrow - Circular arrow button for race carousel navigation
 */

import * as PIXI from 'pixi.js';
import { tweenTo, TIMING } from '../../styles/animations';

export type ArrowDirection = 'left' | 'right';

export interface CarouselArrowOptions {
    direction: ArrowDirection;
    size?: number;
    onClick?: () => void;
}

export class CarouselArrow extends PIXI.Container {
    private bg: PIXI.Graphics;
    private arrow: PIXI.Text;
    private options: Required<CarouselArrowOptions>;
    private isHovered = false;

    constructor(options: CarouselArrowOptions) {
        super();

        this.options = {
            direction: options.direction,
            size: options.size ?? 40,
            onClick: options.onClick ?? (() => {}),
        };

        this.bg = new PIXI.Graphics();
        this.addChild(this.bg);

        // Arrow icon
        this.arrow = new PIXI.Text({
            text: this.options.direction === 'left' ? '◀' : '▶',
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0x666666,
            }),
        });
        this.arrow.anchor.set(0.5);
        this.arrow.position.set(this.options.size / 2, this.options.size / 2);
        this.addChild(this.arrow);

        this.drawNormal();
        this.setupInteraction();
    }

    private drawNormal(): void {
        const { size } = this.options;
        const radius = size / 2;

        this.bg.clear();
        this.bg.circle(radius, radius, radius);
        this.bg.fill({ color: 0x000000, alpha: 0.7 });
        this.bg.circle(radius, radius, radius);
        this.bg.stroke({ color: 0xffffff, width: 1, alpha: 0.15 });

        this.arrow.style.fill = 0x666666;
    }

    private drawHover(): void {
        const { size } = this.options;
        const radius = size / 2;

        this.bg.clear();
        this.bg.circle(radius, radius, radius);
        this.bg.fill({ color: 0x00aaff, alpha: 0.2 });
        this.bg.circle(radius, radius, radius);
        this.bg.stroke({ color: 0x00aaff, width: 2, alpha: 0.8 });

        this.arrow.style.fill = 0x00ddff;
    }

    private setupInteraction(): void {
        this.eventMode = 'static';
        this.cursor = 'pointer';
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.size, this.options.size);

        this.on('pointerover', () => {
            this.isHovered = true;
            this.drawHover();
            tweenTo(this, { scaleX: 1.1, scaleY: 1.1 }, TIMING.buttonHover);
        });

        this.on('pointerout', () => {
            this.isHovered = false;
            this.drawNormal();
            tweenTo(this, { scaleX: 1, scaleY: 1 }, TIMING.buttonHover);
        });

        this.on('pointerdown', () => {
            tweenTo(this, { scaleX: 0.95, scaleY: 0.95 }, TIMING.buttonClick);
        });

        this.on('pointerup', () => {
            tweenTo(this, { scaleX: this.isHovered ? 1.1 : 1, scaleY: this.isHovered ? 1.1 : 1 }, TIMING.buttonClick);
            this.options.onClick();
        });
    }
}
