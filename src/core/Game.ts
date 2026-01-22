import type { HexCoord } from "../board/Hex";
import { isNeighbor } from "../board/Hex";
import { TileType } from "../board/TileTypes";
import { Phase } from "./Phase";
import type { GameState } from "./GameState";
import { ExplorationSystem } from "../systems/ExplorationSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { SettlementSystem } from "../systems/SettlementSystem";

type ActionResult = { returnToFrom: boolean; forceEndTurn?: boolean };

export class Game {
    private exploration = new ExplorationSystem();
    private combat = new CombatSystem();
    private settlement = new SettlementSystem();

    constructor(public state: GameState) {}

    get currentPlayer() {
        return this.state.players[this.state.currentPlayerIndex];
    }

    setSelectedAction(a: GameState["selectedAction"]) {
        this.state.selectedAction = a;
    }

    private spendActionPoint() {
        this.state.actionPoints = Math.max(0, this.state.actionPoints - 1);
        if (this.state.actionPoints === 0) {
            this.endTurn();
        } else {
            // после выполнения “спец-действия” возвращаемся к PRIMARY, чтобы клик работал ожидаемо
            this.state.selectedAction = "PRIMARY";
            this.state.phase = Phase.AwaitInput;
        }
    }

    private forceEndTurnAfterEncounter() {
        // сжигаем оставшиеся действия
        this.state.actionPoints = 0;
        this.endTurn();
    }

    private resolveSelectedActionOn(
        coord: HexCoord,
        from: HexCoord,
        mode: "PRIMARY" | "GATHER" | "SETTLEMENT"
    ): ActionResult {
        this.state.phase = Phase.ResolveAction;

        const tile = this.state.board.getTile(coord);
        if (!tile) return { returnToFrom: false };

        // если тайл не открыт — открываем (создаёт ресурс + монстра)
        if (!tile.discovered) {
            this.exploration.reveal(tile);
        }

        // если монстр жив — бой обязателен (независимо от режима)
        if (tile.encounterActive) {
            const outcome = this.combat.fightOnce(this.currentPlayer, tile);

            console.log(
                `[Round ${this.state.round}] ${this.currentPlayer.id} fought Enemy at ${coord.q},${coord.r} ` +
                `roll=S${outcome.roll.swords}/K${outcome.roll.skulls} hp=${this.currentPlayer.hp} enemyHp=${tile.enemyHp ?? 0} killed=${outcome.killed}`
            );

            // проиграл / не убил — откат назад
            if (!outcome.killed) {
                return { returnToFrom: true, forceEndTurn: true };
            }

            // победил — остаёмся на тайле
            return { returnToFrom: false, forceEndTurn: true };
        }

        // монстра нет — выполняем конкретное действие
        switch (mode) {
            case "GATHER":
                this.resolveGatherOn(coord);
                return { returnToFrom: false };

            case "SETTLEMENT": {
                if (tile.type !== TileType.Settlement) return { returnToFrom: false };

                const didTrade = this.settlement.trade(this.currentPlayer);
                console.log(
                    `[Round ${this.state.round}] ${this.currentPlayer.id} used Settlement: trade=${didTrade} | ` +
                    `P:${this.currentPlayer.provisions} T:${this.currentPlayer.timber} I:${this.currentPlayer.iron}`
                );
                return { returnToFrom: false };
            }

            case "PRIMARY":
            default:
                // пока Primary на “чистом” тайле = no-op
                return { returnToFrom: false };
        }
    }

    handleHexClick(target: HexCoord): void {
        if (this.state.phase !== Phase.AwaitInput) return;
        if (this.state.actionPoints <= 0) return;

        const player = this.currentPlayer;
        const from = player.position;
        const isSame = from.q === target.q && from.r === target.r;

        const mode = this.state.selectedAction;

        // EXPLORE: открыть соседний туманный тайл без перемещения
        if (mode === "EXPLORE") {
            if (!isNeighbor(from, target)) return;

            const tile = this.state.board.getTile(target);
            if (!tile || tile.discovered) return;

            // открываем тайл: ресурс + монстр
            this.exploration.reveal(tile);

            // монстр появляется всегда => бой
            const outcome = this.combat.fightOnce(this.currentPlayer, tile);

            console.log(
                `[Round ${this.state.round}] ${this.currentPlayer.id} EXPLORE ${target.q},${target.r} -> fight ` +
                `roll=S${outcome.roll.swords}/K${outcome.roll.skulls} hp=${this.currentPlayer.hp} enemyHp=${tile.enemyHp ?? 0} killed=${outcome.killed}`
            );

            // ВАЖНО: монстр остаётся если не убили (CombatSystem должен это поддерживать)
            this.forceEndTurnAfterEncounter();
            return;
        }

        // Для остальных режимов (PRIMARY / GATHER / SETTLEMENT):
        // разрешён клик либо по текущей клетке, либо по соседней (move + action)
        const canTarget = isSame || isNeighbor(from, target);
        if (!canTarget) return;

        const moved = !isSame && isNeighbor(from, target);

        // 1) опционально перемещаемся
        if (moved) {
            player.position = target;
        }

        // 2) выполняем выбранное действие на целевом тайле
        const r = this.resolveSelectedActionOn(target, from, mode);

        // 3) если нужно — откат назад (например, проиграл бой)
        if (r?.returnToFrom) {
            player.position = from;
        }

        // 4) если бой был — ход заканчивается сразу
        if (r?.forceEndTurn) {
            this.forceEndTurnAfterEncounter();
            return;
        }

        // 5) обычное действие: тратим 1 AP
        this.spendActionPoint();
    }

    /**
     * PRIMARY action:
     * - если зашли на туманный тайл -> reveal -> encounter -> rollback if not killed
     * - если тайл уже discovered -> никакого encounter
     * - ресурс НЕ собираем в PRIMARY (Gather — отдельное действие)
     */
    private resolvePrimaryActionOn(coord: HexCoord, from: HexCoord): ActionResult {
        this.state.phase = Phase.ResolveAction;

        const tile = this.state.board.getTile(coord);
        if (!tile) return { returnToFrom: false };

        // Если зашли в туман — генерим ресурс + монстра
        if (!tile.discovered) {
            this.exploration.reveal(tile); // должен выставить encounterActive=true и enemyHp=2
        }

        switch (tile.type) {
            case TileType.Resource: {
                // Если монстр жив — бой обязателен
                if (tile.encounterActive) {
                    const outcome = this.combat.fightOnce(this.currentPlayer, tile);

                    console.log(
                        `[Round ${this.state.round}] ${this.currentPlayer.id} fought Enemy at ${coord.q},${coord.r} ` +
                        `roll=S${outcome.roll.swords}/K${outcome.roll.skulls} hp=${this.currentPlayer.hp} ` +
                        `enemyHp=${tile.enemyHp ?? 0} killed=${outcome.killed}`
                    );

                    // не убил — откат назад
                    if (!outcome.killed) {
                        return { returnToFrom: true, forceEndTurn: true };
                    }

                    // убил — остаёмся
                    return { returnToFrom: false, forceEndTurn: true };
                }

                // монстра нет — просто стоим (сбор отдельным действием)
                console.log(
                    `[Round ${this.state.round}] ${this.currentPlayer.id} entered cleared Resource at ${coord.q},${coord.r}`
                );
                return { returnToFrom: false };
            }

            case TileType.Settlement:
                return { returnToFrom: false };

            default:
                return { returnToFrom: false };
        }
    }

    /**
     * GATHER action:
     * - только на discovered Resource tile
     * - персональный кулдаун по игроку
     */
    private resolveGatherOn(coord: HexCoord): void {
        const tile = this.state.board.getTile(coord);
        if (!tile || tile.type !== TileType.Resource) return;
        if (!tile.discovered) return;

        const res = tile.resource;
        if (!res) return;

        const map = (tile.cooldownUntilRoundByPlayer ??= {});
        const cooldown = map[this.currentPlayer.id] ?? 0;

        if (cooldown > this.state.round) {
            console.log(
                `[Round ${this.state.round}] ${this.currentPlayer.id} tried to gather at ${coord.q},${coord.r} but is on cooldown until Round ${cooldown}`
            );
            return;
        }

        if (res.kind === "Provisions") this.currentPlayer.provisions += res.amount;
        if (res.kind === "Timber") this.currentPlayer.timber += res.amount;
        if (res.kind === "Iron") this.currentPlayer.iron += res.amount;

        map[this.currentPlayer.id] = this.state.round + 1;

        console.log(
            `[Round ${this.state.round}] ${this.currentPlayer.id} GATHERED ${res.amount} ${res.kind} at ${coord.q},${coord.r} | ` +
            `P:${this.currentPlayer.provisions} T:${this.currentPlayer.timber} I:${this.currentPlayer.iron}`
        );
    }

    private endTurn(): void {
        this.state.phase = Phase.EndTurn;

        const prevIndex = this.state.currentPlayerIndex;
        const nextIndex = (prevIndex + 1) % this.state.players.length;

        if (nextIndex === 0) this.state.round += 1;

        this.state.currentPlayerIndex = nextIndex;

        // новый ход: 2 действия
        this.state.actionPoints = 2;
        this.state.selectedAction = "PRIMARY";

        this.state.phase = Phase.AwaitInput;
    }
}
