/**
 * Card - Container card component with border and shadow
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';

export interface CardOptions {
    width: number;
    height: number;
    padding?: number;
    borderRadius?: number;
    bgColor?: number;
    bgAlpha?: number;
    borderColor?: number;
    borderWidth?: number;
    glowColor?: number;
    glowAlpha?: number;
}

export class Card extends PIXI.Container {
    private background: PIXI.Graphics;
    private contentContainer: PIXI.Container;
    private options: Required<CardOptions>;
    
    constructor(options: CardOptions) {
        super();
        
        this.options = {
            width: options.width,
            height: options.height,
            padding: options.padding ?? 24,
            borderRadius: options.borderRadius ?? 20,
            bgColor: options.bgColor ?? COLORS.cardBg,
            bgAlpha: options.bgAlpha ?? 0.95,
            borderColor: options.borderColor ?? COLORS.primary,
            borderWidth: options.borderWidth ?? 1,
            glowColor: options.glowColor ?? COLORS.primary,
            glowAlpha: options.glowAlpha ?? 0.1,
        };
        
        this.background = new PIXI.Graphics();
        this.contentContainer = new PIXI.Container();
        
        this.addChild(this.background);
        this.addChild(this.contentContainer);
        
        // Position content container with padding
        this.contentContainer.position.set(this.options.padding, this.options.padding);
        
        this.draw();
    }
    
    private draw(): void {
        const { width, height, borderRadius, bgColor, bgAlpha, borderColor, borderWidth, glowColor, glowAlpha } = this.options;
        
        this.background.clear();
        
        // Outer glow
        if (glowAlpha > 0) {
            this.background.roundRect(-4, -4, width + 8, height + 8, borderRadius + 4);
            this.background.fill({ color: glowColor, alpha: glowAlpha });
        }
        
        // Shadow
        this.background.roundRect(4, 8, width, height, borderRadius);
        this.background.fill({ color: 0x000000, alpha: 0.3 });
        
        // Main background
        this.background.roundRect(0, 0, width, height, borderRadius);
        this.background.fill({ color: bgColor, alpha: bgAlpha });
        
        // Border
        if (borderWidth > 0) {
            this.background.roundRect(0, 0, width, height, borderRadius);
            this.background.stroke({ color: borderColor, width: borderWidth, alpha: 0.2 });
        }
    }
    
    /**
     * Add content to the card (inside padding)
     */
    addContent(child: PIXI.Container): void {
        this.contentContainer.addChild(child);
    }
    
    /**
     * Get the inner content width (excluding padding)
     */
    get contentWidth(): number {
        return this.options.width - this.options.padding * 2;
    }
    
    /**
     * Get the inner content height (excluding padding)
     */
    get contentHeight(): number {
        return this.options.height - this.options.padding * 2;
    }
    
    /**
     * Update card size
     */
    resize(width: number, height: number): void {
        this.options.width = width;
        this.options.height = height;
        this.draw();
    }
}
