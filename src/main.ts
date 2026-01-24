import * as PIXI from "pixi.js";
import { createInitialState } from "./core/GameState";
import { Game } from "./core/Game";
import { GameRenderer } from "./render/GameRenderer";
import { LobbyScreen } from "./screens/LobbyScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { socketClient } from "./network/SocketClient";
import { AssetLoader, GAME_VERSION } from "./assets/AssetLoader";

// ========================================
// INIT PIXI APP
// ========================================

const app = new PIXI.Application();
await app.init({
    resizeTo: window,
    backgroundAlpha: 1,
    backgroundColor: 0x0a0a1a,
    resolution: window.devicePixelRatio || 2, // High DPI support
    autoDensity: true, // Automatically adjust for resolution
    antialias: true, // Smoother edges
});

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
// LOBBY SCREEN
// ========================================

const lobbyScreen = new LobbyScreen(app);

lobbyScreen.onGameStart = (playerCount: number, playerId: string, initialState?: any) => {
    console.log(`[Main] Starting game with ${playerCount} players, I am ${playerId}`);
    myPlayerId = playerId;
    isMultiplayer = true;
    
    if (initialState) {
        // Use state from server (for non-admin players or reconnect)
        startGameWithState(initialState, playerCount);
    } else {
        // Create new state (admin player)
        startGame(playerCount);
    }
};

// Admin requests to start - create state and send to server
lobbyScreen.onRequestStart = async () => {
    console.log("[Main] Admin requesting game start");
    
    // Create initial state
    const state = createInitialState();
    state.players = state.players.slice(0, socketClient.players.length);
    
    // Serialize for server
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
        isFinalPhase: state.isFinalPhase,
        finalRoundsLeft: state.finalRoundsLeft,
        finalThreatHp: state.finalThreatHp,
        gameOver: state.gameOver,
        winnerId: state.winnerId,
        missionFailed: state.missionFailed,
        players: state.players,
        tiles: state.board.getAllTiles(),
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
        lobbyScreen.show();
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
        console.log("[Main] No active session, showing lobby");
        lobbyScreen.show();
    }
}

// Start reconnect attempt
tryReconnect();

// ========================================
// MULTIPLAYER SYNC
// ========================================

// Receive game updates from server
socketClient.onGameUpdate = (data: { action: any; state: any; fromPlayer: string }) => {
    if (!game || !renderer) return;
    
    // Skip if this update is from me (I already applied it locally)
    if (data.fromPlayer === myPlayerId) return;
    
    console.log(`[Main] Received update from ${data.fromPlayer}:`, data.action.type);
    
    // Apply state from server
    applyServerState(data.state);
    renderer.renderAll();
};

// Handle player disconnect/reconnect
socketClient.onPlayerDisconnected = (_playerId: string, playerName: string) => {
    console.log(`[Main] ${playerName} disconnected`);
    // Could show notification
};

socketClient.onPlayerReconnected = (_playerId: string, playerName: string) => {
    console.log(`[Main] ${playerName} reconnected`);
    // Could show notification
};

// Handle game reset
socketClient.onGameReset = (data: { reason: string }) => {
    console.log(`[Main] Game reset: ${data.reason}`);
    // Clear game state and show lobby
    game = null as any;
    renderer = null as any;
    lobbyScreen.show();
};

// ========================================
// START GAME
// ========================================

function startGame(playerCount: number) {
    const state = createInitialState();
    state.players = state.players.slice(0, playerCount);
    
    game = new Game(state);
    renderer = new GameRenderer(app, game);
    setupDebugCallbacks();
    
    if (isMultiplayer) {
        renderer.isMyTurnFn = isMyTurn;
        renderer.myPlayerId = myPlayerId;
        wrapGameForMultiplayer();
        
        // Admin sends initial state to server
        if (myPlayerId === "P1") {
            const serializedState = serializeGameState();
            socketClient.startGame(serializedState);
        }
    }
    
    renderer.renderAll();
}

function startGameWithState(serverState: any, playerCount: number) {
    // Create game with initial state
    const state = createInitialState();
    state.players = state.players.slice(0, playerCount);
    
    game = new Game(state);
    
    // Apply server state
    applyServerState(serverState);
    
    renderer = new GameRenderer(app, game);
    setupDebugCallbacks();
    
    if (isMultiplayer) {
        renderer.isMyTurnFn = isMyTurn;
        renderer.myPlayerId = myPlayerId;
        wrapGameForMultiplayer();
    }
    
    renderer.renderAll();
}

function applyServerState(serverState: any): void {
    if (!game) return;
    
    // Apply all simple fields
    game.state.currentPlayerIndex = serverState.currentPlayerIndex;
    game.state.round = serverState.round;
    game.state.actionPoints = serverState.actionPoints;
    game.state.movedInCurrentSlot = serverState.movedInCurrentSlot;
    game.state.actionUsedInCurrentSlot = serverState.actionUsedInCurrentSlot;
    game.state.uiMode = serverState.uiMode;
    game.state.pendingTileRotation = serverState.pendingTileRotation;
    game.state.selectedPlacementPosition = serverState.selectedPlacementPosition;
    game.state.eventLog = serverState.eventLog || [];
    game.state.isFinalPhase = serverState.isFinalPhase;
    game.state.finalRoundsLeft = serverState.finalRoundsLeft;
    game.state.finalThreatHp = serverState.finalThreatHp;
    game.state.gameOver = serverState.gameOver;
    game.state.winnerId = serverState.winnerId;
    game.state.missionFailed = serverState.missionFailed;
    game.state.players = serverState.players;
    
    // Restore Board from tiles
    if (serverState.tiles && Array.isArray(serverState.tiles)) {
        for (const tile of serverState.tiles) {
            game.state.board.setTile(tile);
        }
    }
}

function serializeGameState(): any {
    if (!game) return null;
    
    return {
        currentPlayerIndex: game.state.currentPlayerIndex,
        round: game.state.round,
        actionPoints: game.state.actionPoints,
        movedInCurrentSlot: game.state.movedInCurrentSlot,
        actionUsedInCurrentSlot: game.state.actionUsedInCurrentSlot,
        uiMode: game.state.uiMode,
        pendingTileRotation: game.state.pendingTileRotation,
        selectedPlacementPosition: game.state.selectedPlacementPosition,
        eventLog: game.state.eventLog,
        isFinalPhase: game.state.isFinalPhase,
        finalRoundsLeft: game.state.finalRoundsLeft,
        finalThreatHp: game.state.finalThreatHp,
        gameOver: game.state.gameOver,
        winnerId: game.state.winnerId,
        missionFailed: game.state.missionFailed,
        players: game.state.players,
        tiles: game.state.board.getAllTiles(),
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
        sendActionToServer({ type: "hex-click", target });
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
        if (result) sendActionToServer({ type: "place-tile" });
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
        localStorage.removeItem("sessionId");
        localStorage.removeItem("playerId");
        localStorage.removeItem("roomCode");
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
