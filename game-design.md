# PROJECT: Cosmic Frontier
## Game Design Document v1.1 (Cosmic Frontier rewrite, same core)

> **Theme**: Humanoid alien expeditions discover a habitable planet.  
> They explore uncharted regions, survive local lifeforms, build bases, and compete for Prestige.  
> No direct PvP.

---

# 0) Design Goals

- **No PvP** — no stealing, raiding, or destroying other players' assets
- **Tile Placement** — players build the map by placing tiles (Carcassonne-style)
- **Karak 2 action slots** — 2 slots, move before action within a slot
- **Base + Modules** — each player builds their own base with upgrades
- **Prestige** — primary scoring during the expedition
- **Mountains/Cliffs** — blocked edges create tactical decisions during tile placement
- **Final Threat** — Final Tile reveals a global threat; victory requires defeating it

---

# 1) Map Model

## Dynamic Map (Tile Placement)
The map is **not fixed**. Players reveal and place tiles during exploration.

### Starting Setup
- **1 Landing Hub** (center, discovered) — previously "Settlement"
- **6 fog tiles** (Ring 1, undiscovered placeholders)
- **2 random tiles** pre-opened with 🧱 Materials (no monster) *(optional “tutorial boost”)*

> Note: the “fog tiles” are placeholders; real tiles come from the deck via EXPLORE placement.

### Tile Placement Rules
- Player selects **EXPLORE** → enters placement mode
- Can rotate tile (6 orientations, 60° each)
- Must place adjacent to a discovered tile
- **Cannot place** if a blocked edge would prevent entering the new tile from the player’s current position
- After placement → tile is revealed (resources + local encounter)

---

# 2) Tile Deck

## Deck Composition (same math as previous version)
| Tier | Count | Resources | Local Threat (HP) | Blocked Edges |
|------|-------|-----------|-------------------|--------------|
| **Tier 1** | 40 | 1 resource | 2 HP | 0–2 edges |
| **Tier 2** | 20 | 2–3 resources | 4 HP | 1–3 edges |
| **Final Tile** | 1 | — | Final Threat | 0 edges |

**Total: 61 tiles**

### Tier 1 Distribution (40 tiles)
- 🧬 Biomass: 13 tiles
- 🧱 Materials: 13 tiles
- ⚙ Alloys: 14 tiles

### Tier 2 Distribution (20 tiles)
- 🧬+🧱: 5 tiles
- 🧬+⚙: 5 tiles
- 🧱+⚙: 5 tiles
- “Rich deposit” (3x single resource): 5 tiles

### Deck Order (unchanged)
**Tier 1 first** → **Tier 2 second** → **Final Tile last**

Tiles within each tier are shuffled, but tiers appear sequentially.

---

# 3) Resources

| Icon | Name | Primary Use |
|------|------|-------------|
| 🧬 | **Biomass** | healing/support, crew upkeep |
| 🧱 | **Materials** | base modules, infrastructure |
| ⚙ | **Alloys** | advanced modules, upgrades |

---

# 4) Turn Structure (Karak 2 Slot Rules)

## Action Slots
Each player has **2 slots per turn**.

### Slot Structure
Each slot = **optional Move (before)** + **optional Action (after)**

- **Move** — walk to adjacent discovered tile (FREE, but commits the slot)
- **Action** — Gather, Trade, Explore, Build

### Key Rules (same as before)
1. Movement is always **BEFORE** action, never after
2. Move without action = **slot consumed** (wasted)
3. Combat against a local threat **ends turn immediately** (burns remaining slots)
4. If you moved in current slot, you cannot move again until the next slot

### Example Turns
- `Move → Gather → Move → Explore` = 2 slots used
- `Move → Move → Gather` = 2 slots (first slot was just move)
- `Move → Fight` = turn ends (combat forces end)

---

# 5) Movement & Blocked Edges (“Mountains”)

## Basic Movement
- Click adjacent **discovered** tile → move there
- Cannot walk through fog (undiscovered)
- Cannot cross **blocked edges**

## Blocked Edges
- Tiles have 0–3 blocked edges
- Rotation during placement changes which edges are blocked
- You **cannot place** a tile if its blocked edge would prevent entering it from your current position

> Visual: cliffs / mountain ridges / impassable canyons in sci-fi skin.

---

# 6) Combat System (Local Threats)

## Local Threat tiers (unchanged numbers)
| Tile Tier | Threat HP | Prestige Reward |
|----------|-----------|-----------------|
| Tier 1 | 2 HP | +1 |
| Tier 2 | 4 HP | +2 |

## Hero Die (same as current)
| Face | Swords ⚔ | Skulls 💀 |
|------|----------|-----------|
| 1 | 3 | 0 |
| 2 | 2 | 0 |
| 3 | 1 | 0 |
| 4 | 1 | 1 |
| 5 | 0 | 1 |
| 6 | 0 | 2 |

## Combat Flow (same core)
1. Roll Hero Die
2. ⚔ reduces threat HP
3. 💀 reduces player HP
4. If threat HP ≤ 0 → Victory (gain Prestige, encounter removed)
5. If threat still alive → pushed back (rollback to previous tile)
6. **Combat ends turn immediately** (remaining slots burned)

> Flavor: local lifeforms / hazards / guardians.

---

# 7) Actions

## Gather (1 slot)
- Must be on discovered tile with **no active threat**
- Collect all resources on tile
- **Per-player cooldown**: once per round per tile

## Trade (1 slot)
- Only in Landing Hub (center)
- Exchange resources (implementation varies)

## Explore (1 slot)
- Enter tile placement mode
- Place new tile adjacent to any discovered tile
- Must be enterable from player position (blocked edges cannot deny entry)
- Reveals tile: resources + local threat spawn
- **Player does NOT move onto the new tile** (separate movement)

### Explore Prestige (optional, keep if you liked it)
- Explore Tier 2 tile: +1 Prestige
- Explore Final Tile: +2 Prestige

## Build (1 slot)
See **Base & Modules** below.

---

# 8) Gathering Rules

## Resource Collection
- Gather gives **all resources** on the tile
- Tier 1: 1 resource
- Tier 2: 2–3 resources

## Cooldown System
- Each player can gather a tile **once per round**
- Other players can gather same tile in same round (no denial)
- Cooldown tracked per-player per-tile

---

# 9) Base & Modules (Outpost & Districts, sci-fi skin)

## Base (previously Outpost)
Each player can build **exactly 1 Base**.

### Base Rules
- **Cost**: 2 🧱 Materials
- **Location**: Any discovered tile (NOT Landing Hub, NOT another player's Base)
- **Restriction**: Cannot build if another player is standing on the tile
- **Reward**: +2 Prestige
- **Effect**: Tile becomes your Base; gathering disabled on that tile

## Modules (previously Districts)
Modules can only be built **when standing in your own Base**.

**MVP rule (unchanged):** build any number of modules in **one Build action** (1 slot).  
(We can nerf later if it’s too strong; keep for now to not break your core.)

### Module List (same effects, sci-fi names)
| Module | Cost | Effect | Prestige |
|--------|------|--------|----------|
| **Assault Bay** (Warrior Lodge) | 2🧱 1⚙ | +1 ⚔ when roll has ⚔ | +1 |
| **Shield Array** (Shield Hall) | 2🧱 1⚙ | Ignore 1 💀 per combat | +1 |
| **Tactical Uplink** (Axe Hall) | 1🧱 2⚙ | 1 reroll per combat | +1 |
| **Supply Depot** (Storehouse) | 3🧱 | +1 resource on Gather | +1 |
| **Relic Vault** (Relic Hall) | 2🧱 2⚙ | Activates relic system (future) | +2 |
| **Beacon Spire** (Shrine) | 3🧱 3⚙ | Reserved for final content hooks | +3 |

---

# 10) Prestige (Victory Points)

## Prestige Sources (keep as-is for now)
| Action | Prestige |
|--------|----------|
| Kill Tier 1 threat | +1 |
| Kill Tier 2 threat | +2 |
| (Final Threat kill) | Special |
| Explore Tier 2 tile | +1 |
| Explore Final Tile | +2 |
| Build Base | +2 |
| Build Module | +1 to +3 (varies) |

> Note: we will playtest snowball later; for now keep this stable.

---

# 11) Final Phase (NEW, but fits the same core)

## Trigger
When the **Final Tile** is drawn and placed → Final Phase begins immediately.

## Final Threat
- Global threat appears (planetary guardian / cataclysm entity)
- **Shared HP = 40**
- HP does **not** regenerate
- Players attack it solo on their turns (no teams / no PvP)

## Countdown
- **6 rounds** after Final Tile reveal (recommended for testing)
- A “round” = all players complete their turns

## Win / Lose (Draft, test-ready)
- If Final Threat is defeated within the countdown:
  - **Winner = the player who deals the final blow**
- If countdown ends and Final Threat still lives:
  - **No winner** (mission fails)

> This removes the dominant strategy where the Prestige leader “waits to win by points”.
> You must engage the final threat to have any chance of victory.

---

# 12) Player Stats

## Starting Stats
- **HP**: 5 (max 5)
- **Resources**: 0 each
- **Prestige**: 0
- **Base**: none
- **Modules**: none

---

# 13) UI/HUD Requirements (same core, with Final additions)

## Must Display
- Current player (color-coded)
- Round number
- Slots remaining (0–2)
- HP
- Resources
- Prestige
- Event Log (last 10 events)
- Tile Deck remaining (T1: X, T2: Y, Final: 0/1)

## Action Buttons
- **GATHER** — enabled if can gather
- **TRADE** — enabled if at Landing Hub
- **EXPLORE** — placement mode
- **BUILD** — dynamic:
  - "🏠 BASE" if can build Base
  - "🏗 MODULES" if in own Base

## Tile Placement Mode
- Ghost hexes show valid positions
- Rotation indicator
- ROTATE button (60°)
- PLACE TILE button
- Preview: tier + blocked edges + resource icons

## Final Phase UI (new)
- Final Threat HP (0–40)
- Final rounds left (0–6)
- “Final Phase” banner state

---

# 14) Expected Game Length (same math, updated final)

## Tile Math
- 61 tiles in deck
- Expected exploration: 2–4 tiles per round (4 players)
- Final tile near the end due to tier ordering

**Target total length:** 20–30 rounds + Final Phase (up to 6 rounds).

---

# 15) Future Features (Backlog, unchanged categories)

### Phase 2
- More threat types (HP 1–6 range)
- Loot drops (weapons, spells, amulets)
- Relics system (Relic Vault)
- Balance pass for Build-many-in-one-action

### Phase 3
- Factions with simple passives (+1/-1)
- More Final Threat variants
- Events on Tier 2 tiles

### Phase 4
- Mobile-friendly controls
- Multiplayer (online)
- Save/load
- Replay

---

# 16) Implementation Notes (minimal rename only)

## Data Model Summary (keep structure; names updated)
```typescript
// Player
{
  id, position, hp, maxHp,
  biomass, materials, alloys,
  inventory: { weapons[], spells[], amulet },
  modules: ModuleType[],
  prestige: number,
  basePosition: HexCoord | null
}

// Tile
{
  coord, discovered, type, tier,
  resources: { biomass?, materials?, alloys? },
  blockedEdges: number[],
  rotation: number,
  encounterActive, enemyHp,
  cooldownUntilRoundByPlayer: Record<string, number>,
  ownerId, isFinalTile
}

// GameState
{
  board, players[], currentPlayerIndex,
  phase, round, actionSlotsRemaining,
  movedInCurrentSlot, actionUsedInCurrentSlot,
  tileDeck, pendingTileRotation,
  selectedPlacementPosition,
  eventLog[],
  isFinalPhase, finalRoundsLeft,
  finalThreatHp,
  gameOver, winnerId
}
