# Ruins Nexus — Система тестирования и отладки

Полная документация по инструментам тестирования, логирования и отладки.

---

## Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Unit тесты (Vitest)](#unit-тесты-vitest)
3. [Bot тестирование](#bot-тестирование)
4. [Система логирования](#система-логирования)
5. [Debug Panel в игре](#debug-panel-в-игре)
6. [State Validator](#state-validator)
7. [Покрытие кода](#покрытие-кода)
8. [Примеры отладки](#примеры-отладки)

---

## Быстрый старт

```bash
# Запустить все тесты
npm run test

# Запустить бота для симуляции игры
npm run test:bot

# Запустить batch тест (20 игр со статистикой)
npm run test:bot batch 20

# Посмотреть покрытие кода
npm run test:coverage
```

---

## Unit тесты (Vitest)

### Команды

| Команда | Описание |
|---------|----------|
| `npm run test` | Запустить все тесты один раз |
| `npm run test:watch` | Запустить в watch режиме (перезапуск при изменениях) |
| `npm run test:ui` | Открыть UI интерфейс для тестов |
| `npm run test:coverage` | Запустить тесты с отчётом о покрытии |

### Структура тестов

```
tests/
├── core/                    # Тесты ядра игры
│   ├── Hex.test.ts         # Hex координаты и утилиты
│   ├── GameState.test.ts   # Создание начального состояния
│   ├── Combat.test.ts      # Боевая система
│   └── StateValidator.test.ts # Валидация состояния
├── board/                   # Тесты доски
│   ├── Board.test.ts       # Игровая доска
│   ├── TileDeck.test.ts    # Колода тайлов
│   └── BlockedEdges.test.ts # Блокировка путей (горы)
├── entities/                # Тесты сущностей
│   ├── Unit.test.ts        # Юниты
│   └── Race.test.ts        # Расы
├── systems/                 # Тесты игровых систем
│   ├── CraftingSystem.test.ts    # Крафт
│   ├── DiceResolver.test.ts      # Кубики
│   ├── ExplorationSystem.test.ts # Исследование
│   └── SettlementSystem.test.ts  # Поселения и торговля
├── integration/             # Интеграционные тесты
│   ├── Game.test.ts        # Полная игра
│   └── BotGame.test.ts     # Игры ботов
└── bot-runner.ts           # CLI для запуска ботов
```

### Написание тестов

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { Game } from "../../src/core/Game";
import { createInitialState } from "../../src/core/GameState";

describe("Game", () => {
    let game: Game;

    beforeEach(() => {
        const state = createInitialState(2); // 2 игрока
        game = new Game(state);
    });

    it("should initialize with correct player count", () => {
        expect(game.state.players).toHaveLength(2);
    });

    it("should start in EXPLORATION phase", () => {
        expect(game.state.phase).toBe("EXPLORATION");
    });
});
```

---

## Bot тестирование

### Команды

| Команда | Описание |
|---------|----------|
| `npm run test:bot` | Одна игра с полными логами |
| `npm run test:bot batch 50` | 50 игр со статистикой |
| `npm run test:bot stress` | Stress test (разные конфигурации) |
| `npm run test:bot help` | Показать справку |

### Batch результаты

```
======================================================================
📊 BATCH TEST RESULTS
======================================================================

📈 OVERVIEW:
  Total Games:     50
  Completed:       45 (90.0%)        ← % успешно завершённых игр
  Timed Out:       5                 ← Игры где бот застрял
  Errored:         0                 ← Игры с ошибками

⏱️ PERFORMANCE:
  Avg Duration:    8ms per game      ← Скорость симуляции
  Avg Turns:       42.3              ← Средняя длительность
  Turn Range:      28 - 65           ← Разброс

🎯 GAME PROGRESS:
  Final Trial Rate: 95.0%            ← Дошли до финала
  Avg Tiles:        18.5             ← Исследовано тайлов
  Combat Win Rate:  65.2%            ← Победы в боях

🏆 WIN DISTRIBUTION:
  P1: 24 wins (53.3%)                ← Баланс между игроками
  P2: 21 wins (46.7%)

🔍 VALIDATION:
  State Failures:  2                 ← Ошибки валидации (баги!)

⚠️ COMMON ERRORS:                    ← Частые проблемы
  [2x] Tile at 4,-4: Invalid monster tier 5

======================================================================
✅ HEALTHY: Game systems working correctly
======================================================================
```

### Уровни сложности бота

```typescript
type BotDifficulty = "random" | "easy" | "normal" | "aggressive";
```

- **random** — случайные действия
- **easy** — базовые эвристики
- **normal** — сбалансированная игра
- **aggressive** — приоритет на бой и риск

### Stress test конфигурации

```bash
npm run test:bot stress
```

Тестирует:
- 2 игрока, easy/normal/aggressive (по 25 игр)
- 3 игрока, normal (15 игр)
- 4 игрока, normal (10 игр)

---

## Система логирования

### Подключение

```typescript
import { Logger } from "./core/Logger";
```

### Конфигурация

```typescript
// Полная конфигурация
Logger.configure({
    enabled: true,           // Включить логирование
    minLevel: "debug",       // Минимальный уровень: debug | info | warn | error
    consoleOutput: true,     // Выводить в консоль браузера
    bufferSize: 1000,        // Размер буфера в памяти
});

// Включить/выключить категории
Logger.setNamespaceEnabled("combat", true);
Logger.setNamespaceEnabled("movement", true);
Logger.disableAll();  // Выключить все
Logger.enableAll();   // Включить все
```

### Категории (namespaces)

| Namespace | Описание |
|-----------|----------|
| `combat` | Бои, урон, результаты |
| `movement` | Перемещения по карте |
| `crafting` | Крафт предметов |
| `exploration` | Исследование тайлов |
| `turn` | Ходы, смена игрока |
| `state` | Изменения состояния |
| `network` | Сетевые операции |
| `ai` | Действия бота |
| `ui` | UI события |
| `general` | Общие логи |

### Уровни логов

```typescript
Logger.combat.debug("Детальная информация");  // Отладка
Logger.combat.info("Информация");              // Нормальный ход
Logger.combat.warn("Предупреждение");          // Потенциальная проблема
Logger.combat.error("Ошибка", { data });       // Ошибка
```

### Использование в коде

```typescript
// Логирование боя
Logger.combat.info("Combat started", { 
    player: player.id, 
    monster: tile.monsterTier 
});

// Логирование движения
Logger.movement.debug("Player moved", {
    from: oldPos,
    to: newPos,
    blocked: wasBlocked
});

// Логирование ошибки
Logger.state.error("Invalid state transition", {
    from: oldPhase,
    to: newPhase,
    reason: "Phase not allowed"
});
```

### Экспорт логов

```typescript
// Получить все логи
const logs = Logger.getLogs();

// Получить форматированные логи
const formatted = Logger.formatLogs();

// Скачать как файл
Logger.downloadLogs();  // ruins-nexus-logs-{timestamp}.txt

// Экспортировать как JSON
const json = Logger.exportLogs();

// Очистить буфер
Logger.clear();
```

### Формат лога

```
[14:33:36.752] [WARN] [AI] Bot P1 - too many failed actions, forcing end turn
[14:33:36.753] [INFO] [COMBAT] Player P2 attacked monster tier 3
[14:33:36.754] [ERROR] [STATE] Invalid monster tier: 5
```

### Подписка на логи

```typescript
// Слушать новые логи в реальном времени
Logger.addListener((entry) => {
    if (entry.level === "error") {
        showErrorNotification(entry.message);
    }
});
```

---

## Debug Panel в игре

### Как открыть

1. Запусти игру в браузере
2. Нажми кнопку **🐛** в левом нижнем углу

### Вкладки

#### ⚡ Actions — Читы для тестирования

| Кнопка | Действие |
|--------|----------|
| 💰 +10 Resources | Добавить 10 каждого ресурса |
| ❤️ Full Heal | Полное исцеление |
| ⏭️ Skip Turn | Пропустить ход |
| 🔄 Reset Game | Перезапустить игру |
| 🚪 Leave Game | Выйти из игры |

#### 📜 Logs — Просмотр логов

- Показывает последние 15 логов
- **▲ Up / ▼ Down** — прокрутка
- **📥 Export** — скачать все логи в файл
- **🗑️ Clear** — очистить буфер

Цвета логов:
- 🔵 Синий — INFO
- 🟡 Жёлтый — WARN  
- 🔴 Красный — ERROR
- ⚫ Серый — DEBUG

#### 🔍 State — Валидация состояния

Показывает:
- Текущая фаза игры
- Номер раунда
- Текущий игрок
- Количество тайлов
- Остаток в колоде
- Статус Orbital Phase

Кнопки:
- **🔍 Validate Now** — проверить состояние на ошибки
- **📤 Export State** — скачать GameState как JSON

---

## State Validator

### Что проверяет

**Игроки:**
- HP в пределах 0...maxHp
- Ресурсы неотрицательные
- Позиция на существующем тайле
- База на существующем тайле
- Action points в разумных пределах

**Доска:**
- Есть хотя бы один тайл
- Есть Hub тайл
- Discovered тайлы имеют тип
- Monster tier в пределах 1-4
- Blocked edges валидны (0-5)

**Фаза игры:**
- Фаза из списка допустимых
- Round >= 1
- currentPlayerIndex валиден
- Консистентность Final Preparation

**Колода:**
- Колода существует
- Остаток >= 0

### Использование в коде

```typescript
import { validateGameState, assertValidState, validateAction } from "./core/StateValidator";

// Проверить состояние
const result = validateGameState(game.state);
if (!result.valid) {
    console.error("Errors:", result.errors);
    console.warn("Warnings:", result.warnings);
}

// Бросить исключение при ошибке
assertValidState(game.state, "after combat");  // Добавит контекст в сообщение

// Проверить можно ли выполнить действие
const canMove = validateAction(game.state, "move", "P1");
if (!canMove.valid) {
    console.log("Cannot move:", canMove.errors);
}
```

### Пример результата

```typescript
{
    valid: false,
    errors: [
        "P1: HP is negative (-5)",
        "Tile at 3,-2: Invalid monster tier 5"
    ],
    warnings: [
        "P2: Unusually high action points (15)"
    ]
}
```

---

## Покрытие кода

### Запуск

```bash
npm run test:coverage
```

### Отчёт

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   44%   |   47%    |   45%   |   45%   |
 src/ai            |   89%   |   88%    |   97%   |   90%   |
 src/board         |   87%   |   88%    |   92%   |   87%   |
 src/core          |   60%   |   54%    |   59%   |   64%   |
 src/systems       |   72%   |   70%    |   95%   |   72%   |
-------------------|---------|----------|---------|---------|
```

### HTML отчёт

После `npm run test:coverage` открой файл:
```
coverage/index.html
```

Покажет построчное покрытие для каждого файла.

---

## Примеры отладки

### Проблема: Бот застревает

**Симптомы:**
```
WARN [AI] Bot P1 - too many failed actions, forcing end turn
[Round 94] P1 cannot move - blocked by terrain!
```

**Диагностика:**
```bash
npm run test:bot
```
Смотри логи — бот пытается идти через горы.

**Решение:**
Проверь `canMoveBetween()` в `BlockedEdges.ts`

---

### Проблема: Невалидный monster tier

**Симптомы:**
```
ERROR [STATE] Invalid monster tier: 5
```

**Диагностика:**
```typescript
// В коде где создаётся монстр
Logger.combat.debug("Creating monster", { tier: tile.monsterTier });
```

**Поиск:**
```bash
npm run test:bot batch 20
# Смотри секцию "COMMON ERRORS"
```

---

### Проблема: Игра не завершается

**Симптомы:**
- Batch test показывает низкий Completion rate
- Много "Timed Out" игр

**Диагностика:**
```bash
npm run test:bot
# Смотри на каком раунде застревает
```

**Проверка:**
1. Final Tile в колоде?
2. Боты могут дойти до Final Tile?
3. Final Trial логика работает?

---

### Проблема: State validation failures

**Симптомы:**
```
🔍 VALIDATION:
  State Failures:  5
```

**Диагностика:**
```typescript
// Добавь в подозрительное место
import { assertValidState } from "./core/StateValidator";

// После каждого действия
assertValidState(game.state, "after doGather");
```

---

### Проблема: UI не обновляется

**Симптомы:**
Изменения в state не отражаются на экране.

**Диагностика:**
1. Открой Debug Panel → State
2. Сравни данные с UI
3. Проверь вызывается ли `render()`

---

## Чеклист перед коммитом

```bash
# 1. Все тесты проходят
npm run test

# 2. Бот работает
npm run test:bot

# 3. Batch тест показывает хороший completion rate
npm run test:bot batch 20

# 4. Нет новых ошибок валидации
# (смотри VALIDATION section в batch результатах)
```

---

## Файлы системы тестирования

```
src/
├── core/
│   ├── Logger.ts           # Система логирования
│   └── StateValidator.ts   # Валидация состояния
├── ai/
│   └── BotPlayer.ts        # AI бот + BotGameRunner
└── render/gameRenderer/
    └── DebugPanelRenderer.ts # Debug Panel UI

tests/
├── bot-runner.ts           # CLI для ботов
└── ...                     # Тесты
```

---

## FAQ

**Q: Как добавить новый тест?**
A: Создай файл `*.test.ts` в папке `tests/`, используй `describe/it/expect` из vitest.

**Q: Как логировать свой код?**
A: `import { Logger } from "./core/Logger"` и используй `Logger.{namespace}.{level}()`.

**Q: Почему бот не делает X?**
A: Смотри `BotPlayer.ts`, метод `decideAction()`. Добавь логику в соответствующий `evaluate*` метод.

**Q: Как добавить новую категорию логов?**
A: Добавь в `LogNamespace` в `Logger.ts` и создай shortcut.

**Q: Где хранятся логи?**
A: В памяти (буфер 1000 записей). Экспортируй через `Logger.downloadLogs()` или Debug Panel.
