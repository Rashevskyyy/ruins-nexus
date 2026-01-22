import * as PIXI from "pixi.js";
import type { Game } from "../core/Game";
import type { HexCoord } from "../board/Hex";
import { hexKey, neighbors } from "../board/Hex";
import { TileType } from "../board/TileTypes";

type ActionKey = "PRIMARY" | "GATHER" | "EXPLORE" | "SETTLEMENT";

export class GameRenderer {
    private HEX_SIZE = 42;
    private HEX_POINTS: number[];

    private boardLayer = new PIXI.Container();
    private playersLayer = new PIXI.Container();
    private hudLayer = new PIXI.Container();
    private labelsLayer = new PIXI.Container();

    private tileViews = new Map<string, PIXI.Graphics>();
    private tileLabels = new Map<string, PIXI.Text>();
    private playerViews: PIXI.Graphics[] = [];

    private hoverOverlays = new Map<string, PIXI.Graphics>();
    private hoveredKey: string | null = null;

    private hudBg = new PIXI.Graphics();
    private hudText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
            fontSize: 16,
            fill: 0xffffff,
            fontWeight: "600",
        }),
    });

    private actionButtons: Array<{
        key: ActionKey;
        bg: PIXI.Graphics;
        label: PIXI.Text;
    }> = [];

    constructor(private app: PIXI.Application, private game: Game) {
        this.HEX_POINTS = this.buildHexPoints(this.HEX_SIZE - 2);

        this.app.stage.addChild(this.boardLayer);
        this.boardLayer.addChild(this.labelsLayer);

        this.app.stage.addChild(this.playersLayer);

        this.app.stage.addChild(this.hudLayer);
        this.hudLayer.addChild(this.hudBg);
        this.hudLayer.addChild(this.hudText);

        this.createActionButtons();

        // HUD должен быть поверх всего
        this.hudLayer.zIndex = 999;
        this.hudLayer.sortableChildren = true;
    }

    renderAll() {
        this.renderBoard();
        this.renderLabels();
        this.renderPlayers();
        this.renderHUD();
    }

    // --------------------
    // Geometry
    // --------------------
    private hexToPixel(c: HexCoord): { x: number; y: number } {
        const x = this.HEX_SIZE * (Math.sqrt(3) * c.q + (Math.sqrt(3) / 2) * c.r);
        const y = this.HEX_SIZE * ((3 / 2) * c.r);
        return { x, y };
    }

    private buildHexPoints(size: number): number[] {
        const pts: number[] = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            pts.push(Math.cos(angle) * size, Math.sin(angle) * size);
        }
        return pts;
    }

    private tileFill(discovered: boolean, type: TileType): number {
        if (!discovered) return 0x0f1822; // fog

        switch (type) {
            case TileType.Settlement:
                return 0x9a7440;
            case TileType.Resource:
                return 0x4a9158;
            case TileType.Empty:
            default:
                return 0x425262;
        }
    }

    private getAllowedHexKeys(): Set<string> {
        const current = this.game.state.players[this.game.state.currentPlayerIndex];
        return new Set<string>([
            hexKey(current.position),
            ...neighbors(current.position).map(hexKey),
        ]);
    }

    // --------------------
    // Hover overlay
    // --------------------
    private ensureHoverOverlay(key: string): PIXI.Graphics {
        let ov = this.hoverOverlays.get(key);
        if (!ov) {
            ov = new PIXI.Graphics();
            ov.eventMode = "none";
            this.hoverOverlays.set(key, ov);
            this.boardLayer.addChild(ov);
        }
        return ov;
    }

    private drawHoverOverlay(key: string, x: number, y: number, visible: boolean) {
        const ov = this.ensureHoverOverlay(key);
        ov.position.set(x, y);
        ov.visible = visible;

        if (!visible) return;

        ov.clear();
        ov.poly(this.HEX_POINTS);
        ov.fill({ color: 0xffffff, alpha: 0.12 });
        ov.stroke({ color: 0xffffff, width: 2, alpha: 0.25 });
    }

    // --------------------
    // Board render
    // --------------------
    private renderBoard() {
        this.boardLayer.position.set(this.app.renderer.width / 2, this.app.renderer.height / 2);
        const allowed = this.getAllowedHexKeys();

        // Target highlighting by selected action
        const mode: ActionKey = this.game.state.selectedAction;
        const current = this.game.state.players[this.game.state.currentPlayerIndex];
        const neigh = neighbors(current.position);

        const exploreTargets = new Set<string>();
        const gatherTargets = new Set<string>();

        if (mode === "EXPLORE") {
            for (const c of neigh) {
                const t = this.game.state.board.getTile(c);
                if (t && !t.discovered) exploreTargets.add(hexKey(c));
            }
        }

        if (mode === "GATHER") {
            const candidates = [current.position, ...neigh];
            for (const c of candidates) {
                const t = this.game.state.board.getTile(c);
                // можно собирать: discovered resource и монстра нет
                if (t && t.discovered && t.type === TileType.Resource && t.encounterActive !== true) {
                    gatherTargets.add(hexKey(c));
                }
            }
        }

        for (const tile of this.game.state.board.getAllTiles()) {
            const key = hexKey(tile.coord);

            let view = this.tileViews.get(key);
            if (!view) {
                view = new PIXI.Graphics();
                view.hitArea = new PIXI.Polygon(this.HEX_POINTS);
                view.eventMode = "static";
                view.cursor = "pointer";

                view.on("pointerdown", () => {
                    this.game.handleHexClick(tile.coord);
                    this.renderAll();
                });

                view.on("pointerover", () => {
                    this.hoveredKey = key;
                    this.renderBoard();
                    this.renderLabels();
                });

                view.on("pointerout", () => {
                    if (this.hoveredKey === key) this.hoveredKey = null;
                    this.renderBoard();
                    this.renderLabels();
                });

                this.tileViews.set(key, view);
                this.boardLayer.addChildAt(view, 0);
            }

            const { x, y } = this.hexToPixel(tile.coord);
            view.position.set(x, y);

            view.clear();
            view.poly(this.HEX_POINTS);
            view.fill({ color: this.tileFill(tile.discovered, tile.type), alpha: 1 });

            // базовая рамка
            view.stroke({ color: 0x0d0d0d, width: 2, alpha: 1 });

            // лёгкий "open glow"
            if (tile.discovered) {
                view.stroke({ color: 0x9fd4ff, width: 1, alpha: 0.18 });
            }

            // allowed: current + neighbors
            if (allowed.has(key)) {
                view.stroke({ color: 0xffffff, width: 4, alpha: 0.9 });
            }

            // action target highlights
            if (mode === "EXPLORE" && exploreTargets.has(key)) {
                view.stroke({ color: 0x00ffff, width: 4, alpha: 0.65 });
            }

            if (mode === "GATHER" && gatherTargets.has(key)) {
                view.stroke({ color: 0x00ff88, width: 4, alpha: 0.65 });
            }

            this.drawHoverOverlay(key, x, y, this.hoveredKey === key);
        }
    }

    // --------------------
    // Labels (dev overlay)
    // --------------------
    private getTileLabel(tile: any): string {
        if (!tile.discovered) return "";

        // Settlement
        if (tile.type === TileType.Settlement) return "S";

        // Resource: показываем тип ресурса (dev), а если монстр жив — знак опасности
        if (tile.type === TileType.Resource) {
            const kind = tile.resource?.kind;
            const base = kind === "Provisions" ? "P" : kind === "Timber" ? "T" : kind === "Iron" ? "I" : "R";

            // если монстр жив — показываем "!" (не спойлер ресурса можно убрать позже)
            if (tile.encounterActive) return "!";
            return base;
        }

        return "";
    }

    private ensureLabel(key: string): PIXI.Text {
        let label = this.tileLabels.get(key);
        if (!label) {
            label = new PIXI.Text({
                text: "",
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0xffffff,
                    fontWeight: "700",
                }),
            });
            label.anchor.set(0.5);
            label.eventMode = "none";
            this.tileLabels.set(key, label);
            this.labelsLayer.addChild(label);
        }
        return label;
    }

    private renderLabels() {
        for (const tile of this.game.state.board.getAllTiles()) {
            const key = hexKey(tile.coord);
            const text = this.getTileLabel(tile);

            const label = this.ensureLabel(key);
            const { x, y } = this.hexToPixel(tile.coord);

            label.text = text;
            label.position.set(x, y);
            label.visible = text.length > 0;
        }
    }

    // --------------------
    // Players
    // --------------------
    private PLAYER_COLORS = [0x4aa3ff, 0xff5c5c, 0x5cff8f, 0xffd24a];

    private getPlayerOffset(index: number): { x: number; y: number } {
        const radius = 12;
        const angle = (Math.PI * 2 * index) / 4;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }

    private ensurePlayersCreated() {
        for (let i = 0; i < this.game.state.players.length; i++) {
            if (this.playerViews[i]) continue;

            const g = new PIXI.Graphics();
            g.eventMode = "none";
            this.playerViews[i] = g;
            this.playersLayer.addChild(g);
        }
    }

    private renderPlayers() {
        this.ensurePlayersCreated();
        this.playersLayer.position.copyFrom(this.boardLayer.position);

        for (let i = 0; i < this.game.state.players.length; i++) {
            const p = this.game.state.players[i];
            const v = this.playerViews[i];

            const { x, y } = this.hexToPixel(p.position);
            const offset = this.getPlayerOffset(i);

            v.clear();

            const isCurrent = i === this.game.state.currentPlayerIndex;
            const fill = this.PLAYER_COLORS[i % this.PLAYER_COLORS.length];

            v.circle(0, 0, 9);
            v.fill({ color: fill, alpha: 1 });

            v.stroke({
                color: isCurrent ? 0xffffff : 0x000000,
                width: isCurrent ? 4 : 2,
                alpha: 1,
            });

            v.position.set(x + offset.x, y + offset.y);
            v.visible = true;
        }
    }

    // --------------------
    // HUD + Buttons
    // --------------------
    private createActionButtons() {
        const actions: ActionKey[] = ["PRIMARY", "GATHER", "EXPLORE", "SETTLEMENT"];

        for (const key of actions) {
            const bg = new PIXI.Graphics();
            bg.eventMode = "static";
            bg.cursor = "pointer";

            const label = new PIXI.Text({
                text: key,
                style: new PIXI.TextStyle({
                    fontSize: 12,
                    fill: 0xffffff,
                    fontWeight: "700",
                }),
            });
            label.anchor.set(0.5);
            label.eventMode = "none";

            bg.on("pointerdown", () => {
                if (!this.canUseAction(key)) return;
                this.game.setSelectedAction(key);
                this.renderHUD();
                // подсветка целей зависит от режима
                this.renderBoard();
            });

            this.hudLayer.addChild(bg);
            this.hudLayer.addChild(label);

            this.actionButtons.push({ key, bg, label });
        }
    }

    private canUseAction(action: ActionKey): boolean {
        if (this.game.state.actionPoints <= 0) return false;

        const p = this.game.state.players[this.game.state.currentPlayerIndex];
        const here = this.game.state.board.getTile(p.position);

        if (action === "PRIMARY") return true;

        if (action === "SETTLEMENT") {
            // MVP: разрешаем только если стоим в поселении
            return here?.type === TileType.Settlement;
        }

        if (action === "GATHER") {
            // MVP: gather на текущем возможен только если чистый ресурс
            return (
                here?.type === TileType.Resource &&
                here.discovered === true &&
                here.encounterActive !== true
            );
        }

        if (action === "EXPLORE") {
            const neigh = neighbors(p.position);
            return neigh.some((c) => {
                const t = this.game.state.board.getTile(c);
                return t && !t.discovered;
            });
        }

        return false;
    }

    private renderHUD() {
        const p = this.game.state.players[this.game.state.currentPlayerIndex];

        // нижняя панель
        const panelH = 92;
        const panelY = this.app.renderer.height - panelH;
        const panelW = this.app.renderer.width;

        // фон панели
        this.hudBg.clear();
        this.hudBg.roundRect(0, panelY, panelW, panelH, 0);
        this.hudBg.fill({ color: 0x000000, alpha: 0.28 });
        this.hudBg.stroke({ color: 0xffffff, alpha: 0.12, width: 1 });

        // текст слева
        this.hudText.text =
            `Turn: ${p.id}   AP: ${this.game.state.actionPoints}   Mode: ${this.game.state.selectedAction}\n` +
            `HP: ${p.hp}   P: ${p.provisions}   T: ${p.timber}   I: ${p.iron}   Round: ${this.game.state.round}`;

        this.hudText.position.set(16, panelY + 14);

        // кнопки справа в один ряд
        const w = 110;
        const h = 30;
        const gap = 10;

        const totalW = this.actionButtons.length * w + (this.actionButtons.length - 1) * gap;
        const startX = panelW - totalW - 16;
        const y = panelY + 14;

        for (let i = 0; i < this.actionButtons.length; i++) {
            const btn = this.actionButtons[i];
            const x = startX + i * (w + gap);

            const enabled = this.canUseAction(btn.key);
            const selected = btn.key === this.game.state.selectedAction;

            btn.bg.clear();
            btn.bg.roundRect(x, y, w, h, 10);

            if (!enabled) {
                btn.bg.fill({ color: 0x000000, alpha: 0.18 });
                btn.bg.stroke({ color: 0xffffff, alpha: 0.10, width: 1 });
                btn.label.alpha = 0.35;
                btn.bg.cursor = "default";
            } else {
                btn.bg.fill({ color: 0xffffff, alpha: selected ? 0.22 : 0.08 });
                btn.bg.stroke({ color: 0xffffff, alpha: selected ? 0.75 : 0.22, width: 1 });
                btn.label.alpha = selected ? 1 : 0.85;
                btn.bg.cursor = "pointer";
            }

            // ВАЖНО: ты это не делал, поэтому "не получилось"
            btn.label.position.set(x + w / 2, y + h / 2);
        }
    }
}
