import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { io, type Socket } from 'socket.io-client';
import { createInitialState } from '../../src/core/GameState';

const port = 3197;
let server: ChildProcess;
const sockets: Socket[] = [];
const connect = async () => {
    const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
};
const request = (socket: Socket, event: string, data: unknown): Promise<any> => socket.timeout(3000).emitWithAck(event, data);
const event = (socket: Socket, name: string): Promise<any> => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out: ${name}`)), 3000);
    socket.once(name, data => { clearTimeout(timer); resolve(data); });
});

beforeAll(async () => {
    server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
        env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
        server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
        server.stdout!.on('data', chunk => {
            if (String(chunk).includes('running on')) { clearTimeout(timer); resolve(); }
        });
    });
});
afterAll(() => { sockets.forEach(socket => socket.disconnect()); server?.kill(); });

describe('multiplayer room lifecycle', () => {
    it('creates, joins, starts, synchronizes actions and restores a disconnected player', async () => {
        const host = await connect();
        const guest = await connect();
        const room = await request(host, 'create-room', { playerName: 'Host', maxPlayers: 2 });
        expect(room.success).toBe(true);
        const joined = await request(guest, 'join-room', { roomCode: room.roomCode, playerName: 'Guest' });
        expect(joined.playerId).toBe('P2');
        for (const socket of [host, guest]) {
            const updated = event(socket, 'player-updated');
            socket.emit('update-player-data', { roomCode: room.roomCode, data: { raceId: 'bioform', raceOption: 'A' } });
            await updated;
        }
        const state = createInitialState(2, 'none');
        const initialState = { ...state, board: undefined, tiles: state.board.getAllTiles(), tileDeck: state.tileDeck.serialize() };
        const started = event(guest, 'game-started');
        expect((await request(host, 'start-game', { roomCode: room.roomCode, initialState })).success).toBe(true);
        expect((await started).initialState.players).toHaveLength(2);
        const synced = event(guest, 'game-update');
        const pendingCombat = { playerId: 'P1', tileCoord: { q: 0, r: 0 }, fromCoord: { q: 1, r: 0 }, spend: {} };
        host.emit('game-action', { roomCode: room.roomCode, action: { type: 'hex-click', target: { q: 0, r: 0 } }, newState: { ...initialState, pendingCombat, uiMode: 'PRE_COMBAT' } });
        expect((await synced).state.pendingCombat).toEqual(pendingCombat);
        const rejected = event(guest, 'action-rejected');
        guest.emit('game-action', { roomCode: room.roomCode, action: { type: 'gather' }, newState: initialState });
        expect((await rejected).error).toContain('Not your turn');
        guest.disconnect();
        const rejoined = await connect();
        const restored = await request(rejoined, 'check-session', { sessionId: joined.sessionId });
        expect(restored.success).toBe(true);
        expect(restored.playerId).toBe('P2');
        expect(restored.gameState.pendingCombat).toEqual(pendingCombat);
        expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200);
    });
});
