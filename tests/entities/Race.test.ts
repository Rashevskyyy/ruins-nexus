import { describe, it, expect } from 'vitest';
import { 
    RACES, 
    RACE_LIST, 
    getRandomRace, 
    getRandomOption,
    type RaceId,
    type RaceOption 
} from '../../src/entities/Race';

describe('Race', () => {
    describe('RACES', () => {
        it('should have all 6 races defined', () => {
            const raceIds: RaceId[] = ['bioform', 'forge', 'void', 'warbound', 'chrono', 'nomad'];
            
            for (const id of raceIds) {
                expect(RACES[id]).toBeDefined();
            }
        });

        it('should have valid structure for each race', () => {
            for (const [id, race] of Object.entries(RACES)) {
                expect(race.id).toBe(id);
                expect(race.name).toBeDefined();
                expect(race.emoji).toBeDefined();
                expect(race.description).toBeDefined();
                expect(race.passiveDescription).toBeDefined();
                expect(race.optionA).toBeDefined();
                expect(race.optionA.name).toBeDefined();
                expect(race.optionA.description).toBeDefined();
                expect(race.optionB).toBeDefined();
                expect(race.optionB.name).toBeDefined();
                expect(race.optionB.description).toBeDefined();
            }
        });
    });

    describe('RACE_LIST', () => {
        it('should have all races', () => {
            expect(RACE_LIST.length).toBe(6);
        });

        it('should match RACES object', () => {
            for (const race of RACE_LIST) {
                expect(RACES[race.id]).toBe(race);
            }
        });
    });

    describe('specific races', () => {
        describe('bioform', () => {
            it('should have skull reduction passive', () => {
                expect(RACES.bioform.passiveDescription).toContain('💀');
            });

            it('should have HP-related options', () => {
                expect(RACES.bioform.optionA.description).toContain('HP');
                expect(RACES.bioform.optionB.description).toContain('HP');
            });
        });

        describe('forge', () => {
            it('should have build cost reduction passive', () => {
                expect(RACES.forge.passiveDescription).toContain('🧱');
            });
        });

        describe('void', () => {
            it('should have movement passive', () => {
                expect(RACES.void.passiveDescription).toContain('Move');
            });
        });

        describe('warbound', () => {
            it('should have combat passive', () => {
                expect(RACES.warbound.passiveDescription).toContain('⚔');
            });
        });

        describe('chrono', () => {
            it('should have reroll passive', () => {
                expect(RACES.chrono.passiveDescription).toContain('reroll');
            });
        });

        describe('nomad', () => {
            it('should have gather passive', () => {
                expect(RACES.nomad.passiveDescription).toContain('Gather');
            });
        });
    });

    describe('getRandomRace', () => {
        it('should return a valid race', () => {
            const race = getRandomRace();
            
            expect(race).toBeDefined();
            expect(RACES[race.id]).toBeDefined();
        });

        it('should return different races over time', () => {
            const races = new Set<RaceId>();
            
            for (let i = 0; i < 50; i++) {
                races.add(getRandomRace().id);
            }
            
            expect(races.size).toBeGreaterThan(1);
        });

        it('should exclude specified races', () => {
            const excluded: RaceId[] = ['bioform', 'forge', 'void'];
            
            for (let i = 0; i < 20; i++) {
                const race = getRandomRace(excluded);
                expect(excluded).not.toContain(race.id);
            }
        });

        it('should return first race if all excluded', () => {
            const allRaces: RaceId[] = ['bioform', 'forge', 'void', 'warbound', 'chrono', 'nomad'];
            
            const race = getRandomRace(allRaces);
            
            expect(race).toBeDefined();
        });
    });

    describe('getRandomOption', () => {
        it('should return A or B', () => {
            for (let i = 0; i < 20; i++) {
                const option = getRandomOption();
                expect(['A', 'B']).toContain(option);
            }
        });

        it('should return both options over time', () => {
            const options = new Set<RaceOption>();
            
            for (let i = 0; i < 50; i++) {
                options.add(getRandomOption());
            }
            
            expect(options.has('A')).toBe(true);
            expect(options.has('B')).toBe(true);
        });
    });
});
