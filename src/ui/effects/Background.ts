/**
 * Background - Complete animated background with gradient, stars, and particles
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { StarField } from './StarField';
import { FloatingParticles } from './FloatingParticles';

export class Background extends PIXI.Container {
    private bgGraphics: PIXI.Graphics;
    private starField: StarField;
    private particles: FloatingParticles;
    private hexOverlay: PIXI.Graphics;
    private _width: number;
    private _height: number;
    
    constructor(width: number, height: number) {
        super();
        
        this._width = width;
        this._height = height;
        
        // Create layers
        this.bgGraphics = new PIXI.Graphics();
        this.starField = new StarField(width, height, 100);
        this.particles = new FloatingParticles(width, height, 15);
        this.hexOverlay = new PIXI.Graphics();
        
        // Add in order (back to front)
        this.addChild(this.bgGraphics);
        this.addChild(this.starField);
        this.addChild(this.hexOverlay);
        this.addChild(this.particles);
        
        this.drawBackground();
        this.drawHexOverlay();
    }
    
    private drawBackground(): void {
        this.bgGraphics.clear();
        
        // Base dark background
        this.bgGraphics.rect(0, 0, this._width, this._height);
        this.bgGraphics.fill({ color: COLORS.bgDark });
        
        // Add radial gradient effects using multiple circles
        // Top-left cyan glow
        const gradient1X = this._width * 0.2;
        const gradient1Y = this._height * 0.2;
        const gradient1Radius = Math.max(this._width, this._height) * 0.6;
        
        for (let i = 10; i > 0; i--) {
            const radius = gradient1Radius * (i / 10);
            const alpha = 0.015 * (1 - i / 10);
            this.bgGraphics.circle(gradient1X, gradient1Y, radius);
            this.bgGraphics.fill({ color: 0x006496, alpha });
        }
        
        // Bottom-right purple glow
        const gradient2X = this._width * 0.8;
        const gradient2Y = this._height * 0.8;
        const gradient2Radius = Math.max(this._width, this._height) * 0.5;
        
        for (let i = 10; i > 0; i--) {
            const radius = gradient2Radius * (i / 10);
            const alpha = 0.01 * (1 - i / 10);
            this.bgGraphics.circle(gradient2X, gradient2Y, radius);
            this.bgGraphics.fill({ color: 0x640096, alpha });
        }
    }
    
    private drawHexOverlay(): void {
        // Very subtle hex grid pattern
        this.hexOverlay.clear();
        this.hexOverlay.alpha = 0.03;
        
        const hexSize = 40;
        const hexHeight = hexSize * Math.sqrt(3);
        const hexWidth = hexSize * 2;
        
        for (let row = -1; row < this._height / hexHeight + 1; row++) {
            for (let col = -1; col < this._width / (hexWidth * 0.75) + 1; col++) {
                const x = col * hexWidth * 0.75;
                const y = row * hexHeight + (col % 2 ? hexHeight / 2 : 0);
                
                this.drawHex(x, y, hexSize);
            }
        }
    }
    
    private drawHex(cx: number, cy: number, size: number): void {
        const points: number[] = [];
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            points.push(cx + size * Math.cos(angle));
            points.push(cy + size * Math.sin(angle));
        }
        
        this.hexOverlay.poly(points);
        this.hexOverlay.stroke({ color: COLORS.textWhite, width: 1 });
    }
    
    update(deltaMs: number): void {
        this.starField.update(deltaMs);
        this.particles.update(deltaMs);
    }
    
    resize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        
        this.drawBackground();
        this.drawHexOverlay();
        this.starField.resize(width, height);
        this.particles.resize(width, height);
    }
    
    destroy(): void {
        super.destroy({ children: true });
    }
}
