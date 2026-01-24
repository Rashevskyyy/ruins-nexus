import type { HexCoord } from "../board/Hex";
import { isNeighbor, neighbors } from "../board/Hex";
import { TileType } from "../board/TileTypes";
import { Phase } from "./Phase";
import type { GameState } from "./GameState";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { SettlementSystem } from "../systems/SettlementSystem";
import { applyRotation, canMoveBetween } from "../board/BlockedEdges";
import type { Tile } from "../board/Tile";
import { BUILDINGS, type BuildingType, canAffordBuilding } from "../entities/BuildingType";

export class Game {
    private exploration: ExplorationSystem;
    private combat = new CombatSystem();
    private settlement = new SettlementSystem();

    constructor(public state: GameState) {
        this.exploration = new ExplorationSystem(state.tileDeck);
    }

    get currentPlayer() {
        return this.state.players[this.state.currentPlayerIndex];
    }

    private addLog(message: string) {
        this.state.eventLog.push(message);
        // Храним только последние 10 событий
        if (this.state.eventLog.length > 10) {
            this.state.eventLog.shift();
        }
        console.log(message); // дублируем в консоль для dev
    }

    /**
     * По правилам Karak 2: Move требует доступного action слота.
     * Если в текущем слоте уже что-то делали (move/action) → нужно начать новый слот.
     * 
     * Возвращает false, если слоты закончились (нужно прервать текущее действие).
     */
    private tryFinishCurrentSlotAndStartNew(): boolean {
        // Если текущий слот "активен" (хоть что-то делали) → завершаем его
        if (this.state.movedInCurrentSlot || this.state.actionUsedInCurrentSlot) {
            this.state.actionPoints -= 1;
            if (this.state.actionPoints <= 0) {
                this.endTurn();
                return false; // слоты закончились
            }
            // Начинаем новый слот
            this.state.movedInCurrentSlot = false;
            this.state.actionUsedInCurrentSlot = false;
        }
        return true;
    }

    private forceEndTurnAfterEncounter() {
        // сжигаем оставшиеся действия
        this.state.actionPoints = 0;
        this.endTurn();
    }

    handleHexClick(target: HexCoord): void {
        if (this.state.phase !== Phase.AwaitInput) return;
        if (this.state.actionPoints <= 0) return;

        const player = this.currentPlayer;
        const from = player.position;
        const isSame = from.q === target.q && from.r === target.r;

        // Tile Placement mode: игрок выбирает куда поставить новый тайл
        if (this.state.uiMode === "TILE_PLACEMENT") {
            // Проверяем, что target — валидная позиция (нет тайла, рядом с открытым)
            const existingTile = this.state.board.getTile(target);
            if (existingTile) return; // уже есть тайл

            // Проверяем, что хотя бы один сосед target — открытый тайл
            const hasOpenNeighbor = neighbors(target).some((n) => {
                const t = this.state.board.getTile(n);
                return t && t.discovered;
            });

            if (!hasOpenNeighbor) return;

            this.state.phase = Phase.ResolveAction;
            this.state.uiMode = "NONE";

            // Создаём пустой тайл с координатами
            const newTile: Tile = {
                coord: target,
                discovered: false,
                type: TileType.Empty,
            };

            this.state.board.setTile(newTile);

            // Вытягиваем тайл из колоды и применяем template
            const applied = this.exploration.applyTemplate(newTile);
            if (!applied) {
                this.addLog("Tile deck exhausted!");
                this.state.phase = Phase.AwaitInput;
                return;
            }

            // Применяем rotation к blockedEdges
            if (newTile.blockedEdges && this.state.pendingTileRotation > 0) {
                newTile.blockedEdges = applyRotation(
                    newTile.blockedEdges,
                    this.state.pendingTileRotation
                );
            }
            newTile.rotation = this.state.pendingTileRotation;

            // Сбрасываем rotation и выбранную позицию
            this.state.pendingTileRotation = 0;
            this.state.selectedPlacementPosition = null;

            // ПРАВИЛЬНЫЕ ПРАВИЛА KARAK 2:
            // Explore = размещение тайла (Action), игрок НЕ двигается!
            // Движение на новый тайл = отдельный Move в следующем слоте (с проверкой гор)
            
            // Prestige за исследование Tier II+
            if (newTile.tier && newTile.tier >= 2) {
                const prestigeGain = newTile.tier === 2 ? 1 : 2;
                player.prestige += prestigeGain;
                this.addLog(`${player.id} +${prestigeGain} Prestige (explore Tier ${newTile.tier})`);
            }
            
            // Final Tile - триггерит финальную фазу!
            if (newTile.isFinalTile) {
                this.state.isFinalPhase = true;
                this.state.finalPhaseRoundsLeft = 2; // 2 раунда до конца
                this.addLog(`⚔️ FINAL TILE REVEALED! 2 rounds remaining!`);
            }
            
            this.addLog(
                `[Round ${this.state.round}] ${player.id} placed tile at ${target.q},${target.r} (Tier ${newTile.tier}${newTile.isFinalTile ? " - FINAL" : ""})`
            );

            // Explore = Action, завершаем текущий слот
            this.state.actionUsedInCurrentSlot = true;
            this.state.phase = Phase.AwaitInput;
            
            // Пытаемся начать новый слот
            this.tryFinishCurrentSlotAndStartNew();

            return;
        }

        // Обычный клик по карте = Move (только перед действием!)
        if (!isSame && !isNeighbor(from, target)) return;

        // По правилам Karak 2: Movement всегда ПЕРЕД action, никогда после!
        if (this.state.actionUsedInCurrentSlot) {
            return; // уже делали action в слоте → move запрещён
        }

        // Если уже двигались в текущем слоте → нужно завершить текущий слот и начать новый
        if (this.state.movedInCurrentSlot) {
            if (!this.tryFinishCurrentSlotAndStartNew()) return;
        }

        const moved = !isSame && isNeighbor(from, target);

        if (moved) {
            // Проверяем blocked edges (горы)
            const fromTile = this.state.board.getTile(from);
            const targetTile = this.state.board.getTile(target) || null;
            
            if (fromTile && !canMoveBetween(fromTile, target, targetTile)) {
                this.addLog(`[Round ${this.state.round}] ${player.id} cannot move - blocked by mountains!`);
                return; // движение заблокировано горами
            }

            player.position = target;
            this.state.movedInCurrentSlot = true;
        }

        const tile = this.state.board.getTile(target);
        if (!tile) return;

        // Вход в туман: reveal (ресурс + монстр)
        if (!tile.discovered) {
            this.exploration.reveal(tile);
        }

        // Монстр активен => бой обязателен => это Action в слоте => ход заканчивается
        if (tile.encounterActive === true) {
            this.state.phase = Phase.ResolveAction;

            const outcome = this.combat.fightOnce(this.currentPlayer, tile);
            this.addLog(
                `${this.currentPlayer.id} fought Enemy (S${outcome.roll.swords}/K${outcome.roll.skulls}) ${outcome.killed ? "WON" : "LOST"}`
            );

            if (outcome.killed) {
                // Победа! Начисляем Prestige
                const prestigeGain = tile.tier === 1 ? 1 : tile.tier === 2 ? 2 : 3;
                player.prestige += prestigeGain;
                this.addLog(`${player.id} +${prestigeGain} Prestige (combat)`);
            } else {
                // не убил => откат назад
                player.position = from;
            }

            // Бой = Action, заканчивает ход
            this.forceEndTurnAfterEncounter();
            return;
        } else {
            // монстра нет: просто стоим на клетке после move, можно делать action
            this.state.phase = Phase.AwaitInput;
        }
    }

    doGather(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false; // уже делали action в слоте

        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);

        if (!tile) return false;
        if (!tile.discovered) return false;
        if (tile.type !== TileType.Resource) return false;
        if (tile.encounterActive === true) return false;

        // NEW: Проверяем множественные ресурсы
        const hasResources = tile.resources && Object.keys(tile.resources).length > 0;
        const hasOldResource = tile.resource; // обратная совместимость
        
        if (!hasResources && !hasOldResource) return false;

        const map = (tile.cooldownUntilRoundByPlayer ??= {});
        const cooldown = map[p.id] ?? 0;
        if (cooldown > this.state.round) return false;

        this.state.phase = Phase.ResolveAction;

        // NEW: Собираем все ресурсы с тайла
        if (tile.resources) {
            if (tile.resources.Provisions) p.provisions += tile.resources.Provisions;
            if (tile.resources.Timber) p.timber += tile.resources.Timber;
            if (tile.resources.Iron) p.iron += tile.resources.Iron;

            // Лог
            const parts: string[] = [];
            if (tile.resources.Provisions) parts.push(`${tile.resources.Provisions} 🍖`);
            if (tile.resources.Timber) parts.push(`${tile.resources.Timber} 🪵`);
            if (tile.resources.Iron) parts.push(`${tile.resources.Iron} ⚙️`);
            
            this.addLog(`[Round ${this.state.round}] ${p.id} GATHERED ${parts.join(", ")}`);
        } else if (tile.resource) {
            // OLD: обратная совместимость
            const res = tile.resource;
            if (res.kind === "Provisions") p.provisions += res.amount;
            if (res.kind === "Timber") p.timber += res.amount;
            if (res.kind === "Iron") p.iron += res.amount;

            const emoji = res.kind === "Provisions" ? "🍖" : res.kind === "Timber" ? "🪵" : "⚙️";
            this.addLog(`[Round ${this.state.round}] ${p.id} GATHERED ${res.amount} ${emoji}`);
        }

        map[p.id] = this.state.round + 1;

        this.state.actionUsedInCurrentSlot = true;
        this.state.uiMode = "NONE";
        this.state.phase = Phase.AwaitInput;

        // Action завершает текущий слот
        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }

    doTrade(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false; // уже делали action в слоте

        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        if (!tile || tile.type !== TileType.Settlement) return false;

        this.state.phase = Phase.ResolveAction;
        const didTrade = this.settlement.trade(p);

        if (didTrade) {
            this.addLog(`${p.id} TRADE in Settlement`);
        }

        this.state.actionUsedInCurrentSlot = true;
        this.state.uiMode = "NONE";
        this.state.phase = Phase.AwaitInput;

        if (didTrade) {
            // Trade завершает текущий слот
            this.tryFinishCurrentSlotAndStartNew();
            return true;
        }

        return false;
    }

    // ========================================
    // OUTPOST & DISTRICTS SYSTEM
    // ========================================
    
    /**
     * Проверить, может ли игрок построить Outpost (город)
     */
    canBuildOutpost(): boolean {
        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        
        // Нельзя если уже есть город
        if (p.outpostPosition) return false;
        
        // Нельзя на Settlement
        if (!tile || tile.type === TileType.Settlement) return false;
        
        // Только на открытых тайлах
        if (!tile.discovered) return false;
        
        // Нельзя если монстр активен
        if (tile.encounterActive) return false;
        
        // Нельзя если уже чей-то город
        if (tile.ownerId) return false;
        
        // Нельзя если на клетке стоит другой игрок!
        const otherPlayersHere = this.state.players.filter(
            other => other.id !== p.id && 
            other.position.q === p.position.q && 
            other.position.r === p.position.r
        );
        if (otherPlayersHere.length > 0) return false;
        
        // Нужно 2 Timber
        if (p.timber < 2) return false;
        
        return true;
    }
    
    /**
     * Построить Outpost (город) на текущей клетке
     * Стоит 2 Timber, можно только 1 на игрока
     */
    doBuildOutpost(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        if (!this.canBuildOutpost()) return false;

        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        if (!tile) return false;

        this.state.phase = Phase.ResolveAction;

        // Тратим ресурсы
        p.timber -= 2;

        // Отмечаем тайл как город игрока
        tile.ownerId = p.id;
        p.outpostPosition = { ...p.position };

        // Prestige за город
        p.prestige += 2;

        this.addLog(`🏰 ${p.id} built OUTPOST at ${p.position.q},${p.position.r}! +2 Prestige`);

        this.state.actionUsedInCurrentSlot = true;
        this.state.phase = Phase.AwaitInput;
        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }
    
    /**
     * Проверить, стоит ли игрок в своём городе
     */
    isInOwnOutpost(): boolean {
        const p = this.currentPlayer;
        const tile = this.state.board.getTile(p.position);
        return tile?.ownerId === p.id;
    }
    
    /**
     * Получить список районов, которые можно построить
     */
    getAvailableDistricts(): BuildingType[] {
        const p = this.currentPlayer;
        
        // Должен стоять в своём городе
        if (!this.isInOwnOutpost()) return [];
        
        return (Object.keys(BUILDINGS) as BuildingType[]).filter(type => {
            const building = BUILDINGS[type];
            return (
                !p.buildings.includes(type) &&
                canAffordBuilding(building, p.timber, p.iron, p.provisions)
            );
        });
    }
    
    /**
     * Построить районы в своём городе
     * ВАЖНО: за 1 действие можно построить ЛЮБОЕ количество районов!
     */
    doBuildDistricts(districtTypes: BuildingType[]): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;
        if (!this.isInOwnOutpost()) return false;
        if (districtTypes.length === 0) return false;

        const p = this.currentPlayer;
        
        // Проверяем что все районы можно построить
        let totalTimber = 0, totalIron = 0, totalProvisions = 0;
        let totalPrestige = 0;
        const validDistricts: BuildingType[] = [];
        
        for (const type of districtTypes) {
            const building = BUILDINGS[type];
            if (!building) continue;
            if (p.buildings.includes(type)) continue; // уже есть
            
            totalTimber += building.cost.timber;
            totalIron += building.cost.iron;
            totalProvisions += building.cost.provisions;
            totalPrestige += building.prestigeGain;
            validDistricts.push(type);
        }
        
        // Проверяем хватает ли ресурсов на ВСЕ районы
        if (p.timber < totalTimber || p.iron < totalIron || p.provisions < totalProvisions) {
            this.addLog(`${p.id} cannot afford all selected districts`);
            return false;
        }
        
        if (validDistricts.length === 0) return false;

        this.state.phase = Phase.ResolveAction;

        // Тратим ресурсы
        p.timber -= totalTimber;
        p.iron -= totalIron;
        p.provisions -= totalProvisions;

        // Добавляем районы
        for (const type of validDistricts) {
            p.buildings.push(type);
            const building = BUILDINGS[type];
            this.addLog(`🏗️ ${p.id} built ${building.description}`);
        }

        // Начисляем Prestige
        p.prestige += totalPrestige;
        this.addLog(`${p.id} +${totalPrestige} Prestige (${validDistricts.length} districts)`);

        this.state.actionUsedInCurrentSlot = true;
        this.state.phase = Phase.AwaitInput;
        this.tryFinishCurrentSlotAndStartNew();
        return true;
    }
    
    /**
     * Legacy метод для совместимости
     */
    doBuild(buildingType: BuildingType): boolean {
        return this.doBuildDistricts([buildingType]);
    }
    
    /**
     * Legacy метод для совместимости
     */
    getAvailableBuildings(): BuildingType[] {
        if (this.canBuildOutpost()) return []; // Сначала нужен город
        return this.getAvailableDistricts();
    }

    /**
     * Explore = создать новый тайл и разместить его на карте (tile placement).
     * Игрок выбирает куда поставить тайл (соседи открытых тайлов).
     * После размещения → move на тайл, reveal, бой.
     */
    doExplore(): boolean {
        if (this.state.phase !== Phase.AwaitInput) return false;
        if (this.state.actionPoints <= 0) return false;
        if (this.state.actionUsedInCurrentSlot) return false;

        // Если уже двигались (без action) → завершаем текущий слот перед Explore
        if (this.state.movedInCurrentSlot && !this.state.actionUsedInCurrentSlot) {
            if (!this.tryFinishCurrentSlotAndStartNew()) return false;
        }

        // Определяем tier нового тайла (пока всегда tier 1, позже можно рандомизировать)
        const newTileTier = 1; // TODO: вытягивать из колоды/мешка

        // toggle режима размещения
        if (this.state.uiMode === "TILE_PLACEMENT") {
            this.state.uiMode = "NONE";
            this.state.pendingTileTier = undefined;
            this.state.pendingTileRotation = 0;
        } else {
            this.state.uiMode = "TILE_PLACEMENT";
            this.state.pendingTileTier = newTileTier;
            this.state.pendingTileRotation = 0; // сбрасываем rotation
        }

        return true;
    }

    rotatePendingTile(): void {
        if (this.state.uiMode !== "TILE_PLACEMENT") return;
        // Поворот на 60° (0 → 1 → 2 → 3 → 4 → 5 → 0)
        this.state.pendingTileRotation = (this.state.pendingTileRotation + 1) % 6;
        // Сбрасываем выбранную позицию при rotation (может стать недоступной)
        this.state.selectedPlacementPosition = null;
    }

    /**
     * Выбрать позицию для размещения тайла (hover на ghost hex)
     */
    selectPlacementPosition(coord: HexCoord | null): void {
        if (this.state.uiMode !== "TILE_PLACEMENT") return;
        this.state.selectedPlacementPosition = coord;
    }

    /**
     * Разместить тайл на выбранной позиции (кнопка Place Tile)
     */
    placeTileAtSelected(): boolean {
        if (this.state.uiMode !== "TILE_PLACEMENT") return false;
        if (!this.state.selectedPlacementPosition) return false;

        const target = this.state.selectedPlacementPosition;
        
        // Используем существующую логику handleHexClick для TILE_PLACEMENT
        // Но теперь вызываем её явно через кнопку
        this.handleHexClick(target);
        
        return true;
    }

    private endTurn(): void {
        this.state.phase = Phase.EndTurn;

        const prevIndex = this.state.currentPlayerIndex;
        const nextIndex = (prevIndex + 1) % this.state.players.length;

        // Новый раунд?
        if (nextIndex === 0) {
            this.state.round += 1;
            
            // Final Phase: уменьшаем счётчик раундов
            if (this.state.isFinalPhase && this.state.finalPhaseRoundsLeft > 0) {
                this.state.finalPhaseRoundsLeft--;
                this.addLog(`⏳ Final Phase: ${this.state.finalPhaseRoundsLeft} rounds left`);
                
                // Игра окончена?
                if (this.state.finalPhaseRoundsLeft === 0) {
                    this.endGame();
                    return;
                }
            }
        }

        this.state.currentPlayerIndex = nextIndex;

        // новый ход: 2 action слота
        this.state.actionPoints = 2;
        this.state.movedInCurrentSlot = false;
        this.state.actionUsedInCurrentSlot = false;
        this.state.uiMode = "NONE";

        this.state.phase = Phase.AwaitInput;
    }
    
    private endGame(): void {
        this.state.gameOver = true;
        
        // Определяем победителя по Prestige
        let maxPrestige = -1;
        let winnerId: string | null = null;
        
        for (const player of this.state.players) {
            if (player.prestige > maxPrestige) {
                maxPrestige = player.prestige;
                winnerId = player.id;
            }
        }
        
        this.state.winnerId = winnerId;
        
        // Логируем финальные результаты
        this.addLog(`🏆 GAME OVER! Winner: ${winnerId} with ${maxPrestige} Prestige!`);
        
        for (const player of this.state.players) {
            this.addLog(`   ${player.id}: ${player.prestige} Prestige`);
        }
    }
}
