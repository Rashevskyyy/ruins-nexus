/**
 * Cosmic Frontier - Animation Utilities
 */

import * as PIXI from 'pixi.js';

// Easing functions
export const EASINGS = {
    // Power easings
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    
    // Smooth power2.out equivalent
    smooth: (t: number) => 1 - Math.pow(1 - t, 2),
    
    // Back easing (overshoot)
    backOut: (t: number, overshoot: number = 1.7) => {
        const c1 = overshoot;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    
    // Elastic easing
    elasticOut: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    
    // Bounce
    bounceOut: (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
} as const;

// Animation timing constants
export const TIMING = {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
    
    // Specific animations
    buttonHover: 200,
    buttonClick: 100,
    cardAppear: 500,
    toggleSwitch: 300,
    shine: 500,
    pulse: 2000,
    float: 4000,
} as const;

// Animation state interface
interface AnimationState {
    id: number;
    target: PIXI.Container;
    properties: Record<string, { start: number; end: number }>;
    duration: number;
    elapsed: number;
    easing: (t: number) => number;
    onComplete?: () => void;
    onUpdate?: (progress: number) => void;
}

// Simple animation manager
class AnimationManager {
    private animations: Map<number, AnimationState> = new Map();
    private nextId = 0;
    private tickerCallback: ((delta: PIXI.Ticker) => void) | null = null;
    private ticker: PIXI.Ticker | null = null;
    
    /**
     * Initialize the animation manager with a ticker
     */
    init(ticker: PIXI.Ticker): void {
        if (this.tickerCallback) return;
        
        this.ticker = ticker;
        this.tickerCallback = (ticker: PIXI.Ticker) => this.update(ticker.deltaMS);
        ticker.add(this.tickerCallback);
    }
    
    /**
     * Create a simple tween animation
     */
    animate(
        target: PIXI.Container,
        properties: Record<string, number>,
        duration: number,
        options: {
            easing?: (t: number) => number;
            onComplete?: () => void;
            onUpdate?: (progress: number) => void;
        } = {}
    ): number {
        const id = this.nextId++;
        const propStates: Record<string, { start: number; end: number }> = {};
        
        for (const [key, endValue] of Object.entries(properties)) {
            const startValue = this.getProperty(target, key);
            propStates[key] = { start: startValue, end: endValue };
        }
        
        this.animations.set(id, {
            id,
            target,
            properties: propStates,
            duration,
            elapsed: 0,
            easing: options.easing || EASINGS.smooth,
            onComplete: options.onComplete,
            onUpdate: options.onUpdate,
        });
        
        return id;
    }
    
    /**
     * Stop an animation
     */
    stop(id: number): void {
        this.animations.delete(id);
    }
    
    /**
     * Stop all animations for a target
     */
    stopAll(target: PIXI.Container): void {
        for (const [id, anim] of this.animations) {
            if (anim.target === target) {
                this.animations.delete(id);
            }
        }
    }
    
    /**
     * Update all animations
     */
    private update(deltaMs: number): void {
        for (const [id, anim] of this.animations) {
            // Skip if target was destroyed
            if (anim.target.destroyed) {
                this.animations.delete(id);
                continue;
            }

            anim.elapsed += deltaMs;
            const progress = Math.min(1, anim.elapsed / anim.duration);
            const easedProgress = anim.easing(progress);

            // Apply properties
            for (const [key, { start, end }] of Object.entries(anim.properties)) {
                const value = start + (end - start) * easedProgress;
                this.setProperty(anim.target, key, value);
            }

            anim.onUpdate?.(easedProgress);

            // Check if complete
            if (progress >= 1) {
                this.animations.delete(id);
                anim.onComplete?.();
            }
        }
    }
    
    private getProperty(target: PIXI.Container, key: string): number {
        switch (key) {
            case 'x': return target.x;
            case 'y': return target.y;
            case 'scaleX': return target.scale.x;
            case 'scaleY': return target.scale.y;
            case 'scale': return target.scale.x;
            case 'alpha': return target.alpha;
            case 'rotation': return target.rotation;
            case 'width': return target.width;
            case 'height': return target.height;
            default: return (target as any)[key] ?? 0;
        }
    }
    
    private setProperty(target: PIXI.Container, key: string, value: number): void {
        switch (key) {
            case 'x': target.x = value; break;
            case 'y': target.y = value; break;
            case 'scaleX': target.scale.x = value; break;
            case 'scaleY': target.scale.y = value; break;
            case 'scale': target.scale.set(value); break;
            case 'alpha': target.alpha = value; break;
            case 'rotation': target.rotation = value; break;
            case 'width': target.width = value; break;
            case 'height': target.height = value; break;
            default: (target as any)[key] = value;
        }
    }
    
    /**
     * Clean up
     */
    destroy(): void {
        if (this.tickerCallback && this.ticker) {
            this.ticker.remove(this.tickerCallback);
        }
        this.animations.clear();
    }
}

// Singleton instance
export const animator = new AnimationManager();

// Helper function for quick animations
export function tweenTo(
    target: PIXI.Container,
    properties: Record<string, number>,
    duration: number,
    easing: (t: number) => number = EASINGS.smooth
): Promise<void> {
    return new Promise((resolve) => {
        animator.animate(target, properties, duration, { easing, onComplete: resolve });
    });
}

// Common animation helpers
export function fadeIn(target: PIXI.Container, duration: number = TIMING.normal): Promise<void> {
    target.alpha = 0;
    return tweenTo(target, { alpha: 1 }, duration);
}

export function fadeOut(target: PIXI.Container, duration: number = TIMING.normal): Promise<void> {
    return tweenTo(target, { alpha: 0 }, duration);
}

export function slideIn(
    target: PIXI.Container,
    from: 'left' | 'right' | 'top' | 'bottom',
    distance: number = 50,
    duration: number = TIMING.normal
): Promise<void> {
    const originalX = target.x;
    const originalY = target.y;
    
    switch (from) {
        case 'left': target.x = originalX - distance; break;
        case 'right': target.x = originalX + distance; break;
        case 'top': target.y = originalY - distance; break;
        case 'bottom': target.y = originalY + distance; break;
    }
    target.alpha = 0;
    
    return tweenTo(target, { x: originalX, y: originalY, alpha: 1 }, duration);
}

export function pulse(
    target: PIXI.Container,
    scale: number = 1.05,
    duration: number = TIMING.pulse
): number {
    let direction = 1;
    const baseScale = target.scale.x;
    
    return animator.animate(
        target,
        { scale: scale },
        duration / 2,
        {
            onComplete: () => {
                direction *= -1;
                animator.animate(target, { scale: baseScale }, duration / 2, {
                    onComplete: () => pulse(target, scale, duration),
                });
            },
        }
    );
}
