import { describe, it, expect } from 'vitest';
import { DiceResolver, type DiceResult } from '../../src/systems/DiceResolver';

describe('DiceResolver', () => {
    const dice = new DiceResolver();

    describe('rollHeroDie', () => {
        it('should return valid DiceResult', () => {
            const result = dice.rollHeroDie();
            
            expect(result).toHaveProperty('swords');
            expect(result).toHaveProperty('skulls');
            expect(typeof result.swords).toBe('number');
            expect(typeof result.skulls).toBe('number');
        });

        it('should return swords in valid range (0-3)', () => {
            for (let i = 0; i < 100; i++) {
                const result = dice.rollHeroDie();
                expect(result.swords).toBeGreaterThanOrEqual(0);
                expect(result.swords).toBeLessThanOrEqual(3);
            }
        });

        it('should return skulls in valid range (0-2)', () => {
            for (let i = 0; i < 100; i++) {
                const result = dice.rollHeroDie();
                expect(result.skulls).toBeGreaterThanOrEqual(0);
                expect(result.skulls).toBeLessThanOrEqual(2);
            }
        });

        it('should produce all possible outcomes over many rolls', () => {
            const outcomes = new Set<string>();
            
            for (let i = 0; i < 500; i++) {
                const result = dice.rollHeroDie();
                outcomes.add(`${result.swords},${result.skulls}`);
            }

            // Expected outcomes: 3S, 2S, 1S, 1S+1Skull, 1Skull, 2Skull
            // = (3,0), (2,0), (1,0), (1,1), (0,1), (0,2)
            expect(outcomes.has('3,0')).toBe(true);
            expect(outcomes.has('2,0')).toBe(true);
            expect(outcomes.has('1,0')).toBe(true);
            expect(outcomes.has('1,1')).toBe(true);
            expect(outcomes.has('0,1')).toBe(true);
            expect(outcomes.has('0,2')).toBe(true);
        });

        it('should have approximately equal distribution', () => {
            const counts: Record<string, number> = {};
            const rolls = 6000;

            for (let i = 0; i < rolls; i++) {
                const result = dice.rollHeroDie();
                const key = `${result.swords},${result.skulls}`;
                counts[key] = (counts[key] || 0) + 1;
            }

            // Each face should appear roughly 1/6 of the time (with some variance)
            const expected = rolls / 6;
            const tolerance = expected * 0.3; // 30% tolerance for randomness

            for (const key of ['3,0', '2,0', '1,0', '1,1', '0,1', '0,2']) {
                expect(counts[key]).toBeGreaterThan(expected - tolerance);
                expect(counts[key]).toBeLessThan(expected + tolerance);
            }
        });

        it('should not return invalid combinations', () => {
            const validCombos = new Set(['3,0', '2,0', '1,0', '1,1', '0,1', '0,2']);
            
            for (let i = 0; i < 200; i++) {
                const result = dice.rollHeroDie();
                const key = `${result.swords},${result.skulls}`;
                expect(validCombos.has(key)).toBe(true);
            }
        });
    });

    describe('dice statistics', () => {
        it('should calculate expected sword average correctly', () => {
            // Expected: (3 + 2 + 1 + 1 + 0 + 0) / 6 = 7/6 ≈ 1.17
            let totalSwords = 0;
            const rolls = 6000;

            for (let i = 0; i < rolls; i++) {
                totalSwords += dice.rollHeroDie().swords;
            }

            const avgSwords = totalSwords / rolls;
            expect(avgSwords).toBeGreaterThan(1.0);
            expect(avgSwords).toBeLessThan(1.4);
        });

        it('should calculate expected skull average correctly', () => {
            // Expected: (0 + 0 + 0 + 1 + 1 + 2) / 6 = 4/6 ≈ 0.67
            let totalSkulls = 0;
            const rolls = 6000;

            for (let i = 0; i < rolls; i++) {
                totalSkulls += dice.rollHeroDie().skulls;
            }

            const avgSkulls = totalSkulls / rolls;
            expect(avgSkulls).toBeGreaterThan(0.5);
            expect(avgSkulls).toBeLessThan(0.9);
        });
    });
});
