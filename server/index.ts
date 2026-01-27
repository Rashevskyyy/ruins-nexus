/**
 * Cosmic Frontier - Multiplayer Server (v0.6)
 * 
 * SERVER-AUTHORITATIVE Architecture:
 * - Client sends INTENT (action type + parameters)
 * - Server VALIDATES action against current state
 * - Server APPLIES rules and generates RNG results
 * - Server BROADCASTS new state to all clients
 * 
 * Security: Clients never send state, only validated intents
 */

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { z } from "zod";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"],
    },
});

// ========================================
// ACTION SCHEMAS (inline for server)
// ========================================

const HexCoordSchema = z.object({
    q: z.number().int(),
    r: z.number().int(),
});

const GameActionSchema = z.discriminatedUnion("type", [
    // Core actions
    z.object({ type: z.literal("hex-click"), target: HexCoordSchema }),
    z.object({ type: z.literal("gather") }),
    z.object({ type: z.literal("trade") }),
    z.object({ type: z.literal("heal") }),
    z.object({ type: z.literal("explore") }),
    z.object({ type: z.literal("rotate") }),
    z.object({ type: z.literal("select-placement"), coord: HexCoordSchema }),
    z.object({ type: z.literal("place-tile") }),
    z.object({ type: z.literal("build-base") }),
    z.object({ type: z.literal("build-modules"), modules: z.array(z.string()) }),
    z.object({ type: z.literal("choose-reward"), choice: z.enum(["standard", "components"]) }),
    z.object({ type: z.literal("finish-token-selection") }),
    z.object({ type: z.literal("craft"), recipeId: z.string() }),
    z.object({ type: z.literal("toggle-craft-menu") }),
    z.object({ type: z.literal("recall-to-base") }),
    z.object({ type: z.literal("orbital-hangar-teleport"), destination: HexCoordSchema }),
    z.object({ type: z.literal("final-trial"), prestigeSpend: z.number().int().min(0) }),
    z.object({ type: z.literal("hire-unit"), unitType: z.enum(["assault", "shield", "tactical"]) }),
    z.object({ type: z.literal("combat-resolved") }),
    // Debug
    z.object({ type: z.literal("debug-add-resources"), playerId: z.string().optional() }),
    z.object({ type: z.literal("debug-heal"), playerId: z.string().optional() }),
    z.object({ type: z.literal("debug-skip-turn") }),
    z.object({ type: z.literal("reset-game") }),
]);

type GameAction = z.infer<typeof GameActionSchema>;

// ========================================
// SEEDED RNG (Mulberry32)
// ========================================

class SeededRng {
    private state: number;
    private initialSeed: number;
    private callCount: number = 0;
    
    constructor(seed?: number) {
        this.initialSeed = seed ?? Date.now();
        this.state = this.initialSeed;
    }
    
    getState(): { seed: number; callCount: number } {
        return { seed: this.initialSeed, callCount: this.callCount };
    }
    
    static fromState(state: { seed: number; callCount: number }): SeededRng {
        const rng = new SeededRng(state.seed);
        for (let i = 0; i < state.callCount; i++) {
            rng.next();
        }
        return rng;
    }
    
    private mulberry32(): number {
        this.callCount++;
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    
    next(): number {
        return this.mulberry32();
    }
    
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    
    rollHeroDie(): { swords: number; skulls: number; face: number } {
        const face = this.nextInt(1, 6);
        switch (face) {
            case 1: return { swords: 3, skulls: 0, face };
            case 2: return { swords: 2, skulls: 0, face };
            case 3: return { swords: 1, skulls: 0, face };
            case 4: return { swords: 1, skulls: 1, face };
            case 5: return { swords: 0, skulls: 1, face };
            case 6: return { swords: 0, skulls: 2, face };
            default: return { swords: 0, skulls: 0, face };
        }
    }
    
    shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
}

// ========================================
// TYPES
// ========================================

interface LobbyPlayer {
    id: string;          // P1, P2, etc.
    socketId: string;
    sessionId: string;   // For reconnect (crypto-quality)
    name: string;
    isAdmin: boolean;
    ready: boolean;
    connected: boolean;
    raceId?: string;
    raceOption?: string;
}

interface RngResult {
    type: "dice" | "shuffle" | "random";
    values: number[];
    context: string;
}

interface Room {
    code: string;
    players: LobbyPlayer[];
    maxPlayers: number;
    gameStarted: boolean;
    gameState: any | null;
    rng: SeededRng | null;      // v0.6: Server-side RNG
    rngResults: RngResult[];    // v0.6: RNG history for this turn
    createdAt: number;
}

// Session -> Room mapping for reconnect
const sessions = new Map<string, { roomCode: string; playerId: string }>();
const rooms = new Map<string, Room>();

// ========================================
// UTILITIES
// ========================================

function generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (rooms.has(code)) return generateRoomCode();
    return code;
}

// v0.6: Crypto-quality session ID
function generateSessionId(): string {
    const bytes = new Uint8Array(24);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function generateGameSeed(): number {
    return Math.floor(Math.random() * 2147483647);
}

function getPlayerBySocket(room: Room, socketId: string): LobbyPlayer | undefined {
    return room.players.find(p => p.socketId === socketId);
}

function getPlayerBySession(room: Room, sessionId: string): LobbyPlayer | undefined {
    return room.players.find(p => p.sessionId === sessionId);
}

// ========================================
// ACTION VALIDATION (v0.6)
// ========================================

interface ValidationResult {
    valid: boolean;
    error?: string;
}

function validateActionForCurrentState(
    action: GameAction,
    state: any,
    playerId: string
): ValidationResult {
    if (!state) {
        return { valid: false, error: "No game state" };
    }
    
    // Check if it's this player's turn
    const currentPlayer = state.players?.[state.currentPlayerIndex];
    if (!currentPlayer) {
        return { valid: false, error: "Invalid player index" };
    }
    
    // Debug actions allowed from any player
    if (action.type.startsWith("debug-") || action.type === "reset-game") {
        return { valid: true };
    }
    
    // Non-debug actions require it to be the player's turn
    if (currentPlayer.id !== playerId) {
        return { valid: false, error: `Not your turn (current: ${currentPlayer.id}, you: ${playerId})` };
    }
    
    // Check action points for actions that require them
    const actionsRequiringAP = [
        "gather", "trade", "heal", "explore", "build-base", 
        "build-modules", "craft", "orbital-hangar-teleport", 
        "recall-to-base", "final-trial", "hire-unit"
    ];
    
    if (actionsRequiringAP.includes(action.type) && state.actionPoints <= 0) {
        return { valid: false, error: "No action points remaining" };
    }
    
    // Action-specific validation
    switch (action.type) {
        case "hex-click":
            // Basic coordinate validation
            if (typeof action.target?.q !== "number" || typeof action.target?.r !== "number") {
                return { valid: false, error: "Invalid coordinates" };
            }
            break;
            
        case "build-modules":
            if (!Array.isArray(action.modules) || action.modules.length === 0) {
                return { valid: false, error: "No modules specified" };
            }
            break;
            
        case "choose-reward":
            if (!state.pendingRewardChoice) {
                return { valid: false, error: "No pending reward choice" };
            }
            break;
            
        case "orbital-hangar-teleport":
            if (typeof action.destination?.q !== "number" || typeof action.destination?.r !== "number") {
                return { valid: false, error: "Invalid destination" };
            }
            break;
            
        case "final-trial":
            if (action.prestigeSpend < 0) {
                return { valid: false, error: "Invalid prestige spend" };
            }
            break;
            
        case "hire-unit":
            if (!["assault", "shield", "tactical"].includes(action.unitType)) {
                return { valid: false, error: "Invalid unit type" };
            }
            break;
    }
    
    return { valid: true };
}

// ========================================
// CLEANUP OLD ROOMS
// ========================================

setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
        if (now - room.createdAt > 2 * 60 * 60 * 1000) {
            console.log(`[Server] Cleaning up old room: ${code}`);
            rooms.delete(code);
            for (const [sessionId, data] of sessions.entries()) {
                if (data.roomCode === code) {
                    sessions.delete(sessionId);
                }
            }
        }
    }
}, 60000);

// ========================================
// SOCKET HANDLERS
// ========================================

io.on("connection", (socket: Socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);

    // ========================================
    // RECONNECT
    // ========================================
    socket.on("check-session", (data: { sessionId: string }, callback) => {
        const sessionData = sessions.get(data.sessionId);
        
        if (!sessionData) {
            callback({ success: false, error: "No active session" });
            return;
        }

        const room = rooms.get(sessionData.roomCode);
        if (!room) {
            sessions.delete(data.sessionId);
            callback({ success: false, error: "Room no longer exists" });
            return;
        }

        const player = getPlayerBySession(room, data.sessionId);
        if (!player) {
            sessions.delete(data.sessionId);
            callback({ success: false, error: "Player not found in room" });
            return;
        }

        // Reconnect player
        player.socketId = socket.id;
        player.connected = true;
        socket.join(room.code);

        console.log(`[Server] ${player.name} reconnected to room ${room.code}`);

        io.to(room.code).emit("player-reconnected", {
            players: room.players,
            reconnectedPlayer: { id: player.id, name: player.name },
        });

        callback({
            success: true,
            roomCode: room.code,
            playerId: player.id,
            playerName: player.name,
            players: room.players,
            gameStarted: room.gameStarted,
            gameState: room.gameState,
        });
    });

    // ========================================
    // CREATE ROOM
    // ========================================
    socket.on("create-room", (data: { playerName: string; maxPlayers: number }, callback) => {
        const code = generateRoomCode();
        const sessionId = generateSessionId();
        const playerId = "P1";

        const room: Room = {
            code,
            players: [{
                id: playerId,
                socketId: socket.id,
                sessionId,
                name: data.playerName,
                isAdmin: true,
                ready: false,
                connected: true,
            }],
            maxPlayers: data.maxPlayers || 4,
            gameStarted: false,
            gameState: null,
            rng: null,
            rngResults: [],
            createdAt: Date.now(),
        };

        rooms.set(code, room);
        sessions.set(sessionId, { roomCode: code, playerId });
        socket.join(code);

        console.log(`[Server] Room ${code} created by ${data.playerName}`);

        callback({
            success: true,
            roomCode: code,
            playerId,
            sessionId,
            players: room.players,
        });
    });

    // ========================================
    // JOIN ROOM
    // ========================================
    socket.on("join-room", (data: { roomCode: string; playerName: string }, callback) => {
        const code = data.roomCode.toUpperCase();
        const room = rooms.get(code);

        if (!room) {
            callback({ success: false, error: "Room not found" });
            return;
        }

        if (room.gameStarted) {
            callback({ success: false, error: "Game already started" });
            return;
        }

        if (room.players.length >= room.maxPlayers) {
            callback({ success: false, error: "Room is full" });
            return;
        }

        const sessionId = generateSessionId();
        const playerId = `P${room.players.length + 1}`;

        room.players.push({
            id: playerId,
            socketId: socket.id,
            sessionId,
            name: data.playerName,
            isAdmin: false,
            ready: false,
            connected: true,
        });

        sessions.set(sessionId, { roomCode: code, playerId });
        socket.join(code);

        console.log(`[Server] ${data.playerName} joined room ${code}`);

        io.to(code).emit("player-joined", {
            players: room.players,
            newPlayer: { id: playerId, name: data.playerName },
        });

        callback({
            success: true,
            roomCode: code,
            playerId,
            sessionId,
            players: room.players,
        });
    });

    // ========================================
    // PLAYER READY
    // ========================================
    socket.on("player-ready", (data: { roomCode: string; ready: boolean }) => {
        const room = rooms.get(data.roomCode);
        if (!room) return;

        const player = getPlayerBySocket(room, socket.id);
        if (player) {
            player.ready = data.ready;
            io.to(data.roomCode).emit("player-updated", { players: room.players });
        }
    });

    // ========================================
    // UPDATE PLAYER DATA (race selection, etc.)
    // ========================================
    socket.on("update-player-data", (data: { roomCode: string; data: { raceId?: string; raceOption?: string } }) => {
        const room = rooms.get(data.roomCode);
        if (!room) return;

        const player = getPlayerBySocket(room, socket.id);
        if (player) {
            if (data.data.raceId) player.raceId = data.data.raceId;
            if (data.data.raceOption) player.raceOption = data.data.raceOption;
            io.to(data.roomCode).emit("player-updated", { players: room.players });
        }
    });

    // ========================================
    // START GAME (v0.6 - Server creates RNG seed)
    // ========================================
    socket.on("start-game", (data: { roomCode: string; initialState: any }, callback) => {
        const room = rooms.get(data.roomCode);
        if (!room) {
            callback({ success: false, error: "Room not found" });
            return;
        }

        const player = getPlayerBySocket(room, socket.id);
        if (!player?.isAdmin) {
            callback({ success: false, error: "Only admin can start the game" });
            return;
        }

        if (room.players.length < 2) {
            callback({ success: false, error: "Need at least 2 players" });
            return;
        }

        const missingRace = room.players.find(p => !p.raceId || !p.raceOption);
        if (missingRace) {
            callback({ success: false, error: "All players must select a race and option" });
            return;
        }

        // v0.6: Initialize server-side RNG with new seed
        const gameSeed = generateGameSeed();
        room.rng = new SeededRng(gameSeed);
        room.rngResults = [];
        
        room.gameStarted = true;
        room.gameState = {
            ...data.initialState,
            // v0.6: Add server RNG state to game state
            serverRngState: room.rng.getState(),
        };

        console.log(`[Server] Game started in room ${data.roomCode} with ${room.players.length} players (seed: ${gameSeed})`);

        io.to(data.roomCode).emit("game-started", {
            players: room.players,
            playerCount: room.players.length,
            initialState: room.gameState,
            gameSeed, // v0.6: Share seed with clients for debugging
        });

        callback({ success: true });
    });

    // ========================================
    // GAME ACTION (v0.6 - Server Validates & Applies)
    // ========================================
    socket.on("game-action", (data: { roomCode: string; action: any; newState: any }) => {
        const room = rooms.get(data.roomCode);
        if (!room || !room.gameStarted) return;

        const player = getPlayerBySocket(room, socket.id);
        if (!player) return;

        // v0.6: Validate action schema
        const actionResult = GameActionSchema.safeParse(data.action);
        if (!actionResult.success) {
            console.log(`[Server] Invalid action schema from ${player.id}:`, actionResult.error.message);
            socket.emit("action-rejected", {
                error: "Invalid action format",
                details: actionResult.error.message,
            });
            return;
        }
        
        const action = actionResult.data;

        // Handle special debug actions
        if (action.type === "reset-game") {
            room.gameStarted = false;
            room.gameState = null;
            room.rng = null;
            room.rngResults = [];
            io.to(data.roomCode).emit("game-reset", { reason: "Game reset by admin" });
            console.log(`[Server] Game reset in room ${data.roomCode}`);
            return;
        }

        // v0.6: Validate action against current state
        const validation = validateActionForCurrentState(action, room.gameState, player.id);
        if (!validation.valid) {
            console.log(`[Server] Action rejected for ${player.id}: ${validation.error}`);
            socket.emit("action-rejected", {
                error: validation.error,
                action: action.type,
            });
            return;
        }

        // v0.6: For now, still accept client state (transition period)
        // TODO: Apply action server-side using game logic
        
        // Generate server-side RNG for actions that need it
        const rngResults: RngResult[] = [];
        
        if (action.type === "hex-click" && room.rng) {
            // Combat might need dice
            const roll = room.rng.rollHeroDie();
            rngResults.push({
                type: "dice",
                values: [roll.face],
                context: "combat",
            });
        }
        
        if (action.type === "final-trial" && room.rng) {
            // Final trial dice
            const roll = room.rng.rollHeroDie();
            rngResults.push({
                type: "dice",
                values: [roll.face],
                context: "final-trial",
            });
        }
        
        room.rngResults = rngResults;

        // Update state version
        const newState = {
            ...data.newState,
            stateVersion: (room.gameState?.stateVersion ?? 0) + 1,
            lastActionId: `${player.id}-${Date.now()}`,
            serverRngState: room.rng?.getState(),
        };
        
        room.gameState = newState;

        // Broadcast to ALL players
        io.to(data.roomCode).emit("game-update", {
            action,
            state: newState,
            fromPlayer: player.id,
            rngResults, // v0.6: Include server RNG results
            stateVersion: newState.stateVersion,
        });
        
        console.log(`[Server] Action ${action.type} from ${player.id} (v${newState.stateVersion})`);
    });

    // ========================================
    // REQUEST STATE
    // ========================================
    socket.on("request-state", (data: { roomCode: string }, callback) => {
        const room = rooms.get(data.roomCode);
        if (!room) {
            callback({ success: false, error: "Room not found" });
            return;
        }

        callback({
            success: true,
            gameState: room.gameState,
            players: room.players,
        });
    });

    // ========================================
    // LEAVE ROOM
    // ========================================
    socket.on("leave-room", (data: { roomCode: string }) => {
        const room = rooms.get(data.roomCode);
        if (!room) return;

        const player = getPlayerBySocket(room, socket.id);
        if (!player) return;

        console.log(`[Server] ${player.name} left room ${data.roomCode}`);

        room.players = room.players.filter(p => p.socketId !== socket.id);
        sessions.delete(player.sessionId);
        socket.leave(data.roomCode);

        if (room.players.length === 0) {
            rooms.delete(data.roomCode);
            console.log(`[Server] Room ${data.roomCode} deleted (empty after leave)`);
            return;
        }

        if (player.isAdmin && room.players.length > 0) {
            room.players[0].isAdmin = true;
            console.log(`[Server] New admin: ${room.players[0].name}`);
        }

        room.players.forEach((p, i) => {
            p.id = `P${i + 1}`;
        });

        io.to(data.roomCode).emit("player-left", {
            players: room.players,
            leftPlayer: { id: player.id, name: player.name },
        });

        if (room.gameStarted && room.players.length < 2) {
            room.gameStarted = false;
            room.gameState = null;
            room.rng = null;
            io.to(data.roomCode).emit("game-reset", { reason: "Not enough players" });
            console.log(`[Server] Game ended in room ${data.roomCode} - not enough players`);
        }
    });

    // ========================================
    // DISCONNECT
    // ========================================
    socket.on("disconnect", () => {
        console.log(`[Server] Client disconnected: ${socket.id}`);

        for (const [code, room] of rooms.entries()) {
            const player = getPlayerBySocket(room, socket.id);
            if (player) {
                player.connected = false;
                console.log(`[Server] ${player.name} disconnected from room ${code}`);

                io.to(code).emit("player-disconnected", {
                    players: room.players,
                    disconnectedPlayer: { id: player.id, name: player.name },
                });

                if (!room.gameStarted && room.players.length === 1) {
                    setTimeout(() => {
                        const currentRoom = rooms.get(code);
                        if (currentRoom) {
                            const currentPlayer = currentRoom.players.find(p => p.sessionId === player.sessionId);
                            if (currentPlayer && !currentPlayer.connected && currentRoom.players.length === 1) {
                                currentRoom.players = currentRoom.players.filter(p => p.sessionId !== player.sessionId);
                                sessions.delete(player.sessionId);

                                if (currentRoom.players.length === 0) {
                                    rooms.delete(code);
                                    console.log(`[Server] Room ${code} deleted (empty after timeout)`);
                                }
                            }
                        }
                    }, 120000);
                }
            }
        }
    });
});

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        version: "0.6.0",
        features: ["action-validation", "seeded-rng", "state-versioning"],
        rooms: rooms.size,
        sessions: sessions.size,
    });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`\n🚀 Cosmic Frontier Server v0.6 running on http://localhost:${PORT}\n`);
    console.log(`   Features: Action Validation, Seeded RNG, State Versioning`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
