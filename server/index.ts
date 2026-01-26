/**
 * Cosmic Frontier - Multiplayer Server
 * 
 * Server-Authoritative: Game state lives on server
 * Clients send actions, server validates and broadcasts state
 */

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"],
    },
});

// ========================================
// TYPES
// ========================================

interface LobbyPlayer {
    id: string;          // P1, P2, etc.
    socketId: string;
    sessionId: string;   // For reconnect
    name: string;
    isAdmin: boolean;
    ready: boolean;
    connected: boolean;  // Track connection status
}

interface Room {
    code: string;
    players: LobbyPlayer[];
    maxPlayers: number;
    gameStarted: boolean;
    gameState: any | null;
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

function generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getPlayerBySocket(room: Room, socketId: string): LobbyPlayer | undefined {
    return room.players.find(p => p.socketId === socketId);
}

function getPlayerBySession(room: Room, sessionId: string): LobbyPlayer | undefined {
    return room.players.find(p => p.sessionId === sessionId);
}

// Cleanup old rooms (older than 2 hours)
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
        if (now - room.createdAt > 2 * 60 * 60 * 1000) {
            console.log(`[Server] Cleaning up old room: ${code}`);
            rooms.delete(code);
            // Clean up sessions
            for (const [sessionId, data] of sessions.entries()) {
                if (data.roomCode === code) {
                    sessions.delete(sessionId);
                }
            }
        }
    }
}, 60000); // Check every minute

// ========================================
// SOCKET HANDLERS
// ========================================

io.on("connection", (socket: Socket) => {
    console.log(`[Server] Client connected: ${socket.id}`);

    // ========================================
    // RECONNECT - Check if player has active session
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

        // Notify others
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
            sessionId, // Client saves this for reconnect
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
    socket.on("update-player-data", (data: { roomCode: string; data: { raceId?: string } }) => {
        const room = rooms.get(data.roomCode);
        if (!room) return;

        const player = getPlayerBySocket(room, socket.id);
        if (player) {
            // Apply updates
            if (data.data.raceId) {
                (player as any).raceId = data.data.raceId;
            }
            io.to(data.roomCode).emit("player-updated", { players: room.players });
        }
    });

    // ========================================
    // START GAME
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

        room.gameStarted = true;
        room.gameState = data.initialState; // Store initial state from admin

        console.log(`[Server] Game started in room ${data.roomCode} with ${room.players.length} players`);

        // Send game start with initial state to ALL players
        io.to(data.roomCode).emit("game-started", {
            players: room.players,
            playerCount: room.players.length,
            initialState: room.gameState,
        });

        callback({ success: true });
    });

    // ========================================
    // GAME ACTION - Server stores state, broadcasts to all
    // ========================================
    socket.on("game-action", (data: { roomCode: string; action: any; newState: any }) => {
        const room = rooms.get(data.roomCode);
        if (!room || !room.gameStarted) return;

        const player = getPlayerBySocket(room, socket.id);
        if (!player) return;

        // Handle special debug actions
        if (data.action?.type === "reset-game") {
            // Reset the game - all players go back to lobby
            room.gameStarted = false;
            room.gameState = null;
            io.to(data.roomCode).emit("game-reset", { reason: "Game reset by admin" });
            console.log(`[Server] Game reset in room ${data.roomCode}`);
            return;
        }

        // Store the new state on server
        room.gameState = data.newState;

        // Broadcast action AND new state to ALL players (including sender for confirmation)
        io.to(data.roomCode).emit("game-update", {
            action: data.action,
            state: data.newState,
            fromPlayer: player.id,
        });
    });

    // ========================================
    // REQUEST STATE - For late joiners or resync
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
    // LEAVE ROOM - Player explicitly leaves
    // ========================================
    socket.on("leave-room", (data: { roomCode: string }) => {
        const room = rooms.get(data.roomCode);
        if (!room) return;

        const player = getPlayerBySocket(room, socket.id);
        if (!player) return;

        console.log(`[Server] ${player.name} left room ${data.roomCode}`);

        // Remove player from room
        room.players = room.players.filter(p => p.socketId !== socket.id);
        sessions.delete(player.sessionId);
        socket.leave(data.roomCode);

        // If room is empty, delete it
        if (room.players.length === 0) {
            rooms.delete(data.roomCode);
            console.log(`[Server] Room ${data.roomCode} deleted (empty after leave)`);
            return;
        }

        // Reassign admin if needed
        if (player.isAdmin && room.players.length > 0) {
            room.players[0].isAdmin = true;
            console.log(`[Server] New admin: ${room.players[0].name}`);
        }

        // Reassign player IDs
        room.players.forEach((p, i) => {
            p.id = `P${i + 1}`;
        });

        // Notify remaining players
        io.to(data.roomCode).emit("player-left", {
            players: room.players,
            leftPlayer: { id: player.id, name: player.name },
        });

        // If game was in progress and only 1 player left, end the game
        if (room.gameStarted && room.players.length < 2) {
            room.gameStarted = false;
            room.gameState = null;
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

                // Don't remove player, just mark as disconnected
                // They can reconnect with their sessionId
                io.to(code).emit("player-disconnected", {
                    players: room.players,
                    disconnectedPlayer: { id: player.id, name: player.name },
                });

                // If game hasn't started AND room only has this one player, remove after 2 minutes
                // Otherwise keep the room open for reconnects
                if (!room.gameStarted && room.players.length === 1) {
                    setTimeout(() => {
                        const currentRoom = rooms.get(code);
                        if (currentRoom) {
                            const currentPlayer = currentRoom.players.find(p => p.sessionId === player.sessionId);
                            if (currentPlayer && !currentPlayer.connected && currentRoom.players.length === 1) {
                                // Only remove if still the only player and still disconnected
                                currentRoom.players = currentRoom.players.filter(p => p.sessionId !== player.sessionId);
                                sessions.delete(player.sessionId);

                                if (currentRoom.players.length === 0) {
                                    rooms.delete(code);
                                    console.log(`[Server] Room ${code} deleted (empty after timeout)`);
                                }
                            }
                        }
                    }, 120000); // 2 minutes timeout
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
        rooms: rooms.size,
        sessions: sessions.size,
    });
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`\n🚀 Cosmic Frontier Server running on http://localhost:${PORT}\n`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
