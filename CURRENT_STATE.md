# Cosmic Frontier - Current Implementation State
## Version 0.2

---

## ✅ Fully Implemented

### Core Systems

#### Map & Tiles
- **Hexagonal map** with axial coordinates
- **Tile placement** (Carcassonne-style) during EXPLORE action
- **Tile rotation** (6 orientations, 60° each)
- **Blocked edges** ("mountains") that prevent movement
- **Fog tiles** (undiscovered placeholders around Landing Hub)
- **Tile deck**: 40 Tier 1 → 20 Tier 2 → 1 Final Tile (sequential)
- **2 pre-opened tiles** with Materials at game start

#### Tile Types
| Tier | Count | Resources | Monster HP | Blocked Edges |
|------|-------|-----------|------------|---------------|
| Tier 1 | 40 | 1 resource | 2 HP | 0-2 |
| Tier 2 | 20 | 2-3 resources | 4 HP | 1-3 |
| Final | 1 | - | Triggers Final Threat | 0 |

#### Resources
| Icon | Name | Use |
|------|------|-----|
| 🧬 | Biomass | Healing, support |
| 🧱 | Materials | Base, modules |
| ⚙ | Alloys | Advanced modules |

### Turn System (Karak 2 Rules)
- **2 action slots per turn**
- **Slot = optional Move + optional Action**
- Move is always BEFORE action
- Move without action = slot consumed
- **Combat ends turn immediately**

### Actions
- **GATHER** - collect resources (1 per tile per player per round cooldown)
- **TRADE** - exchange resources at Landing Hub
- **EXPLORE** - place new tile from deck
- **BUILD** - build Base or Modules

### Combat
- **Hero Die** (6 faces): 3⚔, 2⚔, 1⚔, 1⚔+1💀, 1💀, 2💀
- **Dice roll animation** with visual feedback
- ⚔ reduces monster HP
- 💀 reduces player HP
- Victory = monster HP ≤ 0, gain Prestige
- Defeat = pushed back to previous tile
- **KO System**: If HP reaches 0, player skips next turn and heals 3 HP

### Base & Modules
- **Base** (2🧱): +2 Prestige, 1 per player, on any cleared tile
- **Modules** (build any amount in 1 action when in own Base):
  - Assault Bay (2🧱 1⚙): +1 damage
  - Shield Array (2🧱 1⚙): ignore 1💀
  - Tactical Uplink (1🧱 2⚙): 1 reroll
  - Supply Depot (3🧱): +1 resource on gather
  - Relic Vault (2🧱 2⚙): activates relics
  - Beacon Spire (3🧱 3⚙): ultimate power

### Prestige
| Action | Prestige |
|--------|----------|
| Kill Tier 1 monster | +1 |
| Kill Tier 2 monster | +2 |
| Explore Tier 2 tile | +1 |
| Build Base | +2 |
| Build Module | +1 to +3 |

### Multiplayer
- **Socket.IO** real-time sync
- **Lobby system** - create/join rooms by code
- **Reconnect** - page refresh returns to game
- **Turn enforcement** - only active player can act
- **Server on Railway**, client on Vercel

### Authentication
- **Supabase** integration
- **Google OAuth** login
- Player name shown in lobby

### UI/HUD
- **Hero Board** - HP, resources, prestige, modules, inventory slots
- **Tile Deck** - remaining T1/T2 tiles
- **Event Log** - last 10 game events
- **Context Menu** - click tile to see available actions
- **Zoom/Pan** - scroll to zoom, right-drag to pan
- **Debug Panel** - add resources, heal, skip turn, reset game
- **Toast Notifications** - success/error/warning messages with animations
- **Tutorial Hints** - onboarding popups for new players (shown once per session)

---

## 🔄 Partially Implemented

### Final Phase
- ✅ Final Tile spawns Final Threat (40 HP)
- ✅ 6 round countdown starts
- ❌ Fighting Final Threat (not connected to combat)
- ❌ Game Over screen

### Module Effects
- ✅ UI and build system
- ❌ Actual combat bonuses not applied

### Items/Loot
- ✅ Inventory slots in Hero Board (Weapons, Spells, Amulet)
- ❌ No items drop from monsters
- ❌ No equip/use system

---

## ❌ Not Implemented

- Sound effects
- Animations (movement, attack)
- Different monster types
- Relics system
- Events (Tier 3)
- Tutorial
- Mobile UI optimization
- Leaderboard / statistics
- Matchmaking

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | TypeScript, PixiJS 8, Vite |
| Backend | Node.js, Express, Socket.IO |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase + Google OAuth |
| Hosting | Vercel (frontend), Railway (backend) |

---

## File Structure

```
src/
├── main.ts              # Entry point, multiplayer setup
├── core/
│   └── Game.ts          # Core game logic, actions
├── board/
│   ├── Board.ts         # Map management
│   ├── Tile.ts          # Tile types
│   ├── TileDeck.ts      # Tile generation
│   └── BlockedEdges.ts  # Edge rotation
├── systems/
│   ├── CombatSystem.ts  # Dice combat
│   ├── ExplorationSystem.ts
│   └── SettlementSystem.ts
├── render/
│   └── GameRenderer.ts  # All PixiJS rendering
├── screens/
│   └── LobbyScreen.ts   # Multiplayer lobby
├── network/
│   └── SocketClient.ts  # Socket.IO client
└── auth/
    └── supabase.ts      # Auth integration

server/
└── index.ts             # Socket.IO server
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development (client + server)
npm run dev:all

# Build for production
npm run build

# Deploy
git push  # Vercel auto-deploys
# Railway auto-deploys from main branch
```

---

## Environment Variables

### Client (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SERVER_URL=https://your-railway-url
```

### Server (Railway)
```
PORT=3001
CLIENT_URL=https://your-vercel-url
```
