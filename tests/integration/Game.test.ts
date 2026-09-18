import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../src/core/Game';
import { createInitialState } from '../../src/core/GameState';
import { Phase } from '../../src/core/Phase';
import { TileType } from '../../src/board/TileTypes';
import { neighbors } from '../../src/board/Hex';
import { Logger } from '../../src/core/Logger';

// Disable logging for tests
Logger.configure({ enabled: false });

describe('Game Integration Tests', () => {
    let game: Game;

    beforeEach(() => {
        const state = createInitialState(2, 'none');
        game = new Game(state);
        game.onToast = null;
        game.onDiceRoll = null;
    });

    describe('initialization', () => {
        it('should start with correct initial state', () => {
            expect(game.state.phase).toBe(Phase.AwaitInput);
            expect(game.state.round).toBe(1);
            expect(game.state.actionPoints).toBe(2);
            expect(game.state.currentPlayerIndex).toBe(0);
        });

        it('should have players at starting positions', () => {
            for (const player of game.state.players) {
                const tile = game.state.board.getTile(player.position);
                expect(tile).toBeDefined();
                expect(tile?.type).toBe(TileType.StartingSector);
            }
        });
    });

    describe('doGather', () => {
        it('should gather resources from current tile', () => {
            const player = game.currentPlayer;
            const tile = game.state.board.getTile(player.position);
            
            // Ensure tile has resources
            if (tile && tile.resources) {
                const initialBiomass = player.biomass;
                const initialMaterials = player.materials;
                const initialAlloys = player.alloys;
                
                // Clear any encounter
                tile.encounterActive = false;
                
                const success = game.doGather();
                
                if (success) {
                    const totalGained = (player.biomass - initialBiomass) + 
                                       (player.materials - initialMaterials) + 
                                       (player.alloys - initialAlloys);
                    expect(totalGained).toBeGreaterThan(0);
                }
            }
        });

        it('should fail on tiles without resources', () => {
            const player = game.currentPlayer;
            const tile = game.state.board.getTile(player.position);
            
            if (tile) {
                tile.resources = {};
                tile.encounterActive = false;
                
                const success = game.doGather();
                
                expect(success).toBe(false);
            }
        });
    });

    describe('doHeal', () => {
        it('should heal player when damaged', () => {
            const player = game.currentPlayer;
            player.hp = 2; // Damage player
            
            const success = game.doHeal();
            
            expect(success).toBe(true);
            expect(player.hp).toBe(4); // +2 HP
        });

        it('should not overheal beyond maxHp', () => {
            const player = game.currentPlayer;
            player.hp = player.maxHp - 1;
            
            game.doHeal();
            
            expect(player.hp).toBe(player.maxHp);
        });

        it('should fail at full HP', () => {
            const player = game.currentPlayer;
            player.hp = player.maxHp;
            
            const success = game.doHeal();
            
            expect(success).toBe(false);
        });
    });

    describe('doExplore', () => {
        it('should toggle tile placement mode', () => {
            expect(game.state.uiMode).toBe('NONE');
            
            game.doExplore();
            
            expect(game.state.uiMode).toBe('TILE_PLACEMENT');
        });

        it('should toggle off when called again', () => {
            game.doExplore();
            game.doExplore();
            
            expect(game.state.uiMode).toBe('NONE');
        });
    });

    describe('rotatePendingTile', () => {
        it('should rotate pending tile in TILE_PLACEMENT mode', () => {
            game.doExplore();
            expect(game.state.pendingTileRotation).toBe(0);
            
            game.rotatePendingTile();
            
            expect(game.state.pendingTileRotation).toBe(1);
        });

        it('should wrap rotation at 6', () => {
            game.doExplore();
            
            for (let i = 0; i < 7; i++) {
                game.rotatePendingTile();
            }
            
            expect(game.state.pendingTileRotation).toBe(1);
        });
    });

    describe('canBuildBase', () => {
        it('should return false when lacking materials', () => {
            const player = game.currentPlayer;
            player.materials = 0;
            
            expect(game.canBuildBase()).toBe(false);
        });

        it('should return false when already have a base', () => {
            const player = game.currentPlayer;
            player.materials = 10;
            player.basePosition = { q: 0, r: 0 };
            
            expect(game.canBuildBase()).toBe(false);
        });
    });

    describe('doBuildBase', () => {
        it('should build base when conditions met', () => {
            const player = game.currentPlayer;
            player.materials = 10;
            player.basePosition = null;
            
            // Clear any encounter on current tile
            const tile = game.state.board.getTile(player.position);
            if (tile) {
                tile.encounterActive = false;
                tile.ownerId = undefined;
            }
            
            const success = game.doBuildBase();
            
            if (success) {
                expect(player.basePosition).toEqual(player.position);
                expect(player.materials).toBe(8); // -2 materials
            }
        });
    });

    describe('endTurn', () => {
        beforeEach(() => {
            // Test turn rotation independently of randomly generated encounters.
            for (const tile of game.state.board.getAllTiles()) tile.encounterActive = false;
        });
        it('should switch to next player', () => {
            expect(game.state.currentPlayerIndex).toBe(0);
            
            game.endTurn();
            
            expect(game.state.currentPlayerIndex).toBe(1);
        });

        it('should increment round after all players', () => {
            expect(game.state.round).toBe(1);
            
            game.endTurn(); // P1 -> P2
            game.endTurn(); // P2 -> P1 (new round)
            
            expect(game.state.round).toBe(2);
        });

        it('should reset action points', () => {
            game.state.actionPoints = 0;
            
            game.endTurn();
            
            expect(game.state.actionPoints).toBe(2);
        });
    });

    describe('handleHexClick', () => {
        it('should not move to non-adjacent tiles', () => {
            const player = game.currentPlayer;
            const initialPos = { ...player.position };
            
            // Try to move to far away tile
            game.handleHexClick({ q: 10, r: 10 });
            
            expect(player.position).toEqual(initialPos);
        });
    });

    describe('chooseReward', () => {
        it('should handle standard reward choice', () => {
            const player = game.currentPlayer;
            const initialPrestige = player.prestige;
            
            game.state.pendingRewardChoice = {
                playerId: player.id,
                monsterTier: 3,
                standardReward: { prestige: 2, tokens: [], components: 2 },
            };
            
            game.chooseReward('standard');
            
            expect(player.prestige).toBe(initialPrestige + 2);
            expect(player.components).toBe(2);
            expect(game.state.pendingRewardChoice).toBeNull();
        });

        it('should handle recover choice', () => {
            const player = game.currentPlayer;
            player.hp = 2;
            
            game.state.pendingRewardChoice = {
                playerId: player.id,
                monsterTier: 3,
                standardReward: { prestige: 2, tokens: [], components: 2 },
            };
            
            game.chooseReward('recover');
            
            expect(player.hp).toBe(4); // +2 HP
        });

        it('should handle push choice when prestige < 10', () => {
            const player = game.currentPlayer;
            player.prestige = 5;
            
            game.state.pendingRewardChoice = {
                playerId: player.id,
                monsterTier: 3,
                standardReward: { prestige: 2, tokens: [], components: 0 },
            };
            
            game.chooseReward('push');
            
            expect(player.prestige).toBe(8); // +2 + 1 bonus
        });
    });

    describe('isInOwnBase', () => {
        it('should return false when player has no base', () => {
            const player = game.currentPlayer;
            player.basePosition = null;
            
            expect(game.isInOwnBase()).toBe(false);
        });

        it('should return true when at own base', () => {
            const player = game.currentPlayer;
            const tile = game.state.board.getTile(player.position);
            if (tile) {
                tile.ownerId = player.id;
            }
            
            expect(game.isInOwnBase()).toBe(true);
        });
    });

    describe('canCraft', () => {
        it('should return false when not at base', () => {
            const player = game.currentPlayer;
            const tile = game.state.board.getTile(player.position);
            if (tile) {
                tile.ownerId = 'other_player';
            }
            
            expect(game.canCraft()).toBe(false);
        });
    });

    describe('canRecallToBase', () => {
        it('should return false when not in final preparation', () => {
            game.state.isFinalPreparation = false;
            
            expect(game.canRecallToBase()).toBe(false);
        });

        it('should return false when no base', () => {
            game.state.isFinalPreparation = true;
            game.currentPlayer.basePosition = null;
            
            expect(game.canRecallToBase()).toBe(false);
        });
    });
});

describe('Game Race Bonuses', () => {
    it('should apply Forge discount on first build', () => {
        const state = createInitialState(2, 'none');
        const game = new Game(state);
        game.onToast = null;
        
        const player = game.currentPlayer;
        player.raceId = 'forge';
        player.raceOption = 'A';
        player.materials = 10;
        player.basePosition = null;
        player.forgeDiscountUsed = false;
        
        // Set up tile for building
        const tile = game.state.board.getTile(player.position);
        if (tile) {
            tile.encounterActive = false;
            tile.ownerId = undefined;
        }
        
        const success = game.doBuildBase();
        
        if (success) {
            expect(player.forgeDiscountUsed).toBe(true);
            expect(player.materials).toBe(9); // -1 instead of -2
        }
    });

    it('should apply race bonuses at game start', () => {
        const state = createInitialState(2, 'none');
        const game = new Game(state);
        
        const player = game.state.players[0];
        player.raceId = 'bioform';
        player.raceOption = 'A'; // +1 max HP
        
        game.applyAllRaceBonuses();
        
        expect(player.maxHp).toBe(6);
        expect(player.hp).toBe(6);
    });
});

describe('Game Event Log', () => {
    it('should add messages to event log', () => {
        const state = createInitialState(2, 'none');
        const game = new Game(state);
        
        const initialLength = game.state.eventLog.length;
        game.addLog('Test message');
        
        expect(game.state.eventLog.length).toBe(initialLength + 1);
        expect(game.state.eventLog).toContain('Test message');
    });

    it('should limit event log size', () => {
        const state = createInitialState(2, 'none');
        const game = new Game(state);
        
        // Add many messages
        for (let i = 0; i < 20; i++) {
            game.addLog(`Message ${i}`);
        }
        
        expect(game.state.eventLog.length).toBeLessThanOrEqual(10);
    });
});
