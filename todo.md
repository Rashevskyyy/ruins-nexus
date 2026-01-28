# 🌟 Cosmic Frontier — Полный план улучшений
## От "работает" к "лучшая в своем жанре"

---

## 🎯 ФИЛОСОФИЯ УЛУЧШЕНИЙ

**Главная проблема сейчас:**
Игра функциональна, но **предсказуема**. Каждая партия похожа на предыдущую:
- Explore → Gather → Build Base → Craft → Orbital → Final Trial
- Мало драмы, мало историй, мало "wow-моментов"

**Цель улучшений:**
Сделать каждую партию **уникальной** с высокой реиграбельностью через:
1. ✨ **Emergent gameplay** (неожиданные ситуации)
2. 🎲 **Вариативность** (разные стратегии побеждают)
3. 🔥 **Драматические моменты** (напряжение, риск, награда)
4. 📖 **Memorable stories** (игроки помнят партии)

---

# ЧАСТЬ 1: КРИТИЧЕСКИЕ УЛУЧШЕНИЯ (обязательно)

## 🔥 1. СИСТЕМА СОБЫТИЙ (Event System)

### 1.1. Event Deck (колода событий)

**Структура:**
- 15-20 карт событий
- Тянутся **автоматически** на раундах 8, 12, 16, 20
- Каждое событие активно **1-2 раунда**
- Влияют на ВСЕ игроков (кооп-давление)

**Типы событий:**

#### A) ENVIRONMENTAL EVENTS (изменяют планету)
```
☄️ Meteor Shower
- Все открытые тайлы без игроков получают +1 💀 в бою этот раунд
- Награда: первый победить монстра → +2🧩

🌪️ Gravity Storm  
- Все Move стоят 1 слот (отменяют free move)
- Длится 2 раунда
- Компенсация: все Gather дают +1 ресурс

❄️ Cryo Freeze
- Нельзя Build и Craft этот раунд
- Все Combat дают +1🧩 Components
- Длится 1 раунд

🌋 Volcanic Eruption
- Случайные 3 тайла становятся Risky (Toxic Zone)
- Первый зайти на новый Risky тайл → +3 Prestige
```

#### B) COMPETITIVE EVENTS (гонка за награды)
```
🏆 Resource Rush
- Первый собрать 8 ресурсов СУММАРНО → +3 Prestige
- Второй → +1 Prestige

⚔️ Monster Bounty
- Следующие 2 убитых монстра Tier 3+ дают x2 награду
- Первый убить → дополнительно +2🧩

🏗️ Construction Race
- Первый построить модуль → -1 стоимость всех модулей навсегда
- Только для первого игрока, кто построит ПОСЛЕ события

🔬 Tech Breakthrough  
- Следующий крафт для ВСЕХ игроков: -1🧩 стоимость
- Но только 1 раз на игрока
```

#### C) CRISIS EVENTS (испытания)
```
👾 Monster Swarm
- Все нераскрытые тайлы получают +1 к Tier монстра
- Длится до конца игры
- Компенсация: все победы дают +1 Prestige

🛸 Orbital Debris
- Нельзя использовать Orbital Hangar 2 раунда
- Все Explore дают +1 случайный ресурс

⚠️ System Malfunction
- Все Equipment дают -1 к эффекту этот раунд
- Первый Heal → бесплатно

💀 Death Zone Expansion
- 2 случайных открытых тайла становятся Toxic Zone навсегда
- Игроки на них получают +2🧩 немедленно
```

### 1.2. Реализация в коде

**Новая сущность: `GameEvent`**
```typescript
interface GameEvent {
  id: string;
  name: string;
  description: string;
  type: 'environmental' | 'competitive' | 'crisis';
  duration: number; // раунды
  triggerRound: number;
  activeUntilRound: number;
  effects: {
    combatModifier?: number;
    moveCost?: number;
    gatherBonus?: number;
    // ... etc
  };
  rewards?: {
    condition: string;
    prestige?: number;
    components?: number;
  };
}
```

**Интеграция:**
- `GameState.activeEvents: GameEvent[]`
- Проверка условий перед каждым действием
- UI: показывать активные события в углу экрана
- Event Log: отдельная запись для событий (не удаляется)

**Баланс:**
- 60% Environmental (меняют правила)
- 25% Competitive (гонка)
- 15% Crisis (испытания)

---

## 🎲 2. VARIABLE SETUP (случайная раскладка)

### 2.1. Special Starting Sectors

**Вместо стандартного сектора (1 ресурс), иногда:**
```
🌟 RICH SECTOR (25% шанс)
- 2 ресурса ОДНОГО типа (🧬🧬 или 🧱🧱 или ⚙⚙)
- Нет монстра
- Сильный старт для экономики

⚔️ CONTESTED SECTOR (15% шанс)  
- 3 ресурса разных типов
- Tier 2 монстр (HP=2)
- Рискованный старт, но богатый

🔮 MYSTERY SECTOR (10% шанс)
- 1 случайный ресурс + 1🧩 Component
- Нет монстра
- Хороший старт для крафта
```

---

## 🏆 3. PUBLIC OBJECTIVES (общие цели)

### 3.1. Структура

**В каждой игре активны 3-4 Objectives:**
- Показываются с самого начала
- Первый выполнить → получает награду
- После выполнения цель закрывается

**Примеры Objectives:**

#### EARLY GAME (раунды 1-10)
```
🗺️ "Pioneer"
- Первый открыть 5 тайлов → +2 Prestige

💪 "First Blood"  
- Первый убить Tier 2+ монстра → +2🧩

🏗️ "Architect"
- Первый построить базу → +1⚙ навсегда каждый раунд
```

#### MID GAME (раунды 11-20)
```
⚙️ "Industrialist"
- Первый иметь 3 модуля → +3 Prestige

🎖️ "Veteran"
- Первый убить 3 монстра Tier 3+ → +3🧩

💰 "Tycoon"
- Первый собрать 15 ресурсов суммарно → +2 к каждому Gather
```

#### LATE GAME (раунды 20+)
```
🔬 "Tech Leader"
- Первый скрафтить 4 предмета → +4 Prestige

🌟 "Prestige Master"
- Первый достичь 12 Prestige → +1⚔ permanent

⭐ "Final Preparation"
- Первый иметь все 5 слотов Equipment → +2 к Final Trial
```

### 3.2. Реализация

```typescript
interface PublicObjective {
  id: string;
  name: string;
  description: string;
  phase: 'early' | 'mid' | 'late';
  condition: (player: Player, state: GameState) => boolean;
  reward: {
    prestige?: number;
    components?: number;
    permanent?: {
      gatherBonus?: number;
      combatBonus?: number;
    };
  };
  completed: boolean;
  completedBy?: string; // playerId
}
```

**UI:**
- Панель слева от карты с 3-4 активными целями
- Зеленая галочка когда кто-то выполнил
- Анимация при выполнении

---

## ⚔️ 4. УЛУЧШЕННАЯ БОЕВАЯ СИСТЕМА

### 4.1. Pre-Combat Preparation (подготовка к бою)

**ПРОБЛЕМА:** Бой = 1 бросок кубика → мало контроля

**РЕШЕНИЕ: Тактическая подготовка**

```
Перед броском кубика игрок может:

💎 SPEND COMPONENTS для бонусов:
- 1🧩 → +1⚔ к этому броску
- 2🧩 → reroll если 0⚔
- 3🧩 → ignore first 💀

⭐ SPEND PRESTIGE для эффектов:
- 1 Prestige → +1⚔ этот бой
- 2 Prestige → автоматическая победа против Tier 2
- 3 Prestige → автоматическая победа против Tier 3

❤️ EMERGENCY HEAL:
- Потратить 2🧬 прямо перед боем → +1 HP
```

**Баланс:**
- Делает бой более предсказуемым
- Добавляет тактическую глубину
- Создает дилемму: тратить сейчас или копить?

### 4.2. Combat Chains (цепочки боев)

**Новая механика: Momentum**

```
Если игрок убивает монстра И у него остался слот:
→ Может НЕМЕДЛЕННО атаковать соседний тайл с монстром
→ Получает CHAIN BONUS: +1⚔ за каждого убитого в цепочке

Пример:
1) Убил Tier 1 (обычно)
2) Атакует Tier 2 на соседнем тайле (+1⚔ chain)
3) Убил! Атакует Tier 3 (+2⚔ chain)
4) Цепочка обрывается или слот кончился

Награда за цепочку 3+:
→ +2 Prestige "Combat Master"
```

**Эффект:**
- Reward за агрессивную игру
- Драматические моменты ("я иду в рейд!")
- Риск: можно потерять много HP

### 4.3. Monster Behaviors (поведение монстров)

**Сейчас:** Монстры статичны

**Улучшение: Монстры РЕАГИРУЮТ**

```
НОВЫЕ ТИПЫ МОНСТРОВ (вместо просто Tier 1-4):

🐺 HUNTER (охотник)
- Если игрок на соседнем тайле в конце раунда
- → Монстр ПЕРЕМЕЩАЕТСЯ к игроку
- Бой начинается автоматически в начале следующего хода

🛡️ GUARDIAN (страж)
- Нельзя пройти мимо (blocked edges игнорируются)
- Но: дает x2 награду при убийстве

💤 DORMANT (спящий)
- Можно пройти без боя (1 раз)
- Если атаковать → Tier +1
- Экономия времени vs риск

⚡ VOLATILE (нестабильный)
- При смерти наносит 1💀 урон ВСЕМ игрокам на соседних тайлах
- Дает +3🧩 вместо обычной награды
```

**Распределение типов:**
- 50% обычные
- 20% Hunter
- 15% Guardian
- 10% Dormant
- 5% Volatile

---

## 🎪 5. ПЕРЕРАБОТАННЫЙ ФИНАЛ

[//]: # (### 5.1. Orbital Phase → "Final Rush" &#40;2 раунда вместо 4&#41;)

[//]: # ()
[//]: # (**ПРОБЛЕМА:** 4 раунда подготовки = скучно)

[//]: # ()
[//]: # (**РЕШЕНИЕ: Динамичная финальная фаза**)

[//]: # ()
[//]: # (```)

[//]: # (РАУНД 1 &#40;Final Tile найден&#41;:)

[//]: # (→ "SCRAMBLE PHASE")

[//]: # (- ВСЕ игроки делают ходы ОДНОВРЕМЕННО &#40;async&#41;)

[//]: # (- Каждый выбирает: готовиться ИЛИ мешать другим)

[//]: # (- Новая опция: SABOTAGE &#40;потратить 2⚙ → другой игрок -1 слот в следующем ходу&#41;)

[//]: # ()
[//]: # (РАУНД 2:)

[//]: # (→ "FINAL PREPARATION"  )

[//]: # (- Последний шанс Build/Craft)

[//]: # (- Recall to Base доступен)

[//]: # (- Все Trade: 2:1 вместо обычного &#40;лучше конверсия&#41;)

[//]: # (```)

### 5.2. Final Trial → "Gauntlet Challenge"

**ВМЕСТО:** Просто потратить Prestige

**НОВАЯ СИСТЕМА: Серия испытаний**

```
Каждый игрок проходит 3 ИСПЫТАНИЯ (в любом порядке):

1️⃣ COMBAT TRIAL
- Бой с Tier 5 монстром (HP=5)
- Можно использовать Equipment + Prestige
- Победа: +3 Score
- Поражение: +0 Score (но не умираешь)

2️⃣ RESOURCE TRIAL  
- Нужно собрать комбо: 3🧬 + 3🧱 + 3⚙
- Можно Trade/Gather/Use запасы
- Успех за 1 ход: +5 Score
- Успех за 2 хода: +3 Score
- Успех за 3 хода: +1 Score

[//]: # (3️⃣ NAVIGATION TRIAL)

[//]: # (- Добраться от базы до Final Tile за 3 хода)

[//]: # (- Blocked edges активны)

[//]: # (- Успех за 2 хода: +4 Score)

[//]: # (- Успех за 3 хода: +2 Score)

[//]: # (- Неудача: +0 Score)

ИТОГОВЫЙ SCORE:
= Trial Score + Equipment bonuses + (Prestige spent × 0.5)

Победитель получает +5 Prestige к итоговому счету
```

**Эффект:**
- Реальная кульминация (не калькуляция!)
- Можно выбрать порядок испытаний (стратегия)
- Напряжение до конца

### 5.3. Alternative: Boss Fight

**Если хочется более эпичный финал:**

```
FINAL BOSS: "Planet Guardian" (HP=20)

Механика:
- Все игроки атакуют босса ПО ОЧЕРЕДИ
- Каждая атака = обычный бросок кубика
- Boss наносит урон каждому атакующему (1d6 💀)
- Можно тратить Prestige: 2 Prestige → +1⚔ к атаке

Награды:
- Игрок с МАКСИМАЛЬНЫМ уроном боссу → +5 Prestige
- Игрок с KILLING BLOW → +3 Prestige  
- Все участники → +2 Prestige

Если босс НЕ убит за 5 раундов:
→ Планета взрывается, все проиграли (dramatic!)
```

---

[//]: # (# ЧАСТЬ 2: РЕИГРАБЕЛЬНОСТЬ &#40;модульные системы&#41;)

[//]: # ()
[//]: # (## 🎨 6. SCENARIO SYSTEM &#40;сценарии&#41;)

[//]: # (### 6.1. Разные режимы игры)

[//]: # ()
[//]: # (```)

[//]: # (📜 SCENARIOS &#40;выбор при старте&#41;:)

[//]: # ()
[//]: # (A&#41; STANDARD EXPLORATION)

[//]: # (- Текущие правила)

[//]: # (- Balanced, для новичков)

[//]: # ()
[//]: # (B&#41; HOSTILE PLANET  )

[//]: # (- x1.5 монстров на тайлах)

[//]: # (- Все Risky Tiles)

[//]: # (- Награды x1.5)

[//]: # (- Для хардкора)

[//]: # ()
[//]: # (C&#41; RESOURCE SCARCITY)

[//]: # (- Gather дает -1 ресурс &#40;минимум 1&#41;)

[//]: # (- Trade: 3:1 вместо 2:1)

[//]: # (- Components x0.5)

[//]: # (- Экономический челлендж)

[//]: # ()
[//]: # (D&#41; SPEED RUN)

[//]: # (- Колода: 10 T1 + 5 T2 + Final)

[//]: # (- Orbital Phase: 1 раунд)

[//]: # (- Быстрая партия &#40;30 минут&#41;)

[//]: # ()
[//]: # (E&#41; COOPERATIVE MODE)

[//]: # (- Нет индивидуальной победы)

[//]: # (- Общий Prestige pool)

[//]: # (- Final Boss с HP=40)

[//]: # (- Победа = все живы + босс убит)

[//]: # (```)

[//]: # (### 6.2. Scenario Modifiers &#40;стакающиеся модификаторы&#41;)

[//]: # ()
[//]: # (```)

[//]: # (Вместо выбора 1 modifier, игроки могут СТАКАТЬ:)

[//]: # ()
[//]: # (🌍 Planet Modifiers:)

[//]: # (- Volcanic &#40;больше 🧱&#41;)

[//]: # (- Frozen &#40;больше ⚙&#41;  )

[//]: # (- Jungle &#40;больше 🧬&#41;)

[//]: # (- Toxic &#40;больше Risky Tiles&#41;)

[//]: # ()
[//]: # (⏰ Time Modifiers:)

[//]: # (- Rush &#40;короткая колода&#41;)

[//]: # (- Marathon &#40;длинная колода&#41;)

[//]: # (- Blitz &#40;1 слот вместо 2&#41;)

[//]: # ()
[//]: # (💰 Economy Modifiers:)

[//]: # (- Abundance &#40;ресурсы x1.5&#41;)

[//]: # (- Scarcity &#40;ресурсы x0.7&#41;)

[//]: # (- Tech Focus &#40;Components x2&#41;)

[//]: # (```)

---

[//]: # (## 🧬 7. EXPANDED RACE SYSTEM)

[//]: # ()
[//]: # (### 7.1. Новые расы &#40;6 → 9&#41;)

[//]: # ()
[//]: # (```)

[//]: # (Добавить 3 новые расы:)

[//]: # ()
[//]: # (🤖 ENGINEER &#40;механик&#41;)

[//]: # (Пассив: Модули стоят -1 ресурс &#40;любой тип&#41;)

[//]: # (A: Первый модуль каждой игры бесплатный)

[//]: # (B: +1🧩 когда строишь модуль)

[//]: # ()
[//]: # (🌿 SYMBIOTE &#40;симбиот&#41;)

[//]: # (Пассив: Heal бесплатный &#40;не тратит слот&#41;)

[//]: # (A: Max HP = 7 вместо 6)

[//]: # (B: Можно Heal других игроков &#40;на соседнем тайле&#41;)

[//]: # ()
[//]: # (⚡ QUANTUM &#40;квант&#41;)

[//]: # (Пассив: 1 раз за раунд можно "отменить" Move)

[//]: # (A: Orbital Hangar: 2 использования вместо 1)

[//]: # (B: Recall to Base: бесплатно &#40;не тратит слот&#41;)

[//]: # (```)

[//]: # (### 7.2. Race Synergies &#40;синергии рас&#41;)

[//]: # ()
[//]: # (**Если в игре определенная комбинация рас:**)

[//]: # ()
[//]: # (```)

[//]: # (🧬 Warden + 🌿 Symbiote = "Medical Team")

[//]: # (→ Все Heal +1 HP для обоих)

[//]: # ()
[//]: # (🔨 Smith + 🤖 Engineer = "Industrial Complex"  )

[//]: # (→ Все Build/Craft: -1 стоимость для обоих)

[//]: # ()
[//]: # (⚔️ Warbound + ⏳ Oracle = "Strike Team")

[//]: # (→ Бой вдвоем на одном тайле: +2⚔ суммарно)

[//]: # ()
[//]: # (🌀 Runner + ⚡ Quantum = "Teleport Squad")

[//]: # (→ Могут меняться местами 1 раз за раунд)

[//]: # (```)

[//]: # ()
[//]: # (**Эффект:**)

[//]: # (- Кооперация выгодна)

[//]: # (- Composition matters &#40;как в MOBA&#41;)

[//]: # (- Больше реиграбельности)

[//]: # ()
[//]: # (---)

## 🎁 8. LOOT & DISCOVERIES (находки)

### 8.1. Discovery Tokens (токены находок)

**На случайных тайлах (15% шанс при Explore):**

```
🎁 DISCOVERY TOKEN появляется после убийства монстра

Типы находок:

💎 ARTIFACT (10% шанс)
- Permanent bonus (случайный):
  • +1 Max HP
  • +1⚔ permanent
  • +1 к всем Gather
  • Ignore 1 💀 permanent

🗺️ MAP FRAGMENT (30% шанс)
- Показывает следующий тайл перед Explore
- Можно выбрать: взять ИЛИ пропустить
- +1 Components

📦 SUPPLY CACHE (40% шанс)  
- 2 случайных ресурса + 1🧩

⚡ POWER SURGE (20% шанс)
- Следующий ход: 3 слота вместо 2
- Длится 1 раунд
```

### 8.2. Mystery Tiles

**Новый тип тайла в колоде (3-4 шт):**

```
❓ MYSTERY TILE

Вместо монстра:
→ Игрок делает выбор из 3 опций:

A) RISK
- Бросить кубик
- 1-2⚔: +3🧩
- 3-4⚔: +2 Prestige + 2🧩
- 5-6⚔: +4 Prestige + 3🧩
- 💀: -2 HP (любое кол-во)

B) SAFE
- Получить 2 случайных ресурса
- +1🧩
- Без риска

C) EXPLORE FURTHER
- Поставить еще 1 тайл из колоды бесплатно
- Расходует слот
```

---

## 🏛️ 9. LEGACY SYSTEM (наследие между партиями)

### 9.1. Achievement System

```
ДОСТИЖЕНИЯ (разблокируются навсегда):

🏆 COMBAT ACHIEVEMENTS:
- "Berserker": Убить 5 монстров за 1 партию
- "Giant Slayer": Убить Tier 4 за 1 ход
- "Untouchable": Закончить игру с Full HP

🏗️ BUILDER ACHIEVEMENTS:
- "Architect": Построить 5 модулей за игру
- "Industrialist": Иметь Supply Depot + Assault Bay
- "City Builder": Построить базу на раунде 5 или раньше

⭐ PRESTIGE ACHIEVEMENTS:
- "Rising Star": Достичь 15 Prestige
- "Comeback": Победить с lowest Prestige на раунде 20
- "Dominator": Закончить с Prestige >20

🎯 SPECIAL:
- "Speedrunner": Победить за <25 раундов
- "Pacifist": Победить убив <5 монстров
- "Treasure Hunter": Найти 5 Discovery Tokens за игру
```

### 9.2. Unlockable Content

**За достижения разблокируются:**

```
НОВЫЕ ОПЦИИ РАС (3-я опция "C"):

🧬 Warden C: "Regeneration" (нужно: 5 побед Warden)
→ +1 HP каждый раунд автоматически

🔨 Smith C: "Master Craftsman" (нужно: скрафтить 20 предметов)
→ Крафт не расходует слот

⚔️ Warbound C: "Battle Frenzy" (нужно: убить 50 монстров)  
→ Combat Chain bonus x2

И так далее для всех рас...
```

**НОВЫЕ МОДЫ:**

```
🎨 COSMETIC UNLOCKS:
- Цвета персонажей
- Иконки
- Tile skins
- UI themes

🎲 GAMEPLAY UNLOCKS:
- Новые сценарии
- Новые Event cards
- Secret races (после 50 игр)
```

---

# ЧАСТЬ 3: ПОЛИРОВКА И КАЧЕСТВО ЖИЗНИ

## 🎮 10. УЛУЧШЕНИЯ UI/UX

### 10.1. Better Information Display

```
НОВЫЕ UI ЭЛЕМЕНТЫ:

📊 PROBABILITY CALCULATOR
- Показывать шанс победы ПЕРЕД боем
- "68% to win" с breakdown:
  • Base: 50%
  • Equipment: +15%
  • Modifiers: +3%

📈 PRESTIGE TRACKER
- График Prestige по раундам
- Показывать разрыв с лидером
- "You're 3 Prestige behind P2"

🗺️ TILE PREVIEW
- Hover на соседней клетке → показать что МОЖЕТ быть
- "Tier 2 monster (50%), Tier 3 (30%), Empty (20%)"

⚡ ACTION SUGGESTIONS
- "Recommended: Build Base now (you have resources)"
- "Consider: Craft weapon before attacking Tier 3"
```

### 10.2. Tutorial & Hints

```
УМНЫЕ ПОДСКАЗКИ (контекстные):

Раунд 1-3:
→ "Try to explore 2-3 tiles early for resources"

Первый бой:
→ "Tip: Reroll is available if you roll 0 swords"

Перед базой:
→ "Building a base unlocks crafting and modules"

Перед Orbital:
→ "Final phase begins soon. Prepare equipment!"

И так далее...

+ Возможность ОТКЛЮЧИТЬ в настройках
```

### 10.3. Animation & Juice

```
ДОБАВИТЬ АНИМАЦИИ:

✨ Particle effects:
- Искры при крафте
- Explosion при убийстве монстра
- Glow при получении Prestige

🎬 Transitions:
- Smooth camera zoom при Explore
- Tile flip animation
- Combat dice roll (уже есть, улучшить)

🔊 Sound effects:
- Success chime (действие выполнено)
- Warning sound (нельзя сделать)
- Epic music для Final Trial
```

---

## 🔧 11. BALANCE TWEAKS (тонкая настройка)

### 11.1. Race Balance

```
ТЕКУЩИЕ ПРОБЛЕМЫ:

❌ Warbound слишком силен
Фикс: Пассив +1⚔ → работает только против Tier 2+

❌ Smith слишком слаб  
Фикс: Option B теперь +1🧩 за ЛЮБУЮ постройку (Base/Module)

❌ Void слишком силен с Option A
Фикс: Бесплатный Move после Explore → только если на новом тайле НЕТ монстра

❌ Oracle reroll слишком слаб
Фикс: Reroll работает при ANY неудачном броске (не только 0⚔)

❌ Nomad слишком силен рано
Фикс: +1 Gather работает только на Starting Sector и Resource tiles
```

### 11.2. Economy Balance

```
ИЗМЕНЕНИЯ СТОИМОСТИ:

Крафт:
- Blaster Core: 2🧩 1⚙ → 1🧩 1⚙
- Heavy Cannon: 4🧩 2⚙ → 3🧩 2⚙

Модули:
- Supply Depot: 3🧱 → 2🧱 1⚙
- Assault Bay: 2🧱 1⚙ → 1🧱 2⚙
- Orbital Hangar: ДЕЙСТВИТЕЛЬНО списывать Prestige cost (в коде есть, но не работает)

Юниты:
- Все юниты: -1🧩 стоимость
- Max units: 2 → 3
```

### 11.3. Combat Balance

```
ИЗМЕНЕНИЯ БОЕВКИ:

Prestige Pressure:
- ≥12 Prestige → +1 Tier: УБРАТЬ
- ВМЕСТО: ≥15 Prestige → +1 Tier
- ≥15 Prestige → No reroll: ОСТАВИТЬ

Rewards:
- Tier 1: +1 Prestige → +1 Prestige + 1 любой ресурс
- Tier 2: +1 Prestige +1🧩 → +1 Prestige +2🧩
- Tier 3: стандартные опции + новая:
  • 🔥 "Risk It": Roll dice, if ≥3⚔ → +5🧩, else → nothing

Pushback:
- Добавить: "Soft landing" — если откинут на Starting Sector → no damage
```

---

## 📱 12. MOBILE & ACCESSIBILITY

### 12.1. Mobile Optimization

```
АДАПТАЦИЯ ПОД МОБИЛУ:

🖱️ Touch Controls:
- Tap = select
- Long press = context menu
- Swipe = pan camera
- Pinch = zoom

📱 UI Adjustments:
- Кнопки крупнее (48x48 минимум)
- Шрифты читаемые на маленьком экране
- Портретная ориентация (vertical UI)

⚡ Performance:
- Ограничить частицы на слабых устройствах
- Lazy load тайлов (не рендерить off-screen)
```

### 12.2. Accessibility

```
ДОСТУПНОСТЬ:

♿ Options:
- Colorblind mode (alternative colors)
- Dyslexia-friendly font (OpenDyslexic)
- Text size adjustment
- High contrast mode

🔊 Audio:
- Mute option (music/sfx отдельно)
- Screen reader support (ARIA labels)

⌨️ Keyboard:
- Полная поддержка клавиатуры
- Hotkeys (E=Explore, M=Move, G=Gather, etc)
```

---

# ЧАСТЬ 4: МУЛЬТИПЛЕЕР И СОЦИАЛ

## 👥 13. MULTIPLAYER IMPROVEMENTS

### 13.1. Async Mode

```
ASYNC MULTIPLAYER (играть в своем темпе):

📧 Turn-based Email/Notification:
- Делаешь ход → другие получают уведомление
- Можно играть партию несколько дней
- Сохранение хода на сервере

⏰ Time limits per turn:
- Configurable: 1 min / 5 min / 1 hour / 1 day
- Auto-skip if timeout
```

### 13.2. Spectator Mode

```
РЕЖИМ НАБЛЮДАТЕЛЯ:

👀 Features:
- Можно зайти в активную игру как зритель
- Видно все (no fog of war)
- Chat для зрителей
- Нельзя влиять на игру

🎥 Replay System:
- Сохранять партии
- Просмотр с любого момента
- Slow motion / fast forward
```

### 13.3. Matchmaking

```
АВТОМАТИЧЕСКИЙ ПОДБОР:

🎯 Ranked Mode:
- ELO/MMR система
- Ранги: Bronze → Diamond
- Сезоны (1 месяц)

🎲 Quick Play:
- Автоматический подбор по 4 игрокам
- Random races / modifiers
- Casual fun

🏆 Tournaments:
- Weekly tournaments
- Best of 3
- Призы (cosmetics)
```

---

## 💬 14. SOCIAL FEATURES

### 14.1. In-Game Chat

```
ЧАТ:

💬 Chat channels:
- All players (lobby)
- Team chat (если команды)
- Whisper (private)

🎭 Emotes:
- Quick reactions: 👍 ❤️ 😂 😮
- Race-specific emotes
- Unlockable через achievements

📊 Post-Game Stats:
- Detailed breakdown
- MVP awards ("Most Combat", "Builder", etc)
- Share results
```

### 14.2. Friends & Parties

```
ДРУЗЬЯ:

👥 Friend List:
- Добавить в друзья
- Инвайт в приватные игры
- Статус (online/in-game/offline)

🎉 Party System:
- Создать группу до игры
- Играть вместе в Quick Play
- Voice chat (optional, WebRTC)
```

---

# ЧАСТЬ 5: МОНЕТИЗАЦИЯ И LONG-TERM

## 💰 15. MONETIZATION (если нужно)

### 15.1. Free-to-Play Model

```
БЕСПЛАТНАЯ ВЕРСИЯ:
✅ Все расы
✅ Все моды
✅ Multiplayer
✅ 2 игры в день

PREMIUM ($5/month или $30/year):
⭐ Unlimited games
⭐ Cosmetics
⭐ Exclusive scenarios
⭐ Early access to new content
⭐ Stats tracking & replays
```

### 15.2. Cosmetics Shop

```
КОСМЕТИКА (НЕ PAY-TO-WIN):

🎨 Character skins
🗺️ Tile themes (sci-fi/fantasy/cyberpunk)
🎵 Music packs
🎭 Emotes & avatars
🏆 Frames & badges
```

---

## 🚀 16. CONTENT ROADMAP

### 16.1. Post-Launch Updates

```
ПЛАН ОБНОВЛЕНИЙ:

📅 Month 1: Polish
- Bug fixes
- Balance tweaks
- QoL improvements

📅 Month 2: Events Update
- 10 новых Event cards
- 2 новых сценария
- Seasonal events

📅 Month 3: Races Expansion
- 3 новые расы
- Race rebalance
- New race synergies

📅 Month 4: Combat Update  
- Monster behaviors
- Combat chains
- New equipment

📅 Month 5: Social Update
- Tournaments
- Guilds/Clans
- Leaderboards

📅 Month 6: Big Expansion
- New planet type
- New final boss
- Campaign mode
```

---

# 📊 ПРИОРИТИЗАЦИЯ ВСЕХ ФИЧ

## 🔥 MUST HAVE (перед релизом)

1. ✅ **Event System** (драма, реиграбельность) — 1-2 недели
2. ✅ **Quick Wins** (ускорить игру, улучшить Trade) — 3 дня
3. ✅ **Улучшенный финал** (Gauntlet или Boss) — 1 неделя
4. ✅ **Public Objectives** (3-4 цели) — 3 дня
5. ✅ **Pre-Combat Preparation** (тратить Components/Prestige) — 2 дня
6. ✅ **Balance Tweaks** (расы, экономика) — 2 дня
7. ✅ **UI improvements** (probability, hints) — 1 неделя

**Итого: 4-5 недель до релиза**

---

## 🎯 SHOULD HAVE (для полноты)

8. ⭐ **Discovery Tokens** (находки) — 3 дня
9. ⭐ **Combat Chains** (momentum) — 2 дня
10. ⭐ **Variable Setup** (разные старты) — 2 дня
11. ⭐ **Monster Behaviors** (4 типа) — 1 неделя
12. ⭐ **Achievement System** — 3 дня
13. ⭐ **Scenario System** (5 режимов) — 1 неделя

**Итого: +3 недели после релиза**

---

## 💎 NICE TO HAVE (расширения)

14. 🌟 **3 новые расы** — 1 неделя
15. 🌟 **Race Synergies** — 2 дня
16. 🌟 **Legacy/Unlockables** — 1 неделя
17. 🌟 **Async mode** — 2 недели
18. 🌟 **Matchmaking** — 2 недели
19. 🌟 **Mobile optimization** — 2 недели

---

# 🎯 ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ

## Что делать ПРЯМО СЕЙЧАС (порядок):

### ✅ PHASE 1: Critical Fixes (1 неделя)
```
День 1-2:
- Starting Sector: 2 ресурса
- Tier 1 колода: 15 тайлов
- Trade: добавить 3🧬→2⚙
- Orbital Phase: 2 раунда

День 3-5:
- Rebalance рас (Warbound nerf, Smith buff)
- Economy tweaks (cheaper craft)
- Combat balance (Prestige Pressure на 15)

День 6-7:
- Тесты, багфиксы
```

### ✅ PHASE 2: Core Content (2 недели)
```
Неделя 1:
- Event System (10-12 карт событий)
- Интеграция в игровой цикл
- UI для событий

Неделя 2:
- Public Objectives (8-10 целей)
- Pre-Combat Preparation
- Улучшенный финал (Gauntlet)
```

### ✅ PHASE 3: Polish (1 неделя)
```
- UI improvements (probability, hints)
- Animations & juice
- Tutorial system
- Playtesting & balance
```

---

## 🎉 РЕЗУЛЬТАТ

После этих улучшений у вас будет:

✨ **Engaging** — каждый ход интересен
🎲 **Replayable** — события + цели делают партии уникальными
🔥 **Dramatic** — напряжение от начала до финала
⚖️ **Balanced** — все расы конкурентны
🏆 **Complete** — готово к релизу и росту

---

**Общее время до "идеальной версии": 8-10 недель**

Но уже через **4-5 недель** у вас будет ОЧЕНЬ ХОРОШАЯ игра, готовая к релизу!

Хотите начать с какой-то конкретной части? Или нужно что-то уточнить?