import { describe, it, expect, vi } from 'vitest';
import { Game } from '../../src/core/Game';
import { createInitialState } from '../../src/core/GameState';

describe('automatic combat turn boundary', () => {
    it('queues the next encounter rather than resolving an unbounded chain', () => {
        const game = new Game(createInitialState(1, 'none'));
        const player = game.currentPlayer;
        const tile = game.state.board.getTile(player.position)!;
        tile.encounterActive = true;
        tile.monsterTier = 4;
        tile.monsterType = 'standard';
        // No retreat tile: repeatedly losing used to recursively start the next turn.
        game.state.board.replaceAllTiles([tile]);
        const rng = vi.spyOn(Math, 'random').mockReturnValue(0.99);
        try {
            expect(() => game.endTurn()).not.toThrow();
            expect(game.state.pendingCombat?.playerId).toBe(player.id);
            expect(game.state.uiMode).toBe('PRE_COMBAT');
            expect(game.state.round).toBeLessThan(10);
        } finally {
            rng.mockRestore();
        }
    });
});
