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
