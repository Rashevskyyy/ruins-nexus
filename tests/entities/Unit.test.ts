import { describe, it, expect } from 'vitest';
import { 
    UNIT_DEFINITIONS, 
    MAX_UNITS, 
    createUnit, 
    getAllUnitTypes, 
    canAffordUnit,
    type UnitType 
} from '../../src/entities/Unit';

describe('Unit', () => {
    describe('UNIT_DEFINITIONS', () => {
        it('should have assault, shield, and tactical units', () => {
            expect(UNIT_DEFINITIONS.assault).toBeDefined();
            expect(UNIT_DEFINITIONS.shield).toBeDefined();
            expect(UNIT_DEFINITIONS.tactical).toBeDefined();
        });

        it('should have valid structure for each unit', () => {
            for (const [type, def] of Object.entries(UNIT_DEFINITIONS)) {
                expect(def.type).toBe(type);
                expect(def.name).toBeDefined();
                expect(def.description).toBeDefined();
                expect(def.emoji).toBeDefined();
                expect(def.cost).toBeDefined();
                expect(def.cost.components).toBeGreaterThanOrEqual(0);
                expect(def.cost.alloys).toBeGreaterThanOrEqual(0);
                expect(def.cost.materials).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('MAX_UNITS', () => {
        it('should be 2', () => {
            expect(MAX_UNITS).toBe(2);
        });
    });

    describe('createUnit', () => {
        it('should create assault unit', () => {
            const unit = createUnit('assault');
            
            expect(unit.type).toBe('assault');
            expect(unit.name).toBe('Assault Drone');
            expect(unit.id).toContain('assault_');
        });

        it('should create shield unit', () => {
            const unit = createUnit('shield');
            
            expect(unit.type).toBe('shield');
            expect(unit.name).toBe('Shield Bot');
        });

        it('should create tactical unit', () => {
            const unit = createUnit('tactical');
            
            expect(unit.type).toBe('tactical');
            expect(unit.name).toBe('Tactical Scanner');
        });

        it('should create units with IDs containing type', () => {
            const unit1 = createUnit('assault');
            const unit2 = createUnit('shield');
            
            expect(unit1.id).toContain('assault');
            expect(unit2.id).toContain('shield');
        });
    });

    describe('getAllUnitTypes', () => {
        it('should return all unit types', () => {
            const types = getAllUnitTypes();
            
            expect(types).toContain('assault');
            expect(types).toContain('shield');
            expect(types).toContain('tactical');
            expect(types.length).toBe(3);
        });
    });

    describe('canAffordUnit', () => {
        it('should return true when player can afford assault drone', () => {
            // Assault: components: 2, alloys: 1, materials: 0
            expect(canAffordUnit('assault', 2, 1, 0)).toBe(true);
            expect(canAffordUnit('assault', 5, 5, 5)).toBe(true);
        });

        it('should return false when lacking components', () => {
            expect(canAffordUnit('assault', 1, 5, 5)).toBe(false);
        });

        it('should return false when lacking alloys', () => {
            expect(canAffordUnit('assault', 5, 0, 5)).toBe(false);
        });

        it('should check shield bot costs correctly', () => {
            // Shield: components: 2, alloys: 0, materials: 1
            expect(canAffordUnit('shield', 2, 0, 1)).toBe(true);
            expect(canAffordUnit('shield', 1, 0, 1)).toBe(false);
            expect(canAffordUnit('shield', 2, 0, 0)).toBe(false);
        });

        it('should check tactical scanner costs correctly', () => {
            // Tactical: components: 3, alloys: 1, materials: 0
            expect(canAffordUnit('tactical', 3, 1, 0)).toBe(true);
            expect(canAffordUnit('tactical', 2, 1, 0)).toBe(false);
        });
    });
});
