import * as PIXI from "pixi.js";
import { createInitialState } from "./core/GameState";
import { Game, applyRaceBonusesToPlayer } from "./core/Game";
import { Phase } from "./core/Phase";
import { GameRenderer } from "./render/GameRenderer";
import { LobbyScreen } from "./screens/LobbyScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { socketClient } from "./network/SocketClient";
import { AssetLoader, GAME_VERSION } from "./assets/AssetLoader";
import { MainMenuScreen } from "./ui/screens/MainMenuScreen";
import { CreateRoomScreen, type CreateRoomOptions } from "./ui/screens/CreateRoomScreen";
import type { RaceId, RaceOption } from "./entities/Race";
import type { GameState } from "./core/GameState";

// Feature flag to enable new UI (set to true to use new screens)
const USE_NEW_UI = true;

// ========================================
// MAIN FUNCTION (async wrapper)
// ========================================

async function main() {
    console.log("[Main] Starting application...");
    
    // ========================================
    // INIT PIXI APP
    // ========================================
    
    const app = new PIXI.Application();
    
    await app.init({
        resizeTo: window,
        backgroundAlpha: 1,
        backgroundColor: 0x0a0a1a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true,
    });
    
    console.log("[Main] PIXI initialized");

    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    app.canvas.style.display = "block";
    document.body.appendChild(app.canvas);

    console.log(`🚀 Cosmic Frontier ${GAME_VERSION}`);

    // ========================================
    // LOADING SCREEN
    // ========================================

    const loadingScreen = new LoadingScreen(app);
    loadingScreen.show();

    // Load assets
    await AssetLoader.loadAll((progress) => {
        loadingScreen.updateProgress(progress);
    });

    // Small delay to show "Ready!"
    await new Promise(resolve => setTimeout(resolve, 300));
    loadingScreen.hide();

    // ========================================
    // GAME STATE
    // ========================================

    let game: Game | null = null;
    let renderer: GameRenderer | null = null;
    let myPlayerId: string | null = null;
    let isMultiplayer = false;

    // ========================================
    // UI SCREENS
    // ========================================

    // Legacy lobby screen (used for in-lobby functionality)
    const lobbyScreen = new LobbyScreen(app);
    
    // New UI screens
    let mainMenuScreen: MainMenuScreen | null = null;
    let createRoomScreen: CreateRoomScreen | null = null;
    let playerName = "";
    
    // Screen management (track current screen for debugging/logging)
    type UIScreen = "main-menu" | "create-room" | "lobby" | "game";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _currentScreen: UIScreen = "main-menu";
    void _currentScreen; // Mark as intentionally unused for tracking purposes
    
    function showMainMenu(): void {
        _currentScreen = "main-menu";
        app.stage.removeChildren();
        
        if (!mainMenuScreen) {
            mainMenuScreen = new MainMenuScreen(app, {
                onCreateRoom: () => showCreateRoom(),
                onJoinRoom: (code) => handleJoinRoom(code),
                onHowToPlay: () => window.open("docs/GAME.md", "_blank"),
            });
        }
        
        app.stage.addChild(mainMenuScreen);
        mainMenuScreen.show();
    }
    
    function showCreateRoom(): void {
        _currentScreen = "create-room";
        app.stage.removeChildren();
        
        if (!createRoomScreen) {
            createRoomScreen = new CreateRoomScreen(app, {
                onBack: () => showMainMenu(),
                onCreate: (options) => handleCreateRoom(options),
            }, playerName);
        } else {
            createRoomScreen.setPlayerName(playerName);
        }
        
        app.stage.addChild(createRoomScreen);
        createRoomScreen.show();
    }
    
    function showLobby(): void {
        _currentScreen = "lobby";
        lobbyScreen.showLobby(socketClient.players);
    }
    
    async function handleCreateRoom(options: CreateRoomOptions): Promise<void> {
        playerName = options.playerName;
        console.log("[Main] Creating room with options:", options);
        
        const result = await socketClient.createRoom(options.playerName, options.playerCount);
        
        if (result.success) {
            console.log("[Main] Room created, code:", socketClient.roomCode);
            showLobby();
        } else {
            console.error("[Main] Failed to create room:", result.error);
            alert(result.error || "Failed to create room");
        }
    }
    
    async function handleJoinRoom(code?: string): Promise<void> {
        let joinCode = code || "";
        
        if (!joinCode) {
            const inputCode = prompt("Enter room code:");
            if (!inputCode) return;
            joinCode = inputCode.toUpperCase();
        }
        
        if (!playerName) {
            const name = prompt("Enter your name:", "Player");
            if (!name) return;
            playerName = name;
        }
        
        console.log("[Main] Joining room:", joinCode);
        
        const result = await socketClient.joinRoom(joinCode, playerName);
        
        if (result.success) {
            console.log("[Main] Joined room successfully");
            showLobby();
        } else {
            console.error("[Main] Failed to join room:", result.error);
            alert(result.error || "Failed to join room");
        }
    }

    lobbyScreen.onGameStart = (playerCount: number, playerId: string, initialState?: any) => {
        console.log(`[Main] Starting game with ${playerCount} players, I am ${playerId}`);
        _currentScreen = "game";
        myPlayerId = playerId;
        isMultiplayer = true;
        
        if (initialState) {
            startGameWithState(initialState, playerCount);
        } else {
            startGame(playerCount);
        }
    };

    function applyLobbySelectionsToState(state: GameState): void {
        if (!socketClient.players.length) return;
        
        state.players.forEach((player) => {
            const lobbyPlayer = socketClient.players.find(p => p.id === player.id);
            if (!lobbyPlayer?.raceId || !lobbyPlayer.raceOption) return;
            player.raceId = lobbyPlayer.raceId as RaceId;
            player.raceOption = lobbyPlayer.raceOption as RaceOption;
            applyRaceBonusesToPlayer(player);
        });
    }

    lobbyScreen.onRequestStart = async () => {
        console.log("[Main] Admin requesting game start");
        
        const state = createInitialState();
        state.players = state.players.slice(0, socketClient.players.length);
        applyLobbySelectionsToState(state);
        
        const serializedState = {
            currentPlayerIndex: state.currentPlayerIndex,
            round: state.round,
            actionPoints: state.actionPoints,
            movedInCurrentSlot: state.movedInCurrentSlot,
            actionUsedInCurrentSlot: state.actionUsedInCurrentSlot,
            uiMode: state.uiMode,
            pendingTileRotation: state.pendingTileRotation,
            selectedPlacementPosition: state.selectedPlacementPosition,
            eventLog: state.eventLog,
            activeEvents: state.activeEvents,
            eventDeck: state.eventDeck,
            eventProgress: state.eventProgress,
            moduleCostDiscount: state.moduleCostDiscount,
            publicObjectives: state.publicObjectives,
            publicObjectivesPhase: state.publicObjectivesPhase,
            modifierId: state.modifierId,
            componentMultiplier: state.componentMultiplier,
            isFinalPhase: state.isFinalPhase,
            isFinalPreparation: state.isFinalPreparation,
            finalPrepRoundsLeft: state.finalPrepRoundsLeft,
            finalRoundsLeft: state.finalRoundsLeft,
            finalThreatHp: state.finalThreatHp,
            finalTrialStarted: state.finalTrialStarted,
            finalTrialResults: state.finalTrialResults,
            gameOver: state.gameOver,
            winnerId: state.winnerId,
            missionFailed: state.missionFailed,
            players: state.players,
            tiles: state.board.getAllTiles(),
            tileDeck: state.tileDeck.serialize(),
        };
        
        const result = await socketClient.startGame(serializedState);
        if (!result.success) {
            console.error("[Main] Failed to start game:", result.error);
        }
    };

    // ========================================
    // RECONNECT ON PAGE LOAD
    // ========================================

    async function tryReconnect() {
        if (!socketClient.hasStoredSession()) {
            if (USE_NEW_UI) {
                showMainMenu();
            } else {
                lobbyScreen.show();
            }
            return;
        }

        console.log("[Main] Attempting to reconnect...");
        
        const result = await socketClient.tryReconnect();
        
        if (result.success) {
            myPlayerId = socketClient.playerId;
            isMultiplayer = true;
            
            if (result.gameStarted && result.gameState) {
                console.log("[Main] Reconnected to active game");
                startGameWithState(result.gameState, socketClient.players.length);
            } else {
                console.log("[Main] Reconnected to lobby");
                lobbyScreen.showLobby(socketClient.players);
            }
        } else {
            console.log("[Main] No active session, showing main menu");
            if (USE_NEW_UI) {
                showMainMenu();
            } else {
                lobbyScreen.show();
            }
        }
    }

    // ========================================
    // MULTIPLAYER SYNC
    // ========================================

    socketClient.onGameUpdate = (data: { action: any; state: any; fromPlayer: string }) => {
        if (!game || !renderer) return;
        
        const isOwnUpdate = data.fromPlayer === myPlayerId;
        const beforeTiles = game.state.board.getAllTiles().length;
        
        console.log(`[Main] Received update from ${data.fromPlayer}:`, data.action.type, `tiles: ${data.state.tiles?.length}`, isOwnUpdate ? "(own)" : "");
        
        // Always apply server state for consistent sync
        applyServerState(data.state);
        
        const afterTiles = game.state.board.getAllTiles().length;
        if (beforeTiles !== afterTiles) {
            console.log(`[Sync] Tiles changed: ${beforeTiles} -> ${afterTiles}`);
        }
        
        renderer.renderAll();
    };

    socketClient.onPlayerDisconnected = (_playerId: string, playerName: string) => {
        console.log(`[Main] ${playerName} disconnected`);
    };

    socketClient.onPlayerReconnected = (_playerId: string, playerName: string) => {
        console.log(`[Main] ${playerName} reconnected`);
    };

    socketClient.onGameReset = (_data: { reason: string }) => {
        game = null;
        renderer = null;
        if (USE_NEW_UI) {
            showMainMenu();
        } else {
            lobbyScreen.show();
        }
    };

    // ========================================
    // START GAME
    // ========================================

    function startGame(playerCount: number) {
        const state = createInitialState();
        state.players = state.players.slice(0, playerCount);
        applyLobbySelectionsToState(state);
        
        game = new Game(state);
        renderer = new GameRenderer(app, game);
        setupDebugCallbacks();
        setupDiceCallback();
        
        if (isMultiplayer) {
            renderer.isMyTurnFn = isMyTurn;
            renderer.myPlayerId = myPlayerId;
            wrapGameForMultiplayer();
            
            if (myPlayerId === "P1") {
                const serializedState = serializeGameState();
                socketClient.startGame(serializedState);
            }
        }
        
        renderer.renderAll();
    }

    function startGameWithState(serverState: any, playerCount: number) {
        const state = createInitialState();
        state.players = state.players.slice(0, playerCount);
        
        game = new Game(state);
        applyServerState(serverState, true); // isReconnect = true
        
        renderer = new GameRenderer(app, game);
        setupDebugCallbacks();
        setupDiceCallback();
        
        if (isMultiplayer) {
            renderer.isMyTurnFn = isMyTurn;
            renderer.myPlayerId = myPlayerId;
            wrapGameForMultiplayer();
        }
        
        renderer.renderAll();
    }

    function applyServerState(serverState: any, isReconnect: boolean = false): void {
        if (!game) return;
        
        // v0.6: State versioning
        game.state.stateVersion = serverState.stateVersion ?? game.state.stateVersion;
        game.state.lastActionId = serverState.lastActionId ?? game.state.lastActionId;
        
        game.state.currentPlayerIndex = serverState.currentPlayerIndex;
        game.state.round = serverState.round;
        game.state.actionPoints = serverState.actionPoints;
        game.state.movedInCurrentSlot = serverState.movedInCurrentSlot;
        game.state.actionUsedInCurrentSlot = serverState.actionUsedInCurrentSlot;
        
        // Restore UI mode only for the active player (others shouldn't see TILE_PLACEMENT)
        const isActivePlayer = myPlayerId === `P${serverState.currentPlayerIndex + 1}`;
        if (isActivePlayer) {
            const restoredMode = serverState.uiMode || "NONE";
            // On reconnect, don't restore modal modes (CRAFT_MENU, BUILD_MENU) - they should not auto-open
            // On regular updates, restore them normally
            if (isReconnect) {
                const isModalMode = restoredMode === "CRAFT_MENU" || restoredMode === "BUILD_MENU" || restoredMode === "PRE_COMBAT";
                game.state.uiMode = isModalMode ? "NONE" : restoredMode;
            } else {
                game.state.uiMode = restoredMode;
            }
            game.state.pendingTileRotation = serverState.pendingTileRotation || 0;
            game.state.selectedPlacementPosition = serverState.selectedPlacementPosition || null;
        } else {
            // Other players always see NONE mode (can't interact)
            game.state.uiMode = "NONE";
            game.state.pendingTileRotation = 0;
            game.state.selectedPlacementPosition = null;
        }
        
        game.state.eventLog = serverState.eventLog || [];
        game.state.activeEvents = serverState.activeEvents || [];
        game.state.eventDeck = serverState.eventDeck || game.state.eventDeck;
        game.state.eventProgress = serverState.eventProgress || game.state.eventProgress;
        game.state.moduleCostDiscount = serverState.moduleCostDiscount ?? game.state.moduleCostDiscount;
        game.state.publicObjectives = serverState.publicObjectives ?? game.state.publicObjectives;
        game.state.publicObjectivesPhase = serverState.publicObjectivesPhase ?? game.state.publicObjectivesPhase;
        game.state.modifierId = serverState.modifierId ?? game.state.modifierId;
        game.state.componentMultiplier = serverState.componentMultiplier ?? game.state.componentMultiplier;
        game.state.isFinalPhase = serverState.isFinalPhase;
        game.state.finalRoundsLeft = serverState.finalRoundsLeft;
        game.state.finalThreatHp = serverState.finalThreatHp;
        game.state.gameOver = serverState.gameOver;
        game.state.winnerId = serverState.winnerId;
        game.state.missionFailed = serverState.missionFailed;
        game.state.pendingRewardChoice = serverState.pendingRewardChoice || null;
        game.state.pendingCombat = serverState.pendingCombat || null;
        // v0.5 Final Trial
        game.state.isFinalPreparation = serverState.isFinalPreparation ?? false;
        game.state.finalPrepRoundsLeft = serverState.finalPrepRoundsLeft ?? 0;
        game.state.finalTrialStarted = serverState.finalTrialStarted ?? false;
        game.state.finalTrialResults = serverState.finalTrialResults ?? [];
        if (serverState.phase !== undefined) {
            game.state.phase = serverState.phase;
        }
        game.state.players = serverState.players;
        for (const player of game.state.players) {
            player.tilesExplored ??= 0;
            player.monstersDefeatedTier2Plus ??= 0;
            player.monstersDefeatedTier3Plus ??= 0;
            player.resourcesGathered ??= 0;
            player.itemsCrafted ??= 0;
            player.permanentGatherBonus ??= 0;
            player.permanentCombatBonus ??= 0;
            player.finalTrialBonus ??= 0;
        }
        
        // Sync tile deck from server (CRITICAL for consistent tile order!)
        if (serverState.tileDeck) {
            game.state.tileDeck.restoreFrom(serverState.tileDeck);
        }
        
        // Replace ALL tiles from server (not merge - full sync!)
        if (serverState.tiles && Array.isArray(serverState.tiles)) {
            const discoveredTiles = serverState.tiles.filter((t: any) => t.discovered);
            const coords = discoveredTiles.map((t: any) => `${t.coord.q},${t.coord.r}`).sort().join(" | ");
            console.log(`[Sync] Applying ${serverState.tiles.length} tiles (${discoveredTiles.length} discovered): ${coords}`);
            game.state.board.replaceAllTiles(serverState.tiles);
            
            // Force re-render to rebuild tileViews
            if (renderer) {
                renderer.forceRebuildViews();
            }
        }
    }

    function serializeGameState(): any {
        if (!game) return null;
        
        return {
            // v0.6: State versioning for sync
            stateVersion: game.state.stateVersion,
            lastActionId: game.state.lastActionId,
            // Core state
            currentPlayerIndex: game.state.currentPlayerIndex,
            round: game.state.round,
            actionPoints: game.state.actionPoints,
            movedInCurrentSlot: game.state.movedInCurrentSlot,
            actionUsedInCurrentSlot: game.state.actionUsedInCurrentSlot,
            uiMode: game.state.uiMode,
            pendingTileRotation: game.state.pendingTileRotation,
            selectedPlacementPosition: game.state.selectedPlacementPosition,
            eventLog: game.state.eventLog,
            activeEvents: game.state.activeEvents,
            eventDeck: game.state.eventDeck,
            eventProgress: game.state.eventProgress,
            moduleCostDiscount: game.state.moduleCostDiscount,
            publicObjectives: game.state.publicObjectives,
            publicObjectivesPhase: game.state.publicObjectivesPhase,
            modifierId: game.state.modifierId,
            componentMultiplier: game.state.componentMultiplier,
            // Final Phase (v0.5)
            isFinalPhase: game.state.isFinalPhase,
            isFinalPreparation: game.state.isFinalPreparation,
            finalPrepRoundsLeft: game.state.finalPrepRoundsLeft,
            finalRoundsLeft: game.state.finalRoundsLeft,
            finalThreatHp: game.state.finalThreatHp,
            finalTrialStarted: game.state.finalTrialStarted,
            finalTrialResults: game.state.finalTrialResults,
            gameOver: game.state.gameOver,
            winnerId: game.state.winnerId,
            missionFailed: game.state.missionFailed,
            pendingRewardChoice: game.state.pendingRewardChoice,
            phase: game.state.phase,
            players: game.state.players,
            tiles: game.state.board.getAllTiles(),
            tileDeck: game.state.tileDeck.serialize(),
        };
    }

    // ========================================
    // WRAP GAME FOR MULTIPLAYER
    // ========================================

    function wrapGameForMultiplayer() {
        if (!game) return;
        
        const originalHandleHexClick = game.handleHexClick.bind(game);
        game.handleHexClick = (target) => {
            if (!isMyTurn()) return;
            originalHandleHexClick(target);
            // Don't send state immediately if combat is pending (will be sent after dice)
            // Combat sets phase to ResolveAction
            if (game!.state.phase !== Phase.ResolveAction) {
                sendActionToServer({ type: "hex-click", target });
            }
            // If combat started, state will be synced via onCombatResolved
        };
        
        const originalDoGather = game.doGather.bind(game);
        game.doGather = () => {
            if (!isMyTurn()) return false;
            const result = originalDoGather();
            if (result) sendActionToServer({ type: "gather" });
            return result;
        };
        
        const originalDoTrade = game.doTrade.bind(game);
        game.doTrade = () => {
            if (!isMyTurn()) return false;
            const result = originalDoTrade();
            if (result) sendActionToServer({ type: "trade" });
            return result;
        };
        
        const originalDoHeal = game.doHeal.bind(game);
        game.doHeal = () => {
            if (!isMyTurn()) return false;
            const result = originalDoHeal();
            if (result) sendActionToServer({ type: "heal" });
            return result;
        };
        
        const originalDoExplore = game.doExplore.bind(game);
        game.doExplore = () => {
            if (!isMyTurn()) return false;
            const result = originalDoExplore();
            if (result) sendActionToServer({ type: "explore" });
            return result;
        };
        
        const originalRotate = game.rotatePendingTile.bind(game);
        game.rotatePendingTile = () => {
            if (!isMyTurn()) return;
            originalRotate();
            sendActionToServer({ type: "rotate" });
            renderer?.renderAll();
        };
        
        const originalSelectPlacement = game.selectPlacementPosition.bind(game);
        game.selectPlacementPosition = (coord) => {
            if (!isMyTurn()) return;
            originalSelectPlacement(coord);
            sendActionToServer({ type: "select-placement", coord });
        };
        
        const originalPlaceTile = game.placeTileAtSelected.bind(game);
        game.placeTileAtSelected = () => {
            if (!isMyTurn()) return false;
            const result = originalPlaceTile();
            // Don't send state if combat is pending (will be sent via combat-resolved)
            if (result && game!.state.phase !== Phase.ResolveAction) {
                sendActionToServer({ type: "place-tile" });
            }
            return result;
        };
        
        const originalBuildBase = game.doBuildBase.bind(game);
        game.doBuildBase = () => {
            if (!isMyTurn()) return false;
            const result = originalBuildBase();
            if (result) sendActionToServer({ type: "build-base" });
            return result;
        };
        
        const originalBuildModules = game.doBuildModules.bind(game);
        game.doBuildModules = (modules) => {
            if (!isMyTurn()) return false;
            const result = originalBuildModules(modules);
            if (result) sendActionToServer({ type: "build-modules", modules });
            return result;
        };
        
        // v0.4: Wrap chooseReward for multiplayer
        const originalChooseReward = game.chooseReward.bind(game);
        game.chooseReward = (choice) => {
            if (!isMyTurn()) return;
            originalChooseReward(choice);
            sendActionToServer({ type: "choose-reward", choice });
            renderer?.renderAll();
        };
        
        // Wrap finishTokenSelection for multiplayer
        const originalFinishTokenSelection = game.finishTokenSelection.bind(game);
        game.finishTokenSelection = () => {
            originalFinishTokenSelection();
            sendActionToServer({ type: "finish-token-selection" });
            renderer?.renderAll();
        };
        
        // v0.5: Wrap crafting for multiplayer
        const originalDoCraft = game.doCraft.bind(game);
        game.doCraft = (recipeId) => {
            if (!isMyTurn()) return false;
            const result = originalDoCraft(recipeId);
            if (result) sendActionToServer({ type: "craft", recipeId });
            return result;
        };
        
        const originalToggleCraftMenu = game.toggleCraftMenu.bind(game);
        game.toggleCraftMenu = () => {
            if (!isMyTurn()) return false;
            const result = originalToggleCraftMenu();
            if (result) sendActionToServer({ type: "toggle-craft-menu" });
            renderer?.renderAll();
            return result;
        };
        
        // v0.5: Wrap recall to base for multiplayer
        const originalDoRecallToBase = game.doRecallToBase.bind(game);
        game.doRecallToBase = () => {
            if (!isMyTurn()) return false;
            const result = originalDoRecallToBase();
            if (result) sendActionToServer({ type: "recall-to-base" });
            renderer?.renderAll();
            return result;
        };
        
        // v0.5: Wrap Orbital Hangar teleport for multiplayer
        const originalDoOrbitalHangarTeleport = game.doOrbitalHangarTeleport.bind(game);
        game.doOrbitalHangarTeleport = (destination) => {
            if (!isMyTurn()) return false;
            const result = originalDoOrbitalHangarTeleport(destination);
            if (result) sendActionToServer({ type: "orbital-hangar-teleport", destination });
            renderer?.renderAll();
            return result;
        };
        
        // v0.5: Wrap Final Trial for multiplayer
        const originalDoFinalTrial = game.doFinalTrial.bind(game);
        game.doFinalTrial = (prestigeSpend) => {
            if (!isMyTurn()) return false;
            const result = originalDoFinalTrial(prestigeSpend);
            if (result) sendActionToServer({ type: "final-trial", prestigeSpend });
            renderer?.renderAll();
            return result;
        };
        
        // v0.5: Wrap unit hire for multiplayer
        const originalDoHireUnit = game.doHireUnit.bind(game);
        game.doHireUnit = (unitType) => {
            if (!isMyTurn()) return false;
            const result = originalDoHireUnit(unitType);
            if (result) sendActionToServer({ type: "hire-unit", unitType });
            renderer?.renderAll();
            return result;
        };
    }

    function isMyTurn(): boolean {
        if (!game || !myPlayerId) return true;
        return game.state.players[game.state.currentPlayerIndex].id === myPlayerId;
    }

    function sendActionToServer(action: any): void {
        if (!game) return;
        const state = serializeGameState();
        socketClient.sendGameAction(action, state);
    }

    // ========================================
    // DEBUG FUNCTIONS
    // ========================================

    function setupDiceCallback(): void {
        if (!game || !renderer) return;
        
        game.onDiceRoll = (result, callback) => {
            // Show dice UI BEFORE combat is applied
            renderer!.showDiceRoll(result, () => {
                // AFTER dice animation: combat callback applies results
                callback();
                renderer!.renderAll();
            });
        };
        
        // Sync state after combat resolution (multiplayer)
        game.onCombatResolved = () => {
            if (isMultiplayer) {
                sendActionToServer({ type: "combat-resolved" });
            }
            renderer?.renderAll();
        };
        
        // Connect toast notifications
        game.onToast = (message, type) => {
            renderer!.showToast(message, type);
        };
    }

    function setupDebugCallbacks(): void {
        if (!renderer || !game) return;
        
        renderer.onDebugAddResources = () => {
            const player = game!.state.players.find(p => p.id === (myPlayerId || "P1"));
            if (player) {
                player.biomass += 10;
                player.materials += 10;
                player.alloys += 10;
                game!.addLog(`🐛 DEBUG: +10 resources for ${player.id}`);
            }
            if (isMultiplayer) sendActionToServer({ type: "debug-add-resources", playerId: player?.id });
        };

        renderer.onDebugAddComponents = () => {
            const player = game!.state.players.find(p => p.id === (myPlayerId || "P1"));
            if (player) {
                player.components += 10;
                game!.addLog(`🐛 DEBUG: +10 components for ${player.id}`);
            }
            if (isMultiplayer) sendActionToServer({ type: "debug-add-components", playerId: player?.id });
        };
        
        renderer.onDebugHeal = () => {
            const player = game!.state.players.find(p => p.id === (myPlayerId || "P1"));
            if (player) {
                player.hp = 5;
                game!.addLog(`🐛 DEBUG: ${player.id} healed to full HP`);
            }
            if (isMultiplayer) sendActionToServer({ type: "debug-heal", playerId: player?.id });
        };
        
        renderer.onDebugSkipTurn = () => {
            game!.addLog(`🐛 DEBUG: ${game!.state.players[game!.state.currentPlayerIndex].id} skipped turn`);
            game!.endTurn();
            if (isMultiplayer) sendActionToServer({ type: "debug-skip-turn" });
        };
        
        renderer.onDebugReset = () => {
            if (isMultiplayer) {
                socketClient.sendGameAction({ type: "reset-game" }, null);
            } else {
                location.reload();
            }
        };
        
        renderer.onDebugLeaveGame = () => {
            // Properly leave the room and clear session
            socketClient.leaveRoom();
            // Reload to show fresh lobby
            location.reload();
        };
    }

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================

    window.addEventListener("resize", () => {
        renderer?.renderAll();
    });

    window.addEventListener("keydown", (e) => {
        if (!game || !renderer) return;
        if (isMultiplayer && !isMyTurn()) return;
        
        switch (e.code) {
            case "Digit1":
                game.doGather();
                break;
            case "Digit2":
                game.doTrade();
                break;
            case "Digit3":
                game.doExplore();
                break;
            case "KeyQ":
            case "KeyE":
                if (game.state.uiMode === "TILE_PLACEMENT") {
                    game.rotatePendingTile();
                }
                break;
            default:
                return;
        }
        
        e.preventDefault();
        renderer.renderAll();
    });

    // ========================================
    // START
    // ========================================
    
    tryReconnect();
}

// Run the application
main().catch(console.error);
