# Ruins Nexus

A PixiJS v8 multiplayer tactics board game: races, rooms, Socket.io and a Node server.
Not a tutorial clone — a full client/server loop. Optional Supabase for persistence.

## Setup

Copy `.env.example` to `.env` and fill in your own keys. Never commit `.env`.

```bash
npm install
npm run dev:all
```

`dev:all` starts the Socket.io server and the Vite client together.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite client |
| `npm run server` | Node game server |
| `npm run dev:all` | Client + server |
| `npm test` | Unit tests |

## Stack

PixiJS v8, Socket.io, Express, TypeScript, Supabase.

## Production / local multiplayer

Requires Node.js 22 or newer. Supabase is optional; rooms work without keys.

```bash
npm ci
npm run build
npm start
```

Open http://localhost:3001 in two separate browser profiles (or on two devices,
using the server computer's LAN address). Create a room, join with its code,
select a race and option for each player, ready up, then start as host.
Reloading the page restores the room while the server remains running.

Development: `npm run dev:all`, then open the Vite URL. Vite proxies Socket.IO
to port 3001. Keep `VITE_SERVER_URL` empty unless the server is hosted separately.
Production serves the built client and game rules from the same server.

Current limitations: rooms live in memory and disappear on server restart.
The server validates action envelopes and turn ownership, but gameplay state
and dice are still calculated by clients; this is for trusted-player sessions,
not cheat-resistant public matchmaking.
