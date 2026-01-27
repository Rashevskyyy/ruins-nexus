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
- **Starting Sectors** - each player has their own home zone
- Rules remain readable and portable to a tabletop version

---

# 0.4) Game Modifiers (v0.5 - NEW)

## Core Concept
One **Game Modifier** is randomly selected at game start (or chosen in lobby).
Modifiers add variety and replayability without changing core rules.

---

## Available Modifiers

### ⚖️ Standard (none)
- Default game rules
- 3 Risky Tiles (2 T1 + 1 T2)
- 36 total Components

---

### 🎲 Asymmetric Start
Each player starts with a **different bonus**:

| Player | Bonus |
|--------|-------|
| P1 | +1 🧬 Biomass |
| P2 | +1 🧱 Materials |
| P3 | +1 ⚙ Alloys |
| P4 | +1 HP (6 max) |

**Effect:** Removes identical first turns, pushes toward different builds.

---

### ☣️ High Risk Planet
- **5 Risky Tiles** instead of 3 (3 T1 + 2 T2)
- Map is more dangerous
- Tank/heal builds become more valuable

---

### 💀 Extreme Risk (Hard Mode)
- **6 Risky Tiles** (4 T1 + 2 T2)
- Very dangerous planet!
- Not available in random selection

---

### 🧩 Scarce Components
- **~30 total Components** (×0.83 multiplier)
- Forces harder choices
- Specialization required

---

### 💎 Harsh Economy (Hard Mode)
- **~26 total Components** (×0.72 multiplier)
- Brutal scarcity!
- Not available in random selection

---

## Random Selection
When game starts, one of these modifiers is randomly picked:
- Asymmetric Start
- High Risk Planet
- Scarce Components

(Extreme/Harsh modes must be manually selected)

---

# 0.5) Game Setup (v0.5 - NEW)

## Board Layout

```
     [ S1 ]   [ Fog ]
  [ Fog ]  [ Hub ]  [ Fog ]
     [ S2 ]   [ S3 ]   [ Fog ]
           [ S4 ]
```

*(Example for 4 players)*

### Landing Hub (Center)
- Shared tile in the center
- Used for **trading** (future feature)
- No resources, no monsters

### Starting Sectors (Per Player)
Each player has **one Starting Sector** placed around the Hub:

- **Already discovered** (visible from start)
- **No monsters** (safe zone)
- **Contains 1 random resource** (🧬, 🧱, or ⚙)
- Players **start in their own sector**, not on Hub
- **NOT a Base** - players must still **build their Base** (costs 2🧱)
- **Randomized positions** - sectors are shuffled each game

### Board Layout
- **Only Hub + Player Sectors at start** (no pre-placed fog tiles)
- Fog tiles appear dynamically when players Explore
- Each player's sector is adjacent to the Hub

---

# 1) Races System (v0.5 - UPDATED)

## Core Concept
Each player selects a **Race** AND an **Option (A or B)** before the game starts.

- One race per player (no duplicates)
- Each race provides:
  - **1 passive ability** (always active)
  - **Choice between Option A or B** (selected at lobby)
- Options add a second unique ability
- No upgrades, no progression during game

> Race + Option = unique playstyle combination

---

## 1.1 Race Selection (Lobby)

- Race selection happens in the **Lobby**
- Each player chooses:
  - A specific race
  - **Option A or B** for that race
  - Or **Random** (picks both race and option randomly)
- Selected race + option is locked once the game starts
- Race icon + option visible to all players

---

## 1.2 Available Races (v0.5)

### 🧬 Bioform Collective
*Survivability, stability. Best for beginners.*

**Passive:** Ignore the **first 💀** in every combat.

| Option | Name | Effect |
|--------|------|--------|
| A | Hardened Shell | +1 max HP (start with 6 HP) |
| B | Regeneration | Heal +1 HP after each monster kill |

---

### 🔨 Forge Syndicate
*Economy, infrastructure. For crafting builds.*

**Passive:** First Base or Module build costs **−1 🧱**.

| Option | Name | Effect |
|--------|------|--------|
| A | Master Crafter | Craft costs 0 AP (once per turn) |
| B | Salvage Expert | +1 🧩 on first Tier 2+ monster kill |

---

### 🌀 Void Navigators
*Mobility, positioning. For exploration builds.*

**Passive:** 1 Move per turn **doesn't consume a slot**.

| Option | Name | Effect |
|--------|------|--------|
| A | Phase Step | After Explore, can Move for free |
| B | Warp Beacon | Recall to Base available **2 times per game** |

---

### ⚔️ Warbound Legion
*Aggression, momentum. For combat builds.*

**Passive:** If rolled at least **1 ⚔** → **+1 ⚔**.

| Option | Name | Effect |
|--------|------|--------|
| A | Monster Hunter | +1 ⚔ against Tier 3+ monsters |
| B | Battle Rush | After defeating monster, can Move for free |

---

### ⏳ Chrono Ascendants
*Control, intelligence. For anti-RNG builds.*

**Passive:** Once per turn, **reroll 1 die** (doesn't count as system reroll).

| Option | Name | Effect |
|--------|------|--------|
| A | Temporal Shield | First 💀 in combat becomes 0 |
| B | Safe Retreat | On pushback, **don't take damage** |

---

### 🏕️ Nomad Consortium
*Adaptation, flexibility. For exploration builds.*

**Passive:** First Gather each turn gives **+1 of any resource**.

| Option | Name | Effect |
|--------|------|--------|
| A | Hazard Resistant | Can Gather on Risky Tiles without penalty |
| B | Scout's Instinct | +1 🧩 on first entry to Tier 3+ tile |

---

## Race Design Rules
- No race modifies Prestige directly
- No race affects other players
- All effects are simple numeric modifiers (+1 / −1 / ignore once)
- Options expand build diversity without power creep

---

# 1.5) Turn System & Movement (v0.6 - CLARIFIED)

## Turn Structure (Karak 2 Rules)
Each player has **2 Action Slots** per turn.

**Each slot:**
1. Optional **Move** (must be BEFORE action)
2. Optional **Action** (Gather, Trade, Explore, Craft, etc.)

**Rules:**
- Move without Action = slot consumed (wasted opportunity)
- Action without Move = valid (stand and craft, etc.)
- Move AFTER Action = **forbidden** (except special abilities)

---

## Movement Types

### Voluntary Movement
- Standard walking to adjacent hex
- **Consumes slot** unless free move ability
- **Free Move sources:** Void Navigator passive, Phase Step, Battle Rush

### Forced Movement
- **Pushback:** After losing combat, return to previous tile (NO slot cost)
- **Auto-Move:** After Explore, automatically enter new tile (part of Explore action)
- **Teleport:** Orbital Hangar (1 AP, not movement)

**Important:** Forced movement does NOT consume slots or trigger Gravity Rift penalty.

---

## Gravity Rift (Special)
- Leaving a Rift tile **always consumes the slot**, even with free move abilities
- Does NOT affect forced movement (pushback)

---

## Heavy Cannon Penalty
- First voluntary move each turn **also consumes action slot**
- Effectively: -1 movement per turn
- Does NOT affect free moves or forced movement

---

## Prestige Pressure (v0.6 - CLARIFIED)

### At 12+ Prestige:
- Monsters gain **+1 effective Tier** against you
- Example: Tier 2 monster fights as Tier 3

### At 15+ Prestige:
- **ALL reroll sources blocked:**
  - ⏳ Chrono passive reroll
  - 📡 Tactical Scanner (Unit)
  - 🏠 TacticalUplink (Module)
  - 🎲 Reroll Module (Equipment)
  - ⚔ Heavy Striker (Weapon)
- **No exceptions!**

---

## Underdog Bonus (v0.6 - CLARIFIED)

**Effect:** +1🧩 on first Tier 3+ kill if you have the lowest prestige.

**Tie Resolution:**
- If multiple players tied for lowest prestige
- Player with **lower turn order** (P1 before P2, etc.) gets the bonus
- Only ONE player can claim it per game

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

# 5.5) Base & Modules (Buildings)

## Building a Base

Before building modules, players must **establish a Base**:

- **Cost:** 2🧱 Materials (Forge Syndicate: first build -1🧱)
- **Prestige:** +2 for building Base
- **Location:** Any discovered tile without monsters (not Hub, not another player's tile)
- **Limit:** 1 Base per player

## Base Modules

After building a Base, players can add **modules** for permanent bonuses.

## Module Building Rules
- Costs **1 AP** per module
- Can only build at your **own Base**
- Multiple modules can be built over time
- Effects are **permanent** once built

---

## Available Modules

### 🏠 AssaultBay
- **Cost:** 2🧱 1⚙
- **Effect:** +1 ⚔ in combat when you roll ≥1 ⚔
- **Prestige:** +1

### 🏠 ShieldArray
- **Cost:** 2🧱 1⚙
- **Effect:** Ignore 1 💀 per combat
- **Prestige:** +1

### 🏠 TacticalUplink
- **Cost:** 1🧱 2⚙
- **Effect:** 1 free reroll per combat (if 0 ⚔ rolled)
- **Prestige:** +1

### 🏠 SupplyDepot
- **Cost:** 3🧱
- **Effect:** +1 to each resource type when Gather
- **Prestige:** +1

### 🏠 OrbitalHangar
- **Cost:** 2🧱 2⚙ 1⭐ (Prestige cost!)
- **Effect:** 1 teleport per game (Base → safe tile)
- **Prestige:** +1

### 🏠 RelicVault (Future)
- **Cost:** 2🧱 2⚙
- **Effect:** Activates relic system
- **Prestige:** +2

### 🏠 BeaconSpire (Future)
- **Cost:** 3🧱 3⚙
- **Effect:** Reserved for final content
- **Prestige:** +3

---

# 6) Crafting System (v0.5 - NEW)

## Core Concept
Players craft **equipment items** using **Components (🧩)** and other resources.
Crafting can only be done **at your own Base**.

## Rules
- Crafting costs **1 AP** (one action slot)
- Must be at your own **Base** (build it first!)
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

## Final Tile Position

The **Final Tile** is shuffled **randomly within Tier 2 tiles**.
- After all 20 Tier 1 tiles are explored, Tier 2 begins
- Final Tile can appear **anytime** during Tier 2 exploration
- Creates unpredictable endgame timing (10 possible positions)

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

# 10) Component Economy Balance (v0.5)

## Total Components in Game

| Monster Tier | Count | 🧩 per Kill | Total 🧩 |
|-------------|-------|-------------|----------|
| Tier 1 | 12 | 0 | 0 |
| Tier 2 | 8 | 1 | 8 |
| Tier 3 | 6 | 2 | 12 |
| Tier 4 | 4 | 3 | 12 |
| Tier 6 (Final) | 1 | 4 | 4 |
| **TOTAL** | **31** | | **36🧩** |

## Per-Player Economy (4 players)

- **Average:** 9🧩 per player
- **Minimum viable build:** ~6🧩 (2 cheap weapons + 2 cheap modules)
- **Full optimal build:** ~18🧩 (impossible for one player)

## Design Intent

> **"You cannot craft everything. Choice is the core of the game."**

This scarcity creates:
- Meaningful decisions (what to craft?)
- Build diversity (not everyone has the same items)
- Competition for high-tier monsters (Tier 3+ give most components)

---

# 11) Effect Stacking Rules (v0.5)

## Priority Order

Effects apply in this order:
1. **Race Passive** (always active)
2. **Units** (permanent bonuses)
3. **Base Modules** (permanent bonuses)
4. **Crafted Equipment** (from inventory slots)
5. **Prestige Spend** (optional, costs resources)

## Stacking Rules

| Effect Type | Stacks? | Example |
|-------------|---------|---------|
| +⚔ Sword bonuses | ✅ YES | Blaster (+1) + Unit (+1) = +2 |
| -💀 Skull reduction | ✅ YES | Shield Bot (-1) + Race (-1) = -2 |
| Rerolls | ❌ NO | Only 1 reroll per combat (first available source) |
| Ignore first 💀 | ❌ NO | Multiple sources don't stack (still only 1 ignored) |

## Reroll Priority

If multiple reroll sources exist, only ONE is used per combat:
1. Tactical Scanner (Unit)
2. TacticalUplink (Module)
3. Reroll Module (Equipment)
4. Prestige Spend (1⭐)

---

# 12) Combat Rules (v0.5)

## Pushback Restriction

After being **pushed back** from a monster:
- ❌ **Cannot attack the same monster again this turn**
- ✅ **Can attack next turn** (or any future turn)

This prevents:
- Infinite retry loops
- Exploitation of reroll mechanics
- Turn monopolization

## Combat Attempt Limit

- **One combat attempt per tile per turn**
- Moving away and returning still counts as the same turn
- New turn = new attempt allowed

---

# 13) Build Archetypes (v0.5)

## Tank (Survivability)
Focus on damage reduction and stability.

**Core Items:**
- Shield Bot (Unit): -1💀
- ShieldArray (Module): Ignore 1💀
- Shield Matrix (Equipment): Ignore first 💀

**Best Race:** 🧬 Bioform Collective (ignore first 💀)

**Playstyle:** Safely farm any monster, rarely take damage.

---

## Glass Cannon (Burst Damage)
Maximize sword output, accept risk.

**Core Items:**
- Assault Drone (Unit): +1⚔
- AssaultBay (Module): +1⚔ when rolling ≥1
- Heavy Cannon (Equipment): +3⚔

**Best Race:** 🔥 Warbound Legion (+1⚔ bonus)

**Playstyle:** One-shot high-tier monsters, but vulnerable to skulls.

---

## Reroll Control (Consistency)
Minimize bad luck through rerolls.

**Core Items:**
- Tactical Scanner (Unit): 1 free reroll
- TacticalUplink (Module): 1 free reroll if 0⚔
- Reroll Module (Equipment): 1 free reroll

**Playstyle:** Reliable outcomes, good for risk-averse players.

---

## Economy Focus (Crafting)
Prioritize resource gathering and crafting.

**Core Items:**
- SupplyDepot (Module): +1 to each gather
- Build Base early
- Focus on Tier 2+ monsters for components

**Best Race:** 🧱 Forge Syndicate (-1🧱 first build)

**Playstyle:** Build infrastructure, craft late-game items.

---

# 14) Comeback Mechanics (v0.5)

## Existing Mechanics

1. **Reward Choice (Tier 3+):** Trailing players can choose Recover (+2 HP) instead of Prestige
2. **Recall to Base:** Free teleport during Orbital Phase
3. **Crafting:** Anyone can craft if they have components
4. **Prestige Pressure:** Leaders face harder monsters at 12+ Prestige

## Underdog Bonus (NEW)

The player with the **lowest Prestige** gets:
- **+1🧩 bonus** when defeating their **first Tier 3+ monster**
- Only triggers once per game
- Does not apply if tied for lowest

This helps trailing players catch up without punishing leaders.

---

# 15) Final Trial Clarification (v0.5)

## Prestige Spending in Final Trial

- Players **may** spend any amount of Prestige during Final Trial
- **1 Prestige = 1 Score point**
- Spending is **optional** (not mandatory)
- **Maximum spend:** No limit (spend all if desired)

## Strategic Consideration

Spending Prestige in Final Trial:
- ✅ Increases Trial Score → potential +5 Prestige bonus for winning
- ❌ Reduces total Prestige → might lose overall victory

**Risk/Reward:** If you're behind, spend big. If you're ahead, save.

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
- **NEW GAME SETUP:** Landing Hub in center, Starting Sectors around it
- **Starting Sectors:** Each player spawns in own sector with 1 resource (must still build Base)
- **Randomized Positions:** Player sectors are shuffled each game
- **Base Modules:** AssaultBay (+1⚔), ShieldArray (-1💀), TacticalUplink (reroll), SupplyDepot (+1 gather)
- **COMBAT OVERHAUL:** Single check system (totalSwords >= tier), no HP accumulation
- **Combat Retry Restriction:** Cannot attack same monster twice in one turn after pushback
- Added **Units System** (Assault, Shield, Tactical) - max 2 per player
- Added **Components (🧩)** as crafting resource (36 total in game)
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
- Added **Effect Stacking Rules** (clear priority order)
- Added **Build Archetypes** documentation (Tank, Glass Cannon, etc.)
- Added **Underdog Bonus** (+1🧩 for lowest prestige player on first Tier 3+ kill)
- Added **Game Modifiers** system (Asymmetric Start, High Risk, Scarce Components)
- Modifiers randomly selected at game start or chosen in lobby
- **RACES OVERHAUL:** Added 2 new races (Chrono Ascendants, Nomad Consortium)
- **RACES OVERHAUL:** Each race now has **Option A or B** choice
- Race selection now requires choosing both race and option in lobby

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

