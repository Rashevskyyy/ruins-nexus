/**
 * StarField - Animated star background effect
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';

interface Star {
    x: number;
    y: number;
    size: number;
    alpha: number;
    speed: number;
    twinkleSpeed: number;
    twinklePhase: number;
}

export class StarField extends PIXI.Container {
    private stars: Star[] = [];
    private graphics: PIXI.Graphics;
    private _width: number;
    private _height: number;
    private time = 0;
    
    constructor(width: number, height: number, starCount: number = 100) {
        super();
        
        this._width = width;
        this._height = height;
        this.graphics = new PIXI.Graphics();
        this.addChild(this.graphics);
        
        // Generate stars
        for (let i = 0; i < starCount; i++) {
            this.stars.push(this.createStar());
        }
        
        this.draw();
    }
    
    private createStar(startFromBottom = false): Star {
        return {
            x: Math.random() * this._width,
            y: startFromBottom ? this._height + Math.random() * 50 : Math.random() * this._height,
            size: Math.random() * 1.5 + 0.5, // 0.5 - 2px
            alpha: Math.random() * 0.3 + 0.5, // 0.5 - 0.8
            speed: Math.random() * 0.3 + 0.1, // Slow drift speed
            twinkleSpeed: Math.random() * 0.002 + 0.001,
            twinklePhase: Math.random() * Math.PI * 2,
        };
    }
    
    update(deltaMs: number): void {
        this.time += deltaMs;
        
        for (const star of this.stars) {
            // Move star upward slowly (parallax effect)
            star.y -= star.speed * (deltaMs / 16.67);
            
            // Wrap around when off screen
            if (star.y < -10) {
                star.y = this._height + 10;
                star.x = Math.random() * this._width;
            }
            
            // Twinkle effect - vary alpha based on time
            star.alpha = 0.5 + Math.sin(this.time * star.twinkleSpeed + star.twinklePhase) * 0.3;
        }
        
        this.draw();
    }
    
    private draw(): void {
        this.graphics.clear();
        
        for (const star of this.stars) {
            // Draw star as small circle
            this.graphics.circle(star.x, star.y, star.size);
            this.graphics.fill({ color: COLORS.textWhite, alpha: star.alpha });
        }
    }
    
    resize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        
        // Redistribute stars
        for (const star of this.stars) {
            if (star.x > width) star.x = Math.random() * width;
            if (star.y > height) star.y = Math.random() * height;
        }
        
        this.draw();
    }
    
    destroy(): void {
        this.stars = [];
        super.destroy({ children: true });
    }
}
