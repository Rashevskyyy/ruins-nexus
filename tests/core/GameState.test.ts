import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/GameState';
import { Phase } from '../../src/core/Phase';

describe('GameState', () => {
    describe('createInitialState', () => {
        it('should create state with correct number of players', () => {
            const state1 = createInitialState(1);
            expect(state1.players).toHaveLength(1);

            const state2 = createInitialState(2);
            expect(state2.players).toHaveLength(2);

            const state4 = createInitialState(4);
            expect(state4.players).toHaveLength(4);
        });

        it('should clamp player count to valid range', () => {
            const stateMin = createInitialState(0);
            expect(stateMin.players).toHaveLength(1);

            const stateMax = createInitialState(10);
            expect(stateMax.players).toHaveLength(4);
        });

        it('should initialize players with correct starting resources', () => {
            const state = createInitialState(2);
            for (const player of state.players) {
                expect(player.hp).toBe(5);
                expect(player.maxHp).toBe(5);
                expect(player.prestige).toBe(0);
                expect(player.components).toBe(0);
            }
        });

        it('should start on round 1 with 2 action points', () => {
            const state = createInitialState(2);
            expect(state.round).toBe(1);
            expect(state.actionPoints).toBe(2);
            expect(state.currentPlayerIndex).toBe(0);
        });

        it('should start in AwaitInput phase', () => {
            const state = createInitialState(2);
            expect(state.phase).toBe(Phase.AwaitInput);
        });

        it('should have empty inventory for players', () => {
            const state = createInitialState(2);
            for (const player of state.players) {
                expect(player.inventory.weapons).toEqual([null, null]);
                expect(player.inventory.spells).toEqual([null, null]);
                expect(player.inventory.amulet).toBeNull();
            }
        });

        it('should have empty units array for players', () => {
            const state = createInitialState(2);
            for (const player of state.players) {
                expect(player.units).toEqual([null, null]);
            }
        });

        it('should not be in final phase at start', () => {
            const state = createInitialState(2);
            expect(state.isFinalPhase).toBe(false);
            expect(state.isFinalPreparation).toBe(false);
            expect(state.gameOver).toBe(false);
        });

        it('should have unique player IDs', () => {
            const state = createInitialState(4);
            const ids = state.players.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have board with tiles', () => {
            const state = createInitialState(2);
            expect(state.board).toBeDefined();
            expect(state.board.getAllTiles().length).toBeGreaterThan(0);
        });

        it('should have tile deck', () => {
            const state = createInitialState(2);
            expect(state.tileDeck).toBeDefined();
            expect(state.tileDeck.getRemainingCount()).toBeGreaterThan(0);
        });

        it('should have valid game modifier', () => {
            const state = createInitialState(2);
            expect(state.modifierId).toBeDefined();
            expect(state.componentMultiplier).toBeGreaterThan(0);
        });

        it('should respect specified modifier', () => {
            const state = createInitialState(2, 'none');
            expect(state.modifierId).toBe('none');
        });

        it('should have version tracking initialized', () => {
            const state = createInitialState(2);
            expect(state.stateVersion).toBe(0);
            expect(state.lastActionId).toBeNull();
        });
    });
});
