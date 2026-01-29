# Cosmic Frontier — Документация новых систем v2.0

**Версия:** 2.0  
**Статус:** Готово к реализации  
**Дата:** Январь 2026

---

## Содержание

1. [Pre-Combat System](#1-pre-combat-system)
2. [Monster Behaviors](#2-monster-behaviors)
3. [Equipment System](#3-equipment-system)
4. [Base Modules Redesign](#4-base-modules-redesign)
5. [Implementation Priority](#5-implementation-priority)
6. [Balance Notes](#6-balance-notes)

---

## 1. Pre-Combat System

### 1.1. Концепция

Перед броском кубика игрок может потратить ресурсы для получения тактических преимуществ. Это добавляет контроль над рандомом и создаёт интересные решения: тратить сейчас или копить на крафт/здания.

### 1.2. Доступные опции

#### Компоненты (🧩)

| Трата | Эффект | Лимит |
|-------|--------|-------|
| 1🧩 | +1⚔ к этому броску | Без лимита |
| 2🧩 | Переброс кубика (если 0⚔) | 1 раз за бой |
| 3🧩 | -1💀 получаемого урона | Без лимита |

#### Престиж (⭐)

| Трата | Эффект | Лимит |
|-------|--------|-------|
| 1⭐ | +2⚔ к этому бою | 1 раз за бой |
| 2⭐ | Отменить ОТСТУПЛЕНИЕ (остаться на тайле, монстр жив) | 1 раз за бой |

#### Биомасса (🧬)

| Трата | Эффект | Лимит |
|-------|--------|-------|
| 2🧬 | +1 HP перед боем | 1 раз за бой |

### 1.3. Правила

1. **Timing:** Все траты объявляются ПЕРЕД броском кубика
2. **Stacking:** Бонусы ⚔ складываются, бонусы -💀 складываются
3. **Отмена отступления:** Игрок остаётся на тайле, монстр остаётся живым, можно атаковать повторно в следующий ход
4. **Престиж reroll НЕ добавляем:** Это слишком сильно, у нас уже есть reroll за 2🧩

### 1.4. UI Flow

```
┌─────────────────────────────────────────┐
│           PRE-COMBAT PHASE              │
├─────────────────────────────────────────┤
│  Monster: Tier 3 Guardian 🛡️            │
│  Required: 3⚔ to defeat                 │
├─────────────────────────────────────────┤
│  YOUR RESOURCES:                        │
│  🧩 5  ⭐ 3  🧬 4  ❤️ 4/5               │
├─────────────────────────────────────────┤
│  SPEND FOR BONUSES:                     │
│                                         │
│  [+] 1🧩 → +1⚔        Current: 0       │
│  [+] 3🧩 → -1💀       Current: 0       │
│  [ ] 2🧩 → Reroll if 0⚔                │
│  [ ] 1⭐ → +2⚔                          │
│  [ ] 2🧬 → +1 HP                        │
├─────────────────────────────────────────┤
│  COMBAT PREVIEW:                        │
│  Base: 0-3⚔  |  Bonuses: +0⚔  -0💀    │
├─────────────────────────────────────────┤
│       [CONFIRM]     [CANCEL]            │
└─────────────────────────────────────────┘
```

### 1.5. Синергии с расами

| Раса | Синергия |
|------|----------|
| **Warden** | Меньше нужно тратить на -💀, экономит 🧩 |
| **Smith** | Экономит 🧩 на крафте → больше на pre-combat |
| **Runner** | Может убежать и вернуться, меньше нужен "отмена отступления" |
| **Breaker** | +1⚔ пассивка делает траты ⚔ эффективнее |
| **Oracle** | Бесплатный reroll → не нужно тратить 2🧩 |
| **Seeker** | Больше ресурсов → больше 🧬 на emergency heal |

### 1.6. Баланс

**Экономика 🧩:**
- Tier 1 монстр даёт 0🧩, Tier 2 даёт 1🧩
- Тратить 1🧩 на +1⚔ против Tier 1 = невыгодно
- Тратить 3🧩 на +1⚔+1⚔+1⚔ против Tier 3 = выгодно (получишь 2🧩+2⭐)

**Экономика ⭐:**
- 1⭐ за +2⚔ — дорого, но гарантирует победу над слабым врагом
- 2⭐ за отмену отступления — страховка, не даёт авто-победу

---

## 2. Monster Behaviors

### 2.1. Концепция

Монстры больше не статичны. Разные типы требуют разных тактик, добавляя стратегическую глубину на уровне карты.

### 2.2. Типы монстров

#### Standard (Стандартный) — 60%

- **Иконка:** Нет (или базовая иконка монстра)
- **Поведение:** Обычный бой, ждёт на тайле
- **Награда:** Стандартная по тиру

#### Hunter (Охотник) 🐺 — 25%

- **Иконка:** 🐺
- **Поведение:** В конце раунда перемещается на 1 тайл к ближайшему игроку
- **Триггер боя:** Если входит на тайл с игроком → бой начинается автоматически в начале хода игрока
- **Награда:** Стандартная по тиру
- **Особенности:**
    - Не двигается если игрок на расстоянии > 3 тайлов
    - Не двигается через blocked edges
    - При равном расстоянии до нескольких игроков — идёт к игроку с меньшим Престижем

#### Guardian (Страж) 🛡️ — 15%

- **Иконка:** 🛡️
- **Поведение:** Блокирует проход через тайл, нельзя обойти
- **Особенности:**
    - Игрок ОБЯЗАН вступить в бой чтобы пройти
    - Blocked edges тайла игнорируются для прохода (страж блокирует всё)
    - При отступлении — игрок возвращается на предыдущий тайл
- **Награда:** ×1.5 (округление вверх)
    - Tier 1: +1⭐ → +2⭐
    - Tier 2: +1⭐+1🧩 → +2⭐+1🧩
    - Tier 3: +2⭐+2🧩 → +3⭐+3🧩
    - Tier 4: +3⭐+3🧩 → +5⭐+4🧩

### 2.3. Распределение по тирам

| Тир | Standard | Hunter | Guardian |
|-----|----------|--------|----------|
| 1 | 70% | 20% | 10% |
| 2 | 60% | 25% | 15% |
| 3 | 50% | 30% | 20% |
| 4 | 40% | 35% | 25% |

### 2.4. Генерация при исследовании

```typescript
function generateMonsterType(tier: number): MonsterType {
  const roll = Math.random() * 100;
  
  const guardianChance = 10 + (tier - 1) * 5; // 10%, 15%, 20%, 25%
  const hunterChance = 20 + (tier - 1) * 5;   // 20%, 25%, 30%, 35%
  
  if (roll < guardianChance) return 'guardian';
  if (roll < guardianChance + hunterChance) return 'hunter';
  return 'standard';
}
```

### 2.5. Hunter Movement Logic

```typescript
function moveHunters(gameState: GameState): void {
  const hunters = getAllMonsters(gameState).filter(m => m.type === 'hunter');
  
  for (const hunter of hunters) {
    const nearestPlayer = findNearestPlayer(hunter.position, gameState.players);
    const distance = hexDistance(hunter.position, nearestPlayer.position);
    
    if (distance <= 3 && distance > 0) {
      const nextTile = getNextTileTowards(hunter.position, nearestPlayer.position);
      
      if (canMoveTo(hunter, nextTile)) {
        hunter.position = nextTile;
        
        // Если пришёл на тайл с игроком — пометить для боя
        if (hasPlayerAt(nextTile)) {
          scheduleAutoCombat(nearestPlayer, hunter);
        }
      }
    }
  }
}
```

### 2.6. UI индикация

```
┌─────────────────────────────────────────┐
│  TILE: Sector 7 (Tier 2)                │
│  Resources: 🧬🧱                         │
├─────────────────────────────────────────┤
│  🐺 HUNTER                              │
│  Tier 2 — Requires 2⚔                   │
│  "Moves toward nearest player"          │
│                                         │
│  ⚠️ Will move at end of round!          │
└─────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────┐
│  TILE: Chokepoint (Tier 3)              │
│  Resources: 🧬⚙⚙                        │
├─────────────────────────────────────────┤
│  🛡️ GUARDIAN                            │
│  Tier 3 — Requires 3⚔                   │
│  "Blocks passage — must defeat"         │
│                                         │
│  💎 Reward: ×1.5 (+3⭐ +3🧩)            │
└─────────────────────────────────────────┘
```

### 2.7. Синергии с расами

| Раса | vs Hunter | vs Guardian |
|------|-----------|-------------|
| **Warden** | Neutral | Отлично — танкует бонусный урон |
| **Smith** | Neutral | Хорошо — крафтит оружие для гарантированной победы |
| **Runner** | Отлично — убегает | Плохо — не может обойти |
| **Breaker** | Отлично — охотники приходят сами | Хорошо — бонус к урону |
| **Oracle** | Хорошо — reroll для защиты | Neutral |
| **Seeker** | Neutral | Плохо — теряет мобильность |

---

## 3. Equipment System

### 3.1. Слоты снаряжения

| Слот | Количество | Назначение |
|------|------------|------------|
| Weapon | 2 | Атакующая сила |
| Spell/Module | 2 | Активные и пассивные способности |
| Amulet | 1 | Мощная пассивка |

### 3.2. Оружие (Weapons)

| Предмет | Стоимость | Эффект | Теги |
|---------|-----------|--------|------|
| **Blaster Core** | 2🧩+1⚙ | +1⚔ | Basic |
| **Plasma Edge** | 3🧩+1⚙ | +2⚔ если бросок ≥1⚔ | Conditional |
| **Heavy Cannon** | 4🧩+2⚙ | +3⚔, первое движение стоит слот | Penalty |
| **Shock Blade** | 2🧩+1⚙ | +1⚔, при победе враг не наносит 💀 | Defensive |
| **Arc Rifle** | 3🧩+2⚙ | +1⚔ за каждый пройденный тайл в этот ход (макс +3) | Mobility |
| **Void Launcher** | 4🧩+1⚙ | +2⚔, игнорирует Guardian block (можно пройти без боя) | Utility |

### 3.3. Спелы/Модули (Spells/Modules)

#### Пассивные (Passive)

| Предмет | Стоимость | Эффект |
|---------|-----------|--------|
| **Reroll Module** | 2🧩 | 1 переброс за бой (если 0⚔) |
| **Shield Matrix** | 2🧩+1🧱 | -1💀 за бой |
| **Threat Scanner** | 2🧩+1⚙ | Видеть тип монстра до исследования (1 тайл) |

#### Активные с кулдауном (1/раунд)

| Предмет | Стоимость | Эффект |
|---------|-----------|--------|
| **Phase Shift** | 3🧩+1⚙ | Телепорт на соседний тайл (игнорирует terrain и Guardian) |
| **Stasis Field** | 4🧩 | Отменить ВЕСЬ 💀 урон в этом бою |
| **Overcharge** | 3🧩+1⚙ | Удвоить ⚔ от оружия в этом бою |
| **Hunter's Mark** | 2🧩+1⚙ | Следующий Hunter на карте даёт ×2 награду |

#### Одноразовые (Consumable)

| Предмет | Стоимость | Эффект |
|---------|-----------|--------|
| **Overdrive** | 3🧩 | +3⚔ следующий бой, исчезает |
| **Emergency Repair** | 2🧩+1🧱 | Восстановить 3 HP мгновенно |
| **Escape Pod** | 3🧩+1⚙ | Телепорт на базу (не тратит recall) |

### 3.4. Амулеты (Amulets)

| Предмет | Стоимость | Эффект |
|---------|-----------|--------|
| **Core Relic** | 4🧩+2⭐ | +1⚔ и -1💀 |
| **Explorer's Charm** | 3🧩+1⭐ | Исследование не тратит слот (1/ход) |
| **Survivor's Mark** | 3🧩+1⭐ | При падении до 1 HP: +2 HP один раз за игру |
| **War Medal** | 4🧩+1⭐ | +1🧩 с каждого убитого монстра |
| **Void Pendant** | 5🧩+2⭐ | Возврат на базу не тратит использование |
| **Guardian's Crest** | 4🧩+2⭐ | ×2 награда с Guardian монстров |

### 3.5. Баланс снаряжения

**Ценность 🧩:**
- 1🧩 ≈ 0.5⚔ постоянного бонуса
- 2🧩 ≈ пассивная способность низкого тира

**Ценность ⭐ в крафте:**
- 1⭐ ≈ 2🧩 (амулеты дорогие, но мощные)

**Power Budget по слотам:**
- Weapon: +1 до +3⚔ (с условиями/штрафами для высоких значений)
- Spell: Utility или ситуационная сила
- Amulet: Определяющая билд способность

---

## 4. Base Modules Redesign

### 4.1. Новая система модулей

| Модуль | Стоимость | Эффект | Престиж | Стратегия |
|--------|-----------|--------|---------|-----------|
| **Assault Bay** | 2🧱+1⚙ | +1⚔ когда бросок содержит ≥2⚔ | +1 | Агрессивная |
| **Shield Array** | 2🧱+1⚙ | -1💀, при 0💀 в бою восстановить 1 HP | +1 | Танк |
| **War Room** | 1🧱+2⚙ | После победы: следующий бой в этом ходу +2⚔ | +1 | Chain kills |
| **Supply Depot** | 3🧱 | +1 ресурс при сборе, +3 storage | +1 | Экономика |
| **Relic Forge** | 2🧱+2⚙ | Крафт амулетов -1🧩, можно носить 2 амулета | +2 | Late game |
| **Beacon Spire** | 3🧱+2⚙ | Союзники могут телепортироваться на твою базу (1 AP) | +2 | Multiplayer |
| **Launch Pad** | 2🧱+2⚙+2⭐ | +3 к Финальному Испытанию | +1 | Final push |

### 4.2. Убранные/изменённые модули

| Старый | Причина | Замена |
|--------|---------|--------|
| Tactical Uplink | Дублирует Reroll Module | War Room |
| Relic Vault | Неясный эффект | Relic Forge |
| Orbital Hangar | Слабый для цены | Launch Pad |

### 4.3. Стратегические пути

```
AGGRO BUILD:
Assault Bay → War Room → Relic Forge (Core Relic)
Фокус: Chain kills, максимум ⚔

TANK BUILD:
Shield Array → Supply Depot → Relic Forge (Survivor's Mark)
Фокус: Выживаемость, экономия ресурсов

EXPLORER BUILD:
Supply Depot → Beacon Spire → Launch Pad
Фокус: Ресурсы, мобильность, финал

BALANCED BUILD:
Assault Bay → Shield Array → Launch Pad
Фокус: Универсальность
```

### 4.4. Синергии модулей с расами

| Раса | Лучшие модули | Синергия |
|------|---------------|----------|
| **Warden** | Shield Array | -1💀 + игнор первого 💀 = почти неуязвим |
| **Smith** | Relic Forge | -1🧱 пассивка + дешёвые амулеты |
| **Runner** | Beacon Spire | Мобильность для себя и союзников |
| **Breaker** | War Room | +1⚔ пассивка + chain bonus = snowball |
| **Oracle** | Assault Bay | Reroll + условный бонус = контроль |
| **Seeker** | Supply Depot | +1 сбор пассивка + +1 от депо = +2 за сбор |

---

## 5. Implementation Priority

### Phase 1: Pre-Combat System (1-2 дня)

**Задачи:**
1. UI компонент PreCombatPanel
2. Логика траты ресурсов перед боем
3. Интеграция с CombatSystem
4. Обновление AI ботов

**Файлы:**
- `src/systems/CombatSystem.ts` — добавить pre-combat phase
- `src/ui/PreCombatPanel.ts` — новый компонент
- `src/ai/BotDecisions.ts` — логика траты ресурсов для ботов

### Phase 2: Equipment System (2-3 дня)

**Задачи:**
1. Добавить новые предметы в CraftingData
2. Реализовать эффекты Spell (active abilities)
3. UI для активации спелов
4. Кулдауны и consumable логика

**Файлы:**
- `src/data/CraftingData.ts` — новые предметы
- `src/systems/CraftingSystem.ts` — логика активных способностей
- `src/entities/Item.ts` — cooldown, consumable flags

### Phase 3: Monster Behaviors (2-3 дня)

**Задачи:**
1. MonsterType enum (standard, hunter, guardian)
2. Генерация типа при исследовании
3. Hunter movement в конце раунда
4. Guardian block логика
5. UI индикация типов

**Файлы:**
- `src/entities/Monster.ts` — добавить type
- `src/systems/ExplorationSystem.ts` — генерация типа
- `src/systems/TurnSystem.ts` — hunter movement phase
- `src/board/Movement.ts` — guardian blocking

### Phase 4: Base Modules Redesign (1-2 дня)

**Задачи:**
1. Обновить ModuleData
2. Реализовать новые эффекты (War Room chain, Relic Forge double amulet)
3. Убрать старые модули
4. Обновить AI приоритеты

**Файлы:**
- `src/data/ModuleData.ts` — новые модули
- `src/systems/BuildingSystem.ts` — новые эффекты

### Phase 5: Balance & Polish (ongoing)

- Тестирование с ботами
- Настройка чисел
- UI polish

---

## 6. Balance Notes

### 6.1. Ресурсная экономика (на 20 раундов)

**Ожидаемый income:**
- 🧩: ~15-20 (с монстров)
- 🧱: ~10-15 (с тайлов)
- ⚙: ~8-12 (с тайлов)
- 🧬: ~8-12 (с тайлов)
- ⭐: ~10-15 (с монстров и целей)

**Ожидаемые траты:**
- База: 2🧱
- 2-3 модуля: 6-9🧱, 3-6⚙
- 2-3 оружия/спела: 6-10🧩, 2-4⚙
- 1 амулет: 3-5🧩, 1-2⭐
- Pre-combat: 3-6🧩, 0-2⭐

### 6.2. Combat Math

**Без бонусов (базовый кубик):**
- vs Tier 1 (need 1⚔): ~67% win
- vs Tier 2 (need 2⚔): ~50% win
- vs Tier 3 (need 3⚔): ~33% win
- vs Tier 4 (need 4⚔): ~17% win

**С +2⚔ от снаряжения:**
- vs Tier 1: ~100% win
- vs Tier 2: ~83% win
- vs Tier 3: ~67% win
- vs Tier 4: ~50% win

**С +2⚔ и pre-combat +1⚔:**
- vs Tier 3: ~83% win
- vs Tier 4: ~67% win

### 6.3. Ключевые балансные точки

1. **Pre-combat не должен давать auto-win** — максимум +3-4⚔ за разумные траты
2. **Guardians должны быть опасны** — игрок должен готовиться
3. **Hunters должны создавать pressure** — но не быть unfair
4. **Амулеты должны быть build-defining** — стоят дорого, но меняют playstyle

### 6.4. Тестовые сценарии для ботов

```typescript
// Сценарий 1: Aggressive vs Tank
// Ожидание: примерно равные результаты

// Сценарий 2: Explorer spam
// Ожидание: проигрывает в late game

// Сценарий 3: Pre-combat spam
// Ожидание: выигрывает early, проигрывает late (нет ресурсов на крафт)
```

---

## Appendix A: Quick Reference Cards

### Pre-Combat Options

```
🧩 COMPONENTS:
  1🧩 → +1⚔
  2🧩 → Reroll (if 0⚔)
  3🧩 → -1💀

⭐ PRESTIGE:
  1⭐ → +2⚔
  2⭐ → Cancel retreat

🧬 BIOMASS:
  2🧬 → +1 HP before combat
```

### Monster Types

```
STANDARD (60%): Normal combat
🐺 HUNTER (25%): Moves toward players, auto-combat
🛡️ GUARDIAN (15%): Blocks passage, ×1.5 reward
```

### Module Quick Build

```
AGGRO:   Assault Bay → War Room
TANK:    Shield Array → Supply Depot  
EXPLORE: Supply Depot → Beacon Spire
FINAL:   Any → Launch Pad
```

---

*Документ подготовлен для реализации. Версия 2.0*
