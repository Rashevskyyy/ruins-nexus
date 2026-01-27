/**
 * Cosmic Frontier - Seeded Random Number Generator (v0.6)
 * 
 * Provides deterministic random numbers for reproducible game results.
 * Uses Mulberry32 algorithm - fast and good distribution.
 */

export class SeededRng {
    private state: number;
    private initialSeed: number;
    private callCount: number = 0;
    
    constructor(seed?: number) {
        this.initialSeed = seed ?? Date.now();
        this.state = this.initialSeed;
    }
    
    /**
     * Get current seed for state serialization
     */
    getSeed(): number {
        return this.initialSeed;
    }
    
    /**
     * Get current state for precise restoration
     */
    getState(): { seed: number; callCount: number } {
        return { seed: this.initialSeed, callCount: this.callCount };
    }
    
    /**
     * Restore RNG to exact state
     */
    static fromState(state: { seed: number; callCount: number }): SeededRng {
        const rng = new SeededRng(state.seed);
        // Fast-forward to the correct position
        for (let i = 0; i < state.callCount; i++) {
            rng.next();
        }
        return rng;
    }
    
    /**
     * Mulberry32 PRNG - fast and good quality
     */
    private mulberry32(): number {
        this.callCount++;
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    
    /**
     * Get next random number in [0, 1)
     */
    next(): number {
        return this.mulberry32();
    }
    
    /**
     * Get random integer in [min, max] inclusive
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    /**
     * Roll a d6 (1-6)
     */
    rollD6(): number {
        return this.nextInt(1, 6);
    }
    
    /**
     * Roll Hero Die (Cosmic Frontier rules)
     * Faces: 3⚔, 2⚔, 1⚔, 1⚔1💀, 1💀, 2💀
     */
    rollHeroDie(): { swords: number; skulls: number; face: number } {
        const face = this.nextInt(1, 6);
        switch (face) {
            case 1: return { swords: 3, skulls: 0, face };
            case 2: return { swords: 2, skulls: 0, face };
            case 3: return { swords: 1, skulls: 0, face };
            case 4: return { swords: 1, skulls: 1, face };
            case 5: return { swords: 0, skulls: 1, face };
            case 6: return { swords: 0, skulls: 2, face };
            default: return { swords: 0, skulls: 0, face };
        }
    }
    
    /**
     * Shuffle array in place (Fisher-Yates)
     */
    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * Pick random element from array
     */
    pick<T>(array: T[]): T {
        return array[this.nextInt(0, array.length - 1)];
    }
    
    /**
     * Pick N random elements from array (without replacement)
     */
    pickN<T>(array: T[], n: number): T[] {
        const shuffled = this.shuffle([...array]);
        return shuffled.slice(0, Math.min(n, array.length));
    }
    
    /**
     * Random boolean with given probability (0-1)
     */
    chance(probability: number): boolean {
        return this.next() < probability;
    }
}

/**
 * Generate a random seed for a new game
 */
export function generateGameSeed(): number {
    return Math.floor(Math.random() * 2147483647);
}
