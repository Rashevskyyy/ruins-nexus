/**
 * FloatingParticles - Colorful floating particle effect
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';

interface Particle {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    size: number;
    color: number;
    alpha: number;
    phase: number;
    speed: number;
    amplitude: number;
}

const PARTICLE_COLORS = [
    COLORS.particleCyan,
    COLORS.particlePurple,
    COLORS.particleGreen,
    COLORS.particleOrange,
];

export class FloatingParticles extends PIXI.Container {
    private particles: Particle[] = [];
    private graphics: PIXI.Graphics;
    private _width: number;
    private _height: number;
    private time = 0;
    
    constructor(width: number, height: number, particleCount: number = 15) {
        super();
        
        this._width = width;
        this._height = height;
        this.graphics = new PIXI.Graphics();
        this.addChild(this.graphics);
        
        // Generate particles
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(this.createParticle());
        }
        
        this.draw();
    }
    
    private createParticle(): Particle {
        const baseX = Math.random() * this._width;
        const baseY = Math.random() * this._height;
        
        return {
            x: baseX,
            y: baseY,
            baseX,
            baseY,
            size: Math.random() * 3 + 3, // 3-6px
            color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            alpha: Math.random() * 0.3 + 0.4, // 0.4 - 0.7
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.0008 + 0.0004, // Animation speed
            amplitude: Math.random() * 30 + 20, // Movement range
        };
    }
    
    update(deltaMs: number): void {
        this.time += deltaMs;
        
        for (const particle of this.particles) {
            const t = this.time * particle.speed + particle.phase;
            
            // Figure-8 / Lissajous curve motion
            particle.x = particle.baseX + Math.sin(t) * particle.amplitude;
            particle.y = particle.baseY + Math.sin(t * 2) * (particle.amplitude * 0.5);
            
            // Pulse alpha
            particle.alpha = 0.4 + Math.sin(t * 1.5) * 0.3;
        }
        
        this.draw();
    }
    
    private draw(): void {
        this.graphics.clear();
        
        for (const particle of this.particles) {
            // Draw particle with glow effect (outer circle)
            this.graphics.circle(particle.x, particle.y, particle.size * 2);
            this.graphics.fill({ color: particle.color, alpha: particle.alpha * 0.2 });
            
            // Core particle
            this.graphics.circle(particle.x, particle.y, particle.size);
            this.graphics.fill({ color: particle.color, alpha: particle.alpha });
        }
    }
    
    resize(width: number, height: number): void {
        const scaleX = width / this._width;
        const scaleY = height / this._height;
        
        this._width = width;
        this._height = height;
        
        // Scale particle positions
        for (const particle of this.particles) {
            particle.baseX *= scaleX;
            particle.baseY *= scaleY;
            particle.x = particle.baseX;
            particle.y = particle.baseY;
        }
        
        this.draw();
    }
    
    destroy(): void {
        this.particles = [];
        super.destroy({ children: true });
    }
}
