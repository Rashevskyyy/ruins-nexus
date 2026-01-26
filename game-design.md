# Cosmic Frontier — Game Design Document
## Version v0.5 (Components & Crafting)

> **Theme**: Humanoid alien races explore a newly discovered habitable planet.  
> They face environmental threats, local creatures, and strategic dilemmas while racing to complete the expedition.  
> **No PvP. All interaction is indirect.**

---

# 0) Design Goals (v0.5)

v0.5 focuses on **crafting economy and final phase resolution**.

Key pillars:
- No PvP, no stealing, no blocking opponents directly
- Meaningful player identity through **Races**
- Catch-up mechanics without punishment
- Risk vs reward through **dangerous terrain**
- Player agency through **reward choice**
- **Components** as universal crafting currency
- **Crafting system** at Base
- **Orbital Phase** with Final Trial victory condition
- Prestige as **spendable currency**
- Rules remain readable and portable to a tabletop version

---

# 1) Races System (New)

## Core Concept
Each player selects a **Race** before the game starts.

- One race per player (no duplicates)
- Each race provides **1 passive ability**
- Passives are always active
- No upgrades, no progression, no conditions

> Race = playstyle, not power creep

---

## 1.1 Race Selection (Lobby)

- Race selection happens in the **Lobby**
- Each player chooses:
  - A specific race
  - Or **Random**
- Selected race is locked once the game starts
- Race icon + short description visible to all players

---

## 1.2 Available Races (MVP Set)

### 🧬 Bioform Collective
*Survivability, stability*

- **Passive:** Ignore the **first 💀** in every combat.

---

### 🧱 Forge Syndicate
*Economy, infrastructure*

- **Passive:** The **first Build action** of the game costs **−1 🧱 Materials**.

---

### ⚙ Void Navigators
*Mobility, positioning*

- **Passive:** **Once per turn**, one Move **does not consume a slot**.

---

### 🔥 Warbound Legion
*Aggression, momentum*

- **Passive:** If you deal at least **1 ⚔** in combat, deal **+1 ⚔**.

---

## Race Design Rules
- No race modifies Prestige directly
- No race affects other players
- All effects are simple numeric modifiers (+1 / −1 / ignore once)

---

# 2) Combat System (v0.5 - OVERHAULED)

## Core Change
Combat is now a **single check**, not a damage accumulation system.

## Combat Flow
1. Roll dice (swords ⚔ and skulls 💀)
2. Add bonuses from equipment, units, and race passives
3. **Check:** `totalSwords >= monsterTier`
   - **Victory:** Monster defeated, collect rewards
   - **Pushback:** Return to previous tile, monster stays, no state change

## Player Damage
- Player **always takes skull damage** (even on victory)
- `damageToPlayer = rolledSkulls + extraSkulls - reducedSkulls`

## No HP Accumulation
- Monsters no longer track HP between attempts
- Each combat is a fresh check
- No "whittling down" monsters over multiple turns

---

# 2.1) Units System (v0.5 - NEW)

## Core Concept
Players can hire **combat units** at their Base to provide permanent bonuses.

## Limits
- Maximum **2 units** per player
- Units persist for the entire game

---

## Available Units

### 🤖 Assault Drone
- **Effect:** +1 ⚔ in every combat
- **Cost:** 2🧩 1⚙

### 🛡️ Shield Bot
- **Effect:** -1 💀 in every combat
- **Cost:** 2🧩 1🧱

### 📡 Tactical Scanner
- **Effect:** 1 free reroll per combat
- **Cost:** 3🧩 1⚙

---

## Hiring Units
- Can only hire at your **own Base**
- Hiring costs **1 AP**
- Units are added to combat calculations automatically

---

# 3) Prestige Pressure (Leader Limiter)

## Purpose
Prevent runaway leaders **without removing Prestige or punishing players**.

## Rule
Prestige thresholds apply **only to the player who reaches them**.

| Prestige | Effect |
|--------:|--------|
| 12+ | All monsters you fight require **+1 tier** to defeat |
| 15+ | You **cannot use rerolls** |

Notes:
- Prestige is never reduced
- Effects stack progressively
- Other players are unaffected

---

# 3) Risky Tiles (Environmental Danger)

## Concept
Some tiles are inherently dangerous even after monsters are cleared.

- These tiles introduce **permanent negative effects**
- Effects are visible **before placement**
- Entering or using these tiles is always a player choice

---

## Distribution
- **3 Risky Tiles** total in the 31-tile deck
  - 2 in Tier 1
  - 1 in Tier 2

---

## Available Risky Effects (MVP)

### ☣ Toxic Zone
- Every combat on this tile: **+1 💀**

### ⚡ Unstable Ground
- Every Gather action on this tile: **−1 HP**

### 🌪 Gravity Rift
- Leaving this tile always consumes a slot (even Move-only)

(Choose any 2–3 for v0.4 implementation.)

---

# 4) Monster Rewards — Player Choice (Tier 3+ Only)

## Core Change (v0.5 Update)
- **Tier 1-2**: Rewards are **automatic** (no dialog)
- **Tier 3+**: Player **chooses ONE reward**

---

## Reward Options (Tier 3+ Only)

After defeating a Tier 3+ monster, choose **one**:

1. 🎖 **Standard Reward**
  - Prestige + Components (as defined by monster tier)

2. ❤️ **Recover**
  - Heal **+2 HP**

3. ⭐ **Push Forward**
  - Gain **+1 additional Prestige**

---

## Restrictions
- Option ⭐ (extra Prestige) is **not available** if player Prestige ≥ 10
- Option ❤️ (heal) is unavailable if HP is already full

This system:
- **Early game** (Tier 1-2): Fast, no decisions needed
- **Mid-late game** (Tier 3+): Meaningful choices
- Gives agency
- Helps trailing players survive
- Slows snowballing naturally

---

# 5) Components & Monster Rewards (v0.5)

## Monster Tier = HP
| Tier | HP |
|------|----|
| Tier 1 | 1 |
| Tier 2 | 2 |
| Tier 3 | 3 |
| Tier 4 | 4 |
| Tier 6 | 6 (classification only) |

---

## Standard Rewards by Tier (v0.5 - Components)

| Monster Tier | Prestige | Components (🧩) | Reward Type |
|-------------|----------|----------------|-------------|
| Tier 1 | +1 | 0 | **AUTOMATIC** |
| Tier 2 | +1 | +1 | **AUTOMATIC** |
| Tier 3 | +2 | +2 | Choice |
| Tier 4 | +3 | +3 | Choice |
| Tier 6 | +5 | +4 | Choice |

**v0.5 Changes:**
- **Tier 1-2**: Rewards are applied automatically (no choice dialog)
- **Tier 3+**: Player chooses between Standard, Recover, or Push Forward
- No more direct item drops from monsters. Items are now obtained through **Crafting**.

All rewards are **deterministic**.

---

# 6) Crafting System (v0.5 - NEW)

## Core Concept
Players craft items using **Components (🧩)** and other resources.
Crafting can only be done **at your own Base**.

## Rules
- Crafting costs **1 AP** (one action slot)
- Must be at your own Base
- Components are earned from killing monsters (Tier 2+)

---

## Craft Recipes (MVP)

| Item | Type | Cost | Effect |
|------|------|------|--------|
| Blaster Core | Weapon | 2🧩 1⚙ | +1 ⚔ per combat |
| Plasma Edge | Weapon | 3🧩 1⚙ | +2 ⚔ if roll ≥1 ⚔ |
| Heavy Cannon | Weapon | 4🧩 2⚙ | +3 ⚔ per combat |
| Reroll Module | Module | 2🧩 | 1 free reroll per combat |
| Shield Matrix | Module | 2🧩 1🧱 | Ignore first 💀 per combat |
| Overdrive | Module | 3🧩 | +2 ⚔ next combat (one-time) |
| Core Relic | Amulet | 4🧩 2⭐ | +1 ⚔ and ignore 1 💀 per combat |

---

## Equipment Slots (v0.5 - SIMPLIFIED)

Each player has:
- **2 Weapon slots** - Filled by crafting weapons
- **2 Module slots** - Filled by crafting modules
- **1 Amulet slot** - Filled by crafting amulets

### Key Rules
- **No random drops** - All items are crafted at base
- **Empty slots show "CRAFT" hint** when player is at their base
- Slots are always unlocked (no prestige required to unlock)

---

# 7) Prestige as Currency (v0.5 - NEW)

## Core Change
Prestige can now be **spent** for special effects.
Prestige can never go below **0**.

---

## Prestige Spending Options

| Action | Cost | Effect |
|--------|------|--------|
| Reroll Dice | 1⭐ | Reroll combat dice once |
| Ignore Skull | 1⭐ | Ignore 1 💀 in combat |
| Core Relic | 2⭐ | Required for crafting Core Relic |
| Orbital Hangar | 1⭐ | Required for building Orbital Hangar |

---

# 8) Orbital Phase & Final Trial (v0.5 - NEW)

## Trigger
When the **Final Tile** is revealed, the game enters **Orbital Phase**.

---

## Orbital Phase (FINAL_PREPARATION)

Duration: **4 rounds**

### Allowed Actions
- Move
- Gather
- Build
- Craft

### Disabled Actions
- **Explore** (no new tiles can be placed)

### Special: Recall to Base
- Each player can **Recall to Base** once during Orbital Phase
- Teleports player directly to their Base
- **Free action** (does not cost AP)
- Only available if player has a Base

---

## Orbital Hangar (Optional Building)

**Cost:** 2🧱 2⚙ 1⭐ (Prestige cost!)

**Effect:**
- 1 teleport per game
- Only from your Base
- Only to a **safe, discovered tile** (no active encounter)
- Cannot teleport to Final Tile
- Costs 1 AP

---

## Final Trial (Victory Condition)

After Orbital Phase ends (4 rounds), **Final Trial** begins.

### Each Player Makes One Attempt

Trial Score = Sum of:
- Weapon bonuses
- Module bonuses
- Amulet bonuses
- Optional Prestige spend (1 Prestige = 1 Score)

### Victory Resolution

1. Player with **highest Final Trial score** gets **+5 Prestige**
2. Player with **highest total Prestige** wins
3. **Tie-breaker:** Higher Final Trial score

---

# 9) Final Phase (Legacy - v0.4)

> Note: The Final Threat system from v0.4 has been replaced by Final Trial in v0.5.

- Final Tile triggers **Final Threat** (legacy)
- Final Threat HP = **40**
- Countdown: **6 rounds**

(Kept for reference only. Not used in v0.5.)

---

---

# Why v0.5 Works

v0.5 adds:
- **Crafting economy** (Components as universal currency)
- **Player agency** (craft what you need, when you need it)
- **Clear endgame** (Orbital Phase → Final Trial)
- **Prestige decisions** (save vs spend)
- **Catch-up mechanics** (crafting lets anyone compete)

Without adding:
- PvP
- Complex rule exceptions
- Hidden randomness
- Heavy UI burden

---

# 10) Version History

## v0.5
- **COMBAT OVERHAUL:** Single check system (totalSwords >= tier), no HP accumulation
- Added **Units System** (Assault, Shield, Tactical) - max 2 per player
- Added **Components (🧩)** as crafting resource
- Added **Crafting System** (Base-only, 7 recipes)
- Added **Unit Hiring** at Base (costs 1 AP)
- Monster rewards now give **Components** instead of item tokens
- Tier 1-2 rewards are **automatic**, Tier 3+ have **choice**
- Added **Prestige spending** (reroll, ignore skull, crafting)
- Added **Orbital Phase** (FINAL_PREPARATION) with 4-round countdown
- Added **Recall to Base** during Orbital Phase
- Added **Orbital Hangar** building (teleport once per game)
- Added **Final Trial** victory condition
- Replaced Final Threat with Final Trial system
- Victory = highest Prestige, tie-breaker = Final Trial score

## v0.4
- Added Races and lobby selection
- Added Prestige Pressure
- Added Risky Tiles
- Added Reward Choice after combat

## v0.3
- Reduced deck (31 tiles)
- Deterministic monster tiers
- Deterministic rewards
- Final Threat + countdown

