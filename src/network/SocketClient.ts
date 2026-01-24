/**
 * SocketClient - Connection to multiplayer server
 * 
 * Supports:
 * - Create/join rooms
 * - Reconnect after page refresh
 * - Server-authoritative state sync
 */

import { io, Socket } from "socket.io-client";

export interface LobbyPlayer {
    id: string;
    socketId: string;
    sessionId: string;
    name: string;
    isAdmin: boolean;
    ready: boolean;
    connected: boolean;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "in-lobby" | "in-game";

const SESSION_KEY = "cosmic-frontier-session";
const ROOM_KEY = "cosmic-frontier-room";

export class SocketClient {
    private socket: Socket | null = null;
    private serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

    // State
    public connectionState: ConnectionState = "disconnected";
    public roomCode: string | null = null;
    public playerId: string | null = null;
    public sessionId: string | null = null;
    public players: LobbyPlayer[] = [];
    public isAdmin = false;

    // Callbacks
    public onStateChange: (() => void) | null = null;
    public onPlayersUpdate: ((players: LobbyPlayer[]) => void) | null = null;
    public onGameStart: ((data: { players: LobbyPlayer[]; playerCount: number; initialState: any }) => void) | null = null;
    public onGameUpdate: ((data: { action: any; state: any; fromPlayer: string }) => void) | null = null;
    public onGameReset: ((data: { reason: string }) => void) | null = null;
    public onReconnected: ((data: { gameState: any; players: LobbyPlayer[] }) => void) | null = null;
    public onPlayerDisconnected: ((playerId: string, playerName: string) => void) | null = null;
    public onPlayerReconnected: ((playerId: string, playerName: string) => void) | null = null;
    public onError: ((error: string) => void) | null = null;

    constructor() {
        // Try to restore session from localStorage
        this.sessionId = localStorage.getItem(SESSION_KEY);
        this.roomCode = localStorage.getItem(ROOM_KEY);
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve();
                return;
            }

            this.connectionState = "connecting";
            this.onStateChange?.();

            this.socket = io(this.serverUrl, {
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
            });

            this.socket.on("connect", () => {
                console.log("[Client] Connected to server");
                this.connectionState = "connected";
                this.onStateChange?.();
                resolve();
            });

            this.socket.on("connect_error", (err) => {
                console.error("[Client] Connection error:", err);
                this.connectionState = "disconnected";
                this.onStateChange?.();
                reject(err);
            });

            this.socket.on("disconnect", () => {
                console.log("[Client] Disconnected from server");
                // Don't clear session - we want to reconnect
                this.connectionState = "disconnected";
                this.onStateChange?.();
            });

            // Lobby events
            this.socket.on("player-joined", (data) => {
                this.players = data.players;
                this.onPlayersUpdate?.(this.players);
            });

            this.socket.on("player-left", (data) => {
                this.players = data.players;
                const me = this.players.find((p) => p.id === this.playerId);
                if (me) {
                    this.isAdmin = me.isAdmin;
                    this.playerId = me.id; // Update in case IDs were reassigned
                }
                this.onPlayersUpdate?.(this.players);
            });

            this.socket.on("player-updated", (data) => {
                this.players = data.players;
                this.onPlayersUpdate?.(this.players);
            });

            this.socket.on("player-disconnected", (data) => {
                this.players = data.players;
                this.onPlayersUpdate?.(this.players);
                this.onPlayerDisconnected?.(data.disconnectedPlayer.id, data.disconnectedPlayer.name);
            });

            this.socket.on("player-reconnected", (data) => {
                this.players = data.players;
                this.onPlayersUpdate?.(this.players);
                this.onPlayerReconnected?.(data.reconnectedPlayer.id, data.reconnectedPlayer.name);
            });

            this.socket.on("game-started", (data) => {
                this.connectionState = "in-game";
                this.onStateChange?.();
                this.onGameStart?.(data);
            });

            // Game events - server-authoritative
            this.socket.on("game-update", (data) => {
                this.onGameUpdate?.(data);
            });
            
            // Game reset
            this.socket.on("game-reset", (data) => {
                this.onGameReset?.(data);
            });
        });
    }

    // ========================================
    // RECONNECT
    // ========================================

    async tryReconnect(): Promise<{ success: boolean; gameStarted?: boolean; gameState?: any }> {
        if (!this.sessionId) {
            return { success: false };
        }

        if (!this.socket) await this.connect();

        return new Promise((resolve) => {
            this.socket!.emit("check-session", { sessionId: this.sessionId }, (response: any) => {
                if (response.success) {
                    this.roomCode = response.roomCode;
                    this.playerId = response.playerId;
                    this.players = response.players;
                    this.isAdmin = this.players.find(p => p.id === this.playerId)?.isAdmin || false;
                    
                    if (response.gameStarted) {
                        this.connectionState = "in-game";
                    } else {
                        this.connectionState = "in-lobby";
                    }
                    this.onStateChange?.();
                    this.onPlayersUpdate?.(this.players);

                    console.log(`[Client] Reconnected as ${this.playerId} in room ${this.roomCode}`);
                    
                    resolve({
                        success: true,
                        gameStarted: response.gameStarted,
                        gameState: response.gameState,
                    });
                } else {
                    // Session invalid, clear it
                    localStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(ROOM_KEY);
                    this.sessionId = null;
                    this.roomCode = null;
                    resolve({ success: false });
                }
            });
        });
    }

    hasStoredSession(): boolean {
        return !!this.sessionId && !!this.roomCode;
    }

    // ========================================
    // LOBBY ACTIONS
    // ========================================

    async createRoom(playerName: string, maxPlayers: number = 4): Promise<{ success: boolean; error?: string }> {
        if (!this.socket) await this.connect();

        return new Promise((resolve) => {
            this.socket!.emit("create-room", { playerName, maxPlayers }, (response: any) => {
                if (response.success) {
                    this.roomCode = response.roomCode;
                    this.playerId = response.playerId;
                    this.sessionId = response.sessionId;
                    this.players = response.players;
                    this.isAdmin = true;
                    this.connectionState = "in-lobby";
                    
                    // Save session for reconnect
                    localStorage.setItem(SESSION_KEY, response.sessionId);
                    localStorage.setItem(ROOM_KEY, response.roomCode);
                    
                    this.onStateChange?.();
                    this.onPlayersUpdate?.(this.players);
                }
                resolve(response);
            });
        });
    }

    async joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; error?: string }> {
        if (!this.socket) await this.connect();

        return new Promise((resolve) => {
            this.socket!.emit("join-room", { roomCode, playerName }, (response: any) => {
                if (response.success) {
                    this.roomCode = response.roomCode;
                    this.playerId = response.playerId;
                    this.sessionId = response.sessionId;
                    this.players = response.players;
                    this.isAdmin = false;
                    this.connectionState = "in-lobby";
                    
                    // Save session for reconnect
                    localStorage.setItem(SESSION_KEY, response.sessionId);
                    localStorage.setItem(ROOM_KEY, response.roomCode);
                    
                    this.onStateChange?.();
                    this.onPlayersUpdate?.(this.players);
                }
                resolve(response);
            });
        });
    }

    setReady(ready: boolean): void {
        if (!this.socket || !this.roomCode) return;
        this.socket.emit("player-ready", { roomCode: this.roomCode, ready });
    }

    async startGame(initialState: any): Promise<{ success: boolean; error?: string }> {
        if (!this.socket || !this.roomCode) {
            return { success: false, error: "Not in a room" };
        }

        return new Promise((resolve) => {
            this.socket!.emit("start-game", { roomCode: this.roomCode, initialState }, (response: any) => {
                resolve(response);
            });
        });
    }

    // ========================================
    // GAME ACTIONS - Server-Authoritative
    // ========================================

    /**
     * Send action AND new state to server
     * Server stores state and broadcasts to all players
     */
    sendGameAction(action: any, newState: any): void {
        if (!this.socket || !this.roomCode) return;
        this.socket.emit("game-action", {
            roomCode: this.roomCode,
            action,
            newState,
        });
    }

    /**
     * Request current state from server (for resync)
     */
    async requestState(): Promise<{ success: boolean; gameState?: any; players?: LobbyPlayer[] }> {
        if (!this.socket || !this.roomCode) {
            return { success: false };
        }

        return new Promise((resolve) => {
            this.socket!.emit("request-state", { roomCode: this.roomCode }, (response: any) => {
                resolve(response);
            });
        });
    }

    /**
     * Leave current room and clear session
     */
    leaveRoom(): void {
        if (this.socket && this.roomCode) {
            this.socket.emit("leave-room", { roomCode: this.roomCode });
        }
        
        // Clear local state
        this.roomCode = null;
        this.playerId = null;
        this.sessionId = null;
        this.players = [];
        this.isAdmin = false;
        this.connectionState = "connected";
        
        // Clear stored session
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ROOM_KEY);
        
        this.onStateChange?.();
    }

    /**
     * Disconnect completely
     */
    disconnect(): void {
        this.leaveRoom();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connectionState = "disconnected";
        this.onStateChange?.();
    }
}

// Global singleton
export const socketClient = new SocketClient();
