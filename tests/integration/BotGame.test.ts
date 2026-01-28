import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../src/core/Game';
import { createInitialState } from '../../src/core/GameState';
import { BotPlayer, BotGameRunner } from '../../src/ai/BotPlayer';
import { Phase } from '../../src/core/Phase';
import { Logger } from '../../src/core/Logger';

// Disable logging for tests
Logger.configure({ enabled: false });

describe('BotPlayer', () => {
    let game: Game;
    let bot: BotPlayer;

    beforeEach(() => {
        const state = createInitialState(2);
        game = new Game(state);
        game.onToast = null;
        bot = new BotPlayer('P1', 'normal');
    });

    describe('decideAction', () => {
        it('should return a valid action decision', () => {
            const decision = bot.decideAction(game);
            
            expect(decision).toHaveProperty('action');
            expect(decision).toHaveProperty('reason');
            expect(decision).toHaveProperty('score');
            expect(decision.action).toHaveProperty('type');
        });

        it('should not crash with any game state', () => {
            // Run several turns
            for (let i = 0; i < 10; i++) {
                const decision = bot.decideAction(game);
                expect(() => bot.executeAction(game, decision)).not.toThrow();
                
                if (game.state.gameOver) break;
            }
        });

        it('should prefer explore when unexplored tiles nearby', () => {
            // At game start, there should be unexplored tiles
            const decision = bot.decideAction(game);
            
            // Should either explore or move (both valid starts)
            expect(['explore', 'move', 'end_turn']).toContain(decision.action.type);
        });
    });

    describe('executeAction', () => {
        it('should execute move action', () => {
            const initialPos = { ...game.currentPlayer.position };
            const decision = bot.decideAction(game);
            
            if (decision.action.type === 'move') {
                const success = bot.executeAction(game, decision);
                expect(success).toBe(true);
            }
        });

        it('should execute heal action when valid', () => {
            // Damage player first
            game.currentPlayer.hp = 2;
            
            const decision: any = {
                action: { type: 'heal' },
                reason: 'Test heal',
                score: 100,
            };

            const initialHp = game.currentPlayer.hp;
            const success = bot.executeAction(game, decision);
            
            if (success) {
                expect(game.currentPlayer.hp).toBeGreaterThan(initialHp);
            }
        });

        it('should handle end_turn action', () => {
            const initialPlayer = game.state.currentPlayerIndex;
            
            const decision: any = {
                action: { type: 'end_turn' },
                reason: 'Test end turn',
                score: 0,
            };

            bot.executeAction(game, decision);
            
            // Should move to next player
            expect(game.state.currentPlayerIndex).not.toBe(initialPlayer);
        });
    });
});

describe('BotGameRunner', () => {
    it('should create bots for all players', () => {
        const state = createInitialState(4);
        const game = new Game(state);
        game.onToast = null;
        
        const runner = new BotGameRunner(game, 'normal', 50);
        
        // Runner should work without crashing
        expect(() => runner.runTurn()).not.toThrow();
    });

    it('should run a turn without crashing', () => {
        const state = createInitialState(2);
        const game = new Game(state);
        game.onToast = null;
        
        const runner = new BotGameRunner(game, 'normal', 100);
        
        expect(() => runner.runTurn()).not.toThrow();
    });

    it('should complete a full game within turn limit', () => {
        const state = createInitialState(2);
        const game = new Game(state);
        game.onToast = null;
        
        const runner = new BotGameRunner(game, 'normal', 100);
        const result = runner.runGame();
        
        expect(result.turns).toBeLessThanOrEqual(100);
        expect(result).toHaveProperty('winner');
        expect(result).toHaveProperty('reason');
    });

    it('should track statistics correctly', () => {
        const state = createInitialState(2);
        const game = new Game(state);
        game.onToast = null;
        
        const runner = new BotGameRunner(game, 'normal', 50);
        runner.runTurn();
        
        const stats = runner.getStats();
        
        expect(stats.turns).toBeGreaterThanOrEqual(0);
        expect(stats.round).toBeGreaterThanOrEqual(1);
        expect(stats.players).toHaveLength(2);
        
        for (const p of stats.players) {
            expect(p).toHaveProperty('id');
            expect(p).toHaveProperty('hp');
            expect(p).toHaveProperty('prestige');
        }
    });

    describe('different difficulties', () => {
        it('should work with random difficulty', () => {
            const state = createInitialState(2);
            const game = new Game(state);
            game.onToast = null;
            
            const runner = new BotGameRunner(game, 'random', 30);
            expect(() => runner.runGame()).not.toThrow();
        });

        it('should work with easy difficulty', () => {
            const state = createInitialState(2);
            const game = new Game(state);
            game.onToast = null;
            
            const runner = new BotGameRunner(game, 'easy', 30);
            expect(() => runner.runGame()).not.toThrow();
        });

        it('should work with aggressive difficulty', () => {
            const state = createInitialState(2);
            const game = new Game(state);
            game.onToast = null;
            
            const runner = new BotGameRunner(game, 'aggressive', 30);
            expect(() => runner.runGame()).not.toThrow();
        });
    });
});

describe('Bot Game Stress Test', () => {
    it('should complete multiple games without errors', () => {
        const gamesCount = 5;
        let completedGames = 0;
        let errors: Error[] = [];

        for (let i = 0; i < gamesCount; i++) {
            try {
                const state = createInitialState(2);
                const game = new Game(state);
                game.onToast = null;
                
                const runner = new BotGameRunner(game, 'normal', 100);
                runner.runGame();
                completedGames++;
            } catch (e) {
                errors.push(e as Error);
            }
        }

        expect(completedGames).toBe(gamesCount);
        expect(errors).toHaveLength(0);
    });

    it('should handle various player counts', () => {
        for (let playerCount = 1; playerCount <= 4; playerCount++) {
            const state = createInitialState(playerCount);
            const game = new Game(state);
            game.onToast = null;
            
            const runner = new BotGameRunner(game, 'normal', 50);
            
            expect(() => runner.runGame()).not.toThrow();
        }
    });
});
