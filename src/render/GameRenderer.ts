import * as PIXI from "pixi.js";
import type { Game } from "../core/Game";
import type { HexCoord } from "../board/Hex";
import { hexKey, neighbors } from "../board/Hex";
import { TileType } from "../board/TileTypes";
import { canMoveBetween } from "../board/BlockedEdges";
import { type EdgeIndex, getEdgeVertices } from "../board/HexEdges";
import type { Tile } from "../board/Tile";
import { GAME_VERSION } from "../assets/AssetLoader";
import { BuildMenuPanel } from "./panels/BuildMenuPanel";
import { CraftMenuPanel } from "./panels/CraftMenuPanel";
import { HeroBoardPanel } from "./panels/HeroBoardPanel";
import { HireUnitMenuPanel } from "./panels/HireUnitMenuPanel";
import { OrbitalHangarMenuPanel } from "./panels/OrbitalHangarMenuPanel";
import { FinalPhaseBanner } from "./panels/FinalPhaseBanner";
import { EventLogPanel } from "./panels/EventLogPanel";
import { DeckInfoPanel } from "./panels/DeckInfoPanel";
import { DiceRollUI } from "./ui/DiceRollUI";
import { TutorialHintsManager } from "./ui/TutorialHintsManager";
import { ToastManager } from "./ui/ToastManager";

export class GameRenderer {
    private HEX_SIZE = 50;
    private HEX_POINTS: number[];

    private boardLayer = new PIXI.Container();
    private playersLayer = new PIXI.Container();
    private hudLayer = new PIXI.Container();
    private labelsLayer = new PIXI.Container();
    private heroBoardLayer = new PIXI.Container(); // NEW: Hero Board panel
    private rotationIndicatorsLayer = new PIXI.Container(); // НЕ кликабельный слой для индикаторов
    private buildMenuLayer = new PIXI.Container(); // BUILD MENU panel
    private craftMenuLayer = new PIXI.Container(); // v0.5: CRAFT MENU panel
    private finalPhaseBannerLayer = new PIXI.Container(); // v0.5: Final Phase banner

    private tileViews = new Map<string, PIXI.Graphics>();
    private tileLabels = new Map<string, PIXI.Text>();
    private playerViews: PIXI.Graphics[] = [];

    // Zoom & Pan
    private zoom = 1;
    private minZoom = 0.5;
    private maxZoom = 2;
    private panX = 0;
    private panY = 0;
    private isDragging = false;
    private dragStart = { x: 0, y: 0 };

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

    // v0.6: New HUD layers
    private topStatusLayer = new PIXI.Container();
    private combatSummaryLayer = new PIXI.Container();
    private contextHintLayer = new PIXI.Container();
    private heroBoardPanel = new HeroBoardPanel();
    private buildMenuPanel = new BuildMenuPanel();
    private craftMenuPanel = new CraftMenuPanel();
    private hireUnitMenuPanel = new HireUnitMenuPanel();
    private orbitalHangarMenuPanel = new OrbitalHangarMenuPanel();
    private finalPhaseBanner = new FinalPhaseBanner();
    private eventLogPanel = new EventLogPanel();
    private deckInfoPanel = new DeckInfoPanel();


    // Rotate button (только для TILE_PLACEMENT)
    private rotateButton = {
        bg: new PIXI.Graphics(),
        label: new PIXI.Text({
            text: "🔄 Rotate",
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: "700",
            }),
        }),
    };

    // Place Tile button (только для TILE_PLACEMENT)
    private placeTileButton = {
        bg: new PIXI.Graphics(),
        label: new PIXI.Text({
            text: "✓ Place Tile",
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: "700",
            }),
        }),
    };

    // Event Log
    private eventLogLayer = new PIXI.Container();

    // Deck Info (UI колоды)
    private deckInfoLayer = new PIXI.Container();

    // Ghost hex preview texts (отдельный layer для текстов на ghost hexes)
    private ghostPreviewLayer = new PIXI.Container();

    // Debug Panel
    private debugPanelLayer = new PIXI.Container();
    private debugPanelVisible = false;

    // Dice Roll UI
    private diceLayer = new PIXI.Container();
    private diceRollUI: DiceRollUI;

    // Context Menu (actions on tile)
    private contextMenuLayer = new PIXI.Container();
    private contextMenuVisible = false;
    private contextMenuTile: HexCoord | null = null;

    // Toast notifications
    private toastLayer = new PIXI.Container();
    private toastManager: ToastManager;

    // Tutorial hints (persisted in localStorage)
    private tutorialLayer = new PIXI.Container();
    private tutorialHints: TutorialHintsManager;

    // Settings popup
    private settingsLayer = new PIXI.Container();
    private settingsVisible = false;

    // Token reward UI (choose item after combat)
    private tokenRewardLayer = new PIXI.Container();
    private isTokenRewardVisible = false;
    
    // Reconnection protection: delay popup display after reconnect
    private reconnectProtectionActive = true;

    // Multiplayer: check if it's my turn (set externally)
    public isMyTurnFn: (() => boolean) | null = null;
    
    // Multiplayer: my player ID (set externally)
    public myPlayerId: string | null = null;
    
    // Debug callbacks (set externally)
    public onDebugReset: (() => void) | null = null;
    public onDebugAddResources: (() => void) | null = null;
    public onDebugSkipTurn: (() => void) | null = null;
    public onDebugHeal: (() => void) | null = null;
    public onDebugLeaveGame: (() => void) | null = null;

    private get isMyTurn(): boolean {
        return this.isMyTurnFn ? this.isMyTurnFn() : true;
    }
    
    // Get my player index for Hero Board
    private get myPlayerIndex(): number {
        if (!this.myPlayerId) return this.game.state.currentPlayerIndex; // Single player
        const idx = this.game.state.players.findIndex(p => p.id === this.myPlayerId);
        return idx >= 0 ? idx : 0;
    }

    constructor(private app: PIXI.Application, private game: Game) {
        this.HEX_POINTS = this.buildHexPoints(this.HEX_SIZE); // No gap between hexes

        this.app.stage.addChild(this.boardLayer);
        this.boardLayer.sortableChildren = true; // Enable zIndex sorting
        this.boardLayer.addChild(this.labelsLayer);
        this.labelsLayer.zIndex = 100; // Labels поверх tiles

        this.app.stage.addChild(this.ghostPreviewLayer); // Тексты на ghost hexes
        this.ghostPreviewLayer.eventMode = "none"; // НЕ кликабельный!

        this.app.stage.addChild(this.rotationIndicatorsLayer); // Поверх board
        this.rotationIndicatorsLayer.eventMode = "none"; // НЕ кликабельный!

        this.app.stage.addChild(this.playersLayer);

        this.app.stage.addChild(this.heroBoardLayer); // Hero Board panel
        this.heroBoardLayer.zIndex = 100;

        this.app.stage.addChild(this.buildMenuLayer); // Build Menu (modal)
        this.buildMenuLayer.zIndex = 200;
        
        this.app.stage.addChild(this.craftMenuLayer); // v0.5: Craft Menu (modal)
        this.craftMenuLayer.zIndex = 210;
        
        this.app.stage.addChild(this.finalPhaseBannerLayer); // v0.5: Final Phase banner
        this.finalPhaseBannerLayer.zIndex = 50; // Below modals but above game

        this.app.stage.addChild(this.hudLayer);
        this.hudLayer.addChild(this.hudBg);
        this.hudLayer.addChild(this.hudText);

        // v0.6: New HUD layers
        this.app.stage.addChild(this.topStatusLayer);
        this.topStatusLayer.zIndex = 180;
        
        this.app.stage.addChild(this.combatSummaryLayer);
        this.combatSummaryLayer.zIndex = 180;
        
        this.app.stage.addChild(this.contextHintLayer);
        this.contextHintLayer.zIndex = 185;

        this.app.stage.addChild(this.eventLogLayer); // Event Log
        this.eventLogLayer.zIndex = 200;

        this.app.stage.addChild(this.deckInfoLayer); // Deck Info
        this.deckInfoLayer.zIndex = 200;

        this.app.stage.addChild(this.debugPanelLayer); // Debug Panel
        this.debugPanelLayer.zIndex = 300;

        this.app.stage.addChild(this.contextMenuLayer); // Context Menu on tiles
        this.contextMenuLayer.zIndex = 150;

        this.app.stage.addChild(this.diceLayer); // Dice Roll UI
        this.diceLayer.zIndex = 400; // Above everything

        this.app.stage.addChild(this.toastLayer); // Toast notifications
        this.toastLayer.zIndex = 450;

        this.diceRollUI = new DiceRollUI(this.app, this.diceLayer);
        this.toastManager = new ToastManager(this.app, this.toastLayer);
        this.tutorialHints = new TutorialHintsManager(this.app, this.tutorialLayer, this.showToast.bind(this));

        this.app.stage.addChild(this.tokenRewardLayer); // Token reward choice UI
        this.tokenRewardLayer.zIndex = 480;

        this.app.stage.addChild(this.tutorialLayer); // Tutorial hints
        this.tutorialLayer.zIndex = 500;

        this.app.stage.addChild(this.settingsLayer); // Settings popup
        this.settingsLayer.zIndex = 470;

        // Remove old action buttons - now using context menu on tiles
        // this.createActionButtons();
        this.createRotateButton();
        this.createPlaceTileButton();
        this.createDebugToggleButton();
        this.createVersionLabel();
        this.setupZoomAndPan();

        // HUD должен быть поверх всего
        this.hudLayer.zIndex = 999;
        this.hudLayer.sortableChildren = true;
        
        // Reconnection protection: delay popups for 500ms after game loads
        // This prevents popups from appearing immediately on reconnect
        this.reconnectProtectionActive = true;
        window.setTimeout(() => {
            this.reconnectProtectionActive = false;
            console.log("[Renderer] Reconnect protection disabled");
        }, 500);
    }

    private createVersionLabel() {
        const h = this.app.renderer.height;
        const versionText = new PIXI.Text({
            text: GAME_VERSION,
            style: new PIXI.TextStyle({
                fontSize: 11,
                fill: 0x484f58,
                fontFamily: "monospace",
            }),
        });
        versionText.position.set(60, h - 38); // Next to debug button at bottom
        this.hudLayer.addChild(versionText);
    }

    private setupZoomAndPan() {
        // Zoom через колесо мыши (простая версия)
        this.app.canvas.addEventListener("wheel", (e: WheelEvent) => {
            e.preventDefault();

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

            this.applyTransform();
            this.renderAll();
        });

        // Pan через ПКМ drag (правая кнопка мыши)
        this.app.canvas.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.button === 2) {
                // Правая кнопка = pan
                e.preventDefault();
                this.isDragging = true;
                this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
                this.app.canvas.style.cursor = "grab";
            }
        });

        this.app.canvas.addEventListener("mousemove", (e: MouseEvent) => {
            if (this.isDragging) {
                this.panX = e.clientX - this.dragStart.x;
                this.panY = e.clientY - this.dragStart.y;
                this.applyTransform();
                this.app.canvas.style.cursor = "grabbing";
            }
        });

        this.app.canvas.addEventListener("mouseup", () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.app.canvas.style.cursor = "default";
            }
        });

        this.app.canvas.addEventListener("mouseleave", () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.app.canvas.style.cursor = "default";
            }
        });

        // Отключаем контекстное меню на ПКМ
        this.app.canvas.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
        });
    }

    private applyTransform() {
        const centerX = this.app.renderer.width / 2 + this.panX;
        const centerY = this.app.renderer.height / 2 + this.panY;
        
        this.boardLayer.scale.set(this.zoom);
        this.boardLayer.position.set(centerX, centerY);

        this.ghostPreviewLayer.scale.set(this.zoom);
        this.ghostPreviewLayer.position.set(centerX, centerY);

        this.rotationIndicatorsLayer.scale.set(this.zoom);
        this.rotationIndicatorsLayer.position.set(centerX, centerY
        );

        this.playersLayer.scale.set(this.zoom);
        this.playersLayer.position.set(
            this.app.renderer.width / 2 + this.panX,
            this.app.renderer.height / 2 + this.panY
        );
    }

    /**
     * Force rebuild all tile views (call after server sync)
     */
    forceRebuildViews(): void {
        // Clear all existing tile views
        for (const view of this.tileViews.values()) {
            this.boardLayer.removeChild(view);
        }
        this.tileViews.clear();
        this.tileLabels.clear();
        this.labelsLayer.removeChildren();
        console.log("[Render] Forced rebuild of all tile views");
    }

    renderAll() {
        // Clear context menu layer (controls are re-added each frame)
        this.contextMenuLayer.removeChildren();
        
        this.renderBoard();
        this.renderLabels();
        this.renderRotationIndicators(); // После board, перед players (НЕ кликабельные)
        this.renderPlayers();
        this.renderHeroBoard();
        this.renderEventLog();
        this.renderDeckInfo(); // NEW: UI колоды
        this.renderHUD();
        
        // v0.6: New HUD elements
        this.renderTopStatusBar();
        this.renderCombatSummary();
        this.renderContextHints();
        
        this.renderBuildMenu(); // BUILD MENU modal
        this.renderCraftMenu(); // v0.5: CRAFT MENU modal
        this.renderFinalPhaseBanner(); // v0.5: Final Phase banner
        this.renderDebugPanel(); // Debug Panel
        this.checkPendingTokenRewards(); // Token reward UI
        this.renderSettingsMenu(); // Settings popup
        
        // Check and show tutorial hints
        this.checkTutorialHints();
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
            case TileType.LandingHub:
                return 0x9a7440; // Bronze/gold for hub
            case TileType.Resource:
                return 0x4a9158; // Green for resources
            case TileType.StartingSector:
                return 0x3a6a8a; // Blue-teal for starting sectors
            case TileType.Base:
                return 0x5a5a9a; // Purple for player base
            case TileType.Empty:
            default:
                return 0x425262;
        }
    }

    private getAllowedHexKeys(): Set<string> {
        const current = this.game.state.players[this.game.state.currentPlayerIndex];
        const allowed = [hexKey(current.position)];

        // По правилам Karak 2: Movement разрешён только ПЕРЕД action (не после)
        if (!this.game.state.actionUsedInCurrentSlot) {
            // NEW: Только соседи где ЕСТЬ тайл (не fog!)
            const validNeighbors = neighbors(current.position).filter(coord => {
                const tile = this.game.state.board.getTile(coord);
                return tile !== undefined; // Тайл должен существовать
            });
            allowed.push(...validNeighbors.map(hexKey));
        }

        return new Set<string>(allowed);
    }

    private canGatherHere(): boolean {
        if (this.game.state.actionPoints <= 0) return false;

        const p = this.game.state.players[this.game.state.currentPlayerIndex];
        const here = this.game.state.board.getTile(p.position);

        if (!here) return false;
        if (!here.discovered) return false;
        // Can gather on Resource tiles or StartingSector (player's home zone)
        if (here.type !== TileType.Resource && here.type !== TileType.StartingSector) return false;
        if (here.encounterActive === true) return false;
        
        // Can't gather on tiles with someone's Base built!
        if (here.ownerId) return false;
        
        // Check resources
        const hasResources = here.resources && Object.keys(here.resources).length > 0;
        if (!hasResources) return false;

        const cooldown = here.cooldownUntilRoundByPlayer?.[p.id] ?? 0;
        return cooldown <= this.game.state.round;
    }

    // --------------------
    // Base (player's base)
    // --------------------
    private drawBase(view: PIXI.Graphics, ownerId: string) {
        // Получаем индекс игрока из ownerId (P1 -> 0, P2 -> 1, etc)
        const playerIndex = parseInt(ownerId.replace("P", "")) - 1;
        const color = this.PLAYER_COLORS[playerIndex] || 0xffffff;
        
        // Толстая рамка цвета игрока
        view.poly(this.HEX_POINTS);
        view.stroke({ color, width: 6, alpha: 0.9 });
        
        // Внутренний круг с иконкой города
        view.circle(0, 0, 18);
        view.fill({ color: 0x2d3748, alpha: 0.9 });
        view.circle(0, 0, 18);
        view.stroke({ color, width: 3, alpha: 1 });
    }

    // --------------------
    // Mountains (blocked edges)
    // --------------------
    private drawMountains(view: PIXI.Graphics, blockedEdges: number[]) {
        // Рисуем темные толстые линии на заблокированных гранях
        // Используем единую систему нумерации из HexEdges.ts
        for (const edge of blockedEdges) {
            const [x1, y1, x2, y2] = getEdgeVertices(edge as EdgeIndex, this.HEX_SIZE);
            
            // Рисуем толстую темную линию (горы)
            view.moveTo(x1, y1);
            view.lineTo(x2, y2);
            view.stroke({ color: 0x2d3748, width: 8, alpha: 1 }); // Темно-серый
            
            // Внутренняя линия для объема
            view.moveTo(x1, y1);
            view.lineTo(x2, y2);
            view.stroke({ color: 0x1a202c, width: 4, alpha: 1 }); // Еще темнее
        }
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
        this.applyTransform(); // Применяем zoom/pan
        const allowed = this.getAllowedHexKeys();

        const current = this.game.state.players[this.game.state.currentPlayerIndex];

        const placementTargets = new Set<string>();
        const gatherHere = this.canGatherHere();

        // TILE_PLACEMENT: показываем валидные позиции (только соседи текущей позиции игрока!)
        if (this.game.state.uiMode === "TILE_PLACEMENT") {
            const validPositions = this.getValidPlacementPositions();
            for (const coord of validPositions) {
                placementTargets.add(hexKey(coord));
            }
        }

        // Clean up views for tiles that no longer exist in board (server sync)
        // BUT keep fog tile views (they're created dynamically in renderFogTilesAroundPlayer)
        const allTiles = this.game.state.board.getAllTiles();
        const currentTileKeys = new Set(allTiles.map(t => hexKey(t.coord)));
        
        // Get fog tile keys (neighbors of all discovered tiles that don't exist in board)
        const fogKeys = new Set<string>();
        for (const tile of allTiles) {
            if (tile.discovered) {
                for (const neighbor of neighbors(tile.coord)) {
                    const nKey = hexKey(neighbor);
                    if (!currentTileKeys.has(nKey)) {
                        fogKeys.add(nKey);
                    }
                }
            }
        }
        
        let removedViews = 0;
        for (const [key, view] of this.tileViews) {
            // Don't remove if it's a valid tile OR a valid fog tile
            if (!currentTileKeys.has(key) && !fogKeys.has(key)) {
                this.boardLayer.removeChild(view);
                this.tileViews.delete(key);
                removedViews++;
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
                this.tileViews.set(key, view);
                this.boardLayer.addChildAt(view, 0);
            } else {
                // Если view существует (был ghost hex), убираем все старые обработчики
                view.removeAllListeners();
            }

            // Устанавливаем правильные обработчики для РЕАЛЬНОГО тайла
            // Multiplayer: только если мой ход
            view.eventMode = this.isMyTurn ? "static" : "none";
            view.cursor = this.isMyTurn ? "pointer" : "default";

                view.on("pointerdown", () => {
                if (!this.isMyTurn) return;
                // Show context menu on tile instead of direct action
                this.showContextMenu(tile.coord);
                });

                view.on("pointerover", () => {
                if (!this.isMyTurn) return;
                    this.hoveredKey = key;
                    this.renderBoard();
                    this.renderLabels();
                });

                view.on("pointerout", () => {
                    if (this.hoveredKey === key) this.hoveredKey = null;
                    this.renderBoard();
                    this.renderLabels();
                });

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

            // gather highlight: только текущая клетка (если можно собирать)
            if (gatherHere && key === hexKey(current.position)) {
                view.stroke({ color: 0x00ff88, width: 4, alpha: 0.65 });
            }

            // Рисуем горы (blocked edges)
            if (tile.discovered && tile.blockedEdges && tile.blockedEdges.length > 0) {
                this.drawMountains(view, tile.blockedEdges);
            }
            
            // Draw Base if exists
            if (tile.ownerId) {
                this.drawBase(view, tile.ownerId);
            }

            this.drawHoverOverlay(key, x, y, this.hoveredKey === key);
        }

        // TILE_PLACEMENT: рисуем ghost hexes для валидных позиций (пустых слотов)
        // Сначала скрываем ВСЕ ghost hexes (если нет реального тайла)
        for (const [key, view] of this.tileViews) {
            const [q, r] = key.split(",").map(Number);
            const tile = this.game.state.board.getTile({ q, r });
            if (!tile) {
                // Это ghost hex - скрываем по умолчанию
                view.visible = false;
            }
        }

        // Очищаем preview layer перед рендером
        this.ghostPreviewLayer.removeChildren();
        
        // Показываем ghost hexes только для активного игрока
        if (this.game.state.uiMode === "TILE_PLACEMENT" && this.isMyTurn) {
            // Получаем ВСЕ позиции (включая заблокированные)
            const allPositions = this.getAllPlacementPositions();
            
            // Если позиция уже выбрана, показываем только её
            const hasSelectedPosition = this.game.state.selectedPlacementPosition !== null;
            
            for (const { coord, blocked } of allPositions) {
                const targetKey = hexKey(coord);

                // Проверяем выбрана ли эта позиция
                const isSelected = this.game.state.selectedPlacementPosition 
                    && this.game.state.selectedPlacementPosition.q === coord.q 
                    && this.game.state.selectedPlacementPosition.r === coord.r;

                // Если есть выбранная позиция и это не она - скрываем
                if (hasSelectedPosition && !isSelected) {
                    const ghostView = this.tileViews.get(targetKey);
                    if (ghostView) {
                        ghostView.visible = false;
                    }
                    continue;
                }

                let ghostView = this.tileViews.get(targetKey);
                if (!ghostView) {
                    ghostView = new PIXI.Graphics();
                    ghostView.hitArea = new PIXI.Polygon(this.HEX_POINTS);
                    this.tileViews.set(targetKey, ghostView);
                    this.boardLayer.addChildAt(ghostView, 0);
                }
                
                // Multiplayer: только если мой ход
                ghostView.eventMode = this.isMyTurn ? "static" : "none";
                ghostView.cursor = blocked ? "not-allowed" : "pointer";
                ghostView.removeAllListeners();

                // Hover для выбора позиции (только если не заблокировано)
                ghostView.on("pointerover", () => {
                    if (!this.isMyTurn) return;
                    // Выбираем позицию даже если заблокирована (чтобы показать preview)
                    this.game.selectPlacementPosition(coord);
                    this.renderAll();
                });

                ghostView.on("pointerout", () => {
                    // Не сбрасываем сразу, только при выходе за все ghost hexes
                });

                const { x, y } = this.hexToPixel(coord);
                ghostView.position.set(x, y);
                ghostView.visible = true;

                ghostView.clear();
                ghostView.poly(this.HEX_POINTS);
                
                // Цвет зависит от состояния: заблокированный = красный, выбран = зеленый, обычный = голубой
                let fillColor = 0x00ffff;
                let strokeColor = 0x00ffff;
                let alpha = 0.15;
                
                if (blocked) {
                    fillColor = 0xff4444;
                    strokeColor = 0xff4444;
                    alpha = 0.2;
                } else if (isSelected) {
                    fillColor = 0x00ff00;
                    strokeColor = 0x00ff00;
                    alpha = 0.25;
                }
                
                ghostView.fill({ color: fillColor, alpha });
                ghostView.stroke({ color: strokeColor, width: isSelected ? 6 : 4, alpha: 1 });

                // PREVIEW: Показываем что будет на тайле
                const nextTile = this.game.state.tileDeck.peekNextTile();
                if (nextTile) {
                    // Показываем горы (с учетом rotation)
                    if (nextTile.blockedEdges && nextTile.blockedEdges.length > 0) {
                        const rotatedEdges = nextTile.blockedEdges.map(
                            edge => (edge + this.game.state.pendingTileRotation) % 6
                        );
                        this.drawMountains(ghostView, rotatedEdges);
                    }

                    // Показываем ресурсы (эмодзи) - В ОТДЕЛЬНОМ LAYER!
                    const resourceEmojis: string[] = [];
                    if (nextTile.resources.biomass) resourceEmojis.push("🧬".repeat(nextTile.resources.biomass));
                    if (nextTile.resources.materials) resourceEmojis.push("🧱".repeat(nextTile.resources.materials));
                    if (nextTile.resources.alloys) resourceEmojis.push("⚙".repeat(nextTile.resources.alloys));
                    
                    if (resourceEmojis.length > 0) {
                        const previewText = new PIXI.Text({
                            text: resourceEmojis.join(" "),
                            style: new PIXI.TextStyle({
                                fontSize: 20,
                                fill: 0xffffff,
                                fontWeight: "700",
                                dropShadow: {
                                    alpha: 0.8,
                                    angle: 90,
                                    blur: 3,
                                    color: 0x000000,
                                    distance: 2,
                                },
                            }),
                        });
                        previewText.anchor.set(0.5);
                        previewText.position.set(x, y - 10); // Абсолютные координаты
                        this.ghostPreviewLayer.addChild(previewText);
                    }

                    // Показываем tier - В ОТДЕЛЬНОМ LAYER!
                    const tierText = new PIXI.Text({
                        text: `T${nextTile.tier}`,
                        style: new PIXI.TextStyle({
                            fontSize: 12,
                            fill: blocked ? 0xff6666 : 0x00ffff,
                            fontWeight: "600",
                        }),
                    });
                    tierText.anchor.set(0.5);
                    tierText.position.set(x, y + 15); // Абсолютные координаты
                    this.ghostPreviewLayer.addChild(tierText);
                    
                    // Показываем "BLOCKED" если заблокировано
                    if (blocked) {
                        const blockedText = new PIXI.Text({
                            text: "🚫 ROTATE",
                            style: new PIXI.TextStyle({
                                fontSize: 11,
                                fill: 0xff6666,
                                fontWeight: "700",
                            }),
                        });
                        blockedText.anchor.set(0.5);
                        blockedText.position.set(x, y + 30);
                        this.ghostPreviewLayer.addChild(blockedText);
                    }
                }

                // Show rotate/place controls below selected ghost tile
                if (isSelected) {
                    this.renderTilePlacementControls(x, y, blocked);
                }

                ghostView.visible = true;
            }
        }

        // Render fog tiles around player (for exploration selection - always visible)
        if (this.game.state.uiMode !== "TILE_PLACEMENT") {
            this.renderFogTilesAroundPlayer();
        }
    }

    // Show clickable fog tiles around the player for exploration
    private renderFogTilesAroundPlayer(): void {
        if (!this.isMyTurn) return;
        if (this.game.state.actionPoints < 1) return;
        if (this.game.state.actionUsedInCurrentSlot) return;
        // Don't show fog tiles if deck is empty
        if (this.game.state.tileDeck.getRemainingCount() <= 0) return;
        
        const player = this.game.state.players[this.game.state.currentPlayerIndex];
        const playerNeighbors = neighbors(player.position);
        
        for (const coord of playerNeighbors) {
            const existing = this.game.state.board.getTile(coord);
            
            // Skip if tile already exists
            if (existing) continue;
            
            // Check if player can move there (no mountain blocking from player's tile)
            const playerTile = this.game.state.board.getTile(player.position);
            if (playerTile && !canMoveBetween(playerTile, coord, null)) {
                continue;
            }
            
            const key = hexKey(coord);
            let fogView = this.tileViews.get(key);
            
            if (!fogView) {
                fogView = new PIXI.Graphics();
                fogView.hitArea = new PIXI.Polygon(this.HEX_POINTS);
                this.tileViews.set(key, fogView);
                this.boardLayer.addChild(fogView);
            }
            
            fogView.removeAllListeners();
            fogView.eventMode = "static";
            fogView.cursor = "pointer";
            
            fogView.on("pointerdown", () => {
                if (!this.isMyTurn) return;
                this.showContextMenu(coord);
            });
            
            fogView.on("pointerover", () => {
                if (!this.isMyTurn) return;
                this.hoveredKey = key;
                fogView!.clear();
                fogView!.poly(this.HEX_POINTS);
                fogView!.fill({ color: 0x4a90d9, alpha: 0.3 });
                fogView!.stroke({ color: 0x4a90d9, width: 3, alpha: 1 });
                
                // Show "?" icon
                const { x, y } = this.hexToPixel(coord);
                const questionMark = new PIXI.Text({
                    text: "🔭",
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                questionMark.anchor.set(0.5);
                questionMark.position.set(x, y);
                questionMark.name = "fogIcon";
                this.ghostPreviewLayer.addChild(questionMark);
            });
            
            fogView.on("pointerout", () => {
                if (this.hoveredKey === key) this.hoveredKey = null;
                fogView!.clear();
                fogView!.poly(this.HEX_POINTS);
                fogView!.fill({ color: 0x2a2a4a, alpha: 0.4 });
                fogView!.stroke({ color: 0x4a4a6a, width: 2, alpha: 0.6 });
                
                // Remove fog icon
                const icon = this.ghostPreviewLayer.getChildByName("fogIcon");
                if (icon) this.ghostPreviewLayer.removeChild(icon);
            });
            
            const { x, y } = this.hexToPixel(coord);
            fogView.position.set(x, y);
            
            fogView.clear();
            fogView.poly(this.HEX_POINTS);
            fogView.fill({ color: 0x2a2a4a, alpha: 0.4 });
            fogView.stroke({ color: 0x4a4a6a, width: 2, alpha: 0.6 });
            fogView.visible = true;
        }
    }

    // --------------------
    // Labels (dev overlay)
    // --------------------
    private getTileLabel(tile: any): string {
        // DEV: показываем tier для неоткрытых тайлов
        if (!tile.discovered && tile.tier) {
            return `T${tile.tier}`;
        }

        if (!tile.discovered) return "";

        // Landing Hub (shared trading hub)
        if (tile.type === TileType.LandingHub) return "🚀 Hub";
        
        // Starting Sector (player's home zone, NOT a base)
        // Show player ID + resource
        if (tile.type === TileType.StartingSector) {
            const playerId = tile.sectorPlayerId || "?";
            let resourceEmoji = "";
            if (tile.resources) {
                if (tile.resources.biomass) resourceEmoji = "🧬";
                else if (tile.resources.materials) resourceEmoji = "🧱";
                else if (tile.resources.alloys) resourceEmoji = "⚙";
            }
            return `🏠${playerId}\n${resourceEmoji}`;
        }
        
        // Player's Base (built structure)
        if (tile.type === TileType.Base && tile.ownerId) {
            return `🏰 ${tile.ownerId}`;
        }

        // Show resources first (always if tile has them)
        const emojis: string[] = [];
        
        // Risky tile indicator (v0.4)
        if (tile.riskyEffect) {
            const riskyMap: Record<string, string> = {
                toxic: "☣",
                unstable: "⚡",
                rift: "🌪",
            };
            const riskyEmoji = riskyMap[tile.riskyEffect];
            if (riskyEmoji) emojis.push(riskyEmoji);
        }
        
        if (tile.resources) {
            const res = tile.resources;
            if (res.biomass && res.biomass > 0) emojis.push("🧬".repeat(res.biomass));
            if (res.materials && res.materials > 0) emojis.push("🧱".repeat(res.materials));
            if (res.alloys && res.alloys > 0) emojis.push("⚙".repeat(res.alloys));
        }

        // If monster is alive, show TIER and required swords
        if (tile.encounterActive) {
            const tier = tile.monsterTier ?? 1;
            const player = this.game.state.players[this.game.state.currentPlayerIndex];
            const hasPrestigePenalty = player.prestige >= 12;
            const required = hasPrestigePenalty ? tier + 1 : tier;
            
            // Show: 👹T2 (need 2⚔) or 👹T2+1 (need 3⚔) if prestige penalty
            if (hasPrestigePenalty) {
                emojis.push(`👹T${tier}+1=${required}⚔`);
            } else {
                emojis.push(`👹T${tier}=${required}⚔`);
            }
        }

        return emojis.join(" ");
    }

    private renderLabels() {
        // Clear all existing labels and recreate
        // This ensures labels are always in sync with tile data
        this.labelsLayer.removeChildren();
        this.tileLabels.clear();
        
        const allTiles = this.game.state.board.getAllTiles();
        
        for (const tile of allTiles) {
            const key = hexKey(tile.coord);
            const text = this.getTileLabel(tile);
            
            if (!text) continue; // Skip empty labels

            const label = new PIXI.Text({
                text: text,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0xffffff,
                    fontWeight: "700",
                }),
            });
            label.anchor.set(0.5);
            label.eventMode = "none";
            
            const { x, y } = this.hexToPixel(tile.coord);
            label.position.set(x, y);
            
            this.tileLabels.set(key, label);
            this.labelsLayer.addChild(label);
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
        // Position уже синхронизирован через applyTransform()

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
    // Rotation Indicators (НЕ кликабельные маркеры на ghost hexes)
    // --------------------
    private renderRotationIndicators() {
        this.rotationIndicatorsLayer.removeChildren(); // Очищаем перед перерисовкой

        // Рисуем индикаторы только в режиме TILE_PLACEMENT и только для активного игрока
        if (this.game.state.uiMode !== "TILE_PLACEMENT") return;
        if (!this.isMyTurn) return; // Не показывать другим игрокам

        // Если позиция уже выбрана - не показываем точки (они не нужны)
        if (this.game.state.selectedPlacementPosition !== null) return;

        // Получаем валидные позиции с учетом blocked edges
        const validPositions = this.getValidPlacementPositions();

        const rotation = this.game.state.pendingTileRotation; // 0-5
        const angle = (rotation * 60) * (Math.PI / 180); // 0°, 60°, 120°, ...
        const markerDist = this.HEX_SIZE - 10; // радиус от центра гекса
        const markerRadius = 14; // УВЕЛИЧЕННЫЙ радиус точки

        for (const coord of validPositions) {
            const { x, y } = this.hexToPixel(coord);

            const markerX = Math.cos(angle - Math.PI / 2) * markerDist;
            const markerY = Math.sin(angle - Math.PI / 2) * markerDist;

            const indicator = new PIXI.Graphics();
            indicator.eventMode = "none"; // НЕ кликабельный!
            indicator.position.set(x + markerX, y + markerY);

            // Рисуем большую яркую точку с обводкой
            indicator.circle(0, 0, markerRadius);
            indicator.fill({ color: 0xff6600, alpha: 1 });
            indicator.stroke({ color: 0xffffff, width: 3, alpha: 1 });

            this.rotationIndicatorsLayer.addChild(indicator);
        }
    }
    
    /**
     * Получить все соседние позиции для размещения тайла
     * Возвращает позиции с флагом blocked
     */
    private getAllPlacementPositions(): Array<{ coord: HexCoord; blocked: boolean }> {
        const current = this.game.state.players[this.game.state.currentPlayerIndex];
        const currentTile = this.game.state.board.getTile(current.position);
        const nextTile = this.game.state.tileDeck.peekNextTile();
        
        if (!currentTile || !nextTile) return [];
        
        const positions: Array<{ coord: HexCoord; blocked: boolean }> = [];
        
        for (const neighborCoord of neighbors(current.position)) {
            const existing = this.game.state.board.getTile(neighborCoord);
            if (existing) continue; // Уже есть тайл
            
            // Применяем rotation к blocked edges
            const rotatedEdges = nextTile.blockedEdges && nextTile.blockedEdges.length > 0
                ? nextTile.blockedEdges.map(edge => (edge + this.game.state.pendingTileRotation) % 6)
                : [];
            
            // Создаем временный тайл для проверки
            const tempTile: Tile = {
                coord: neighborCoord,
                discovered: true,
                type: TileType.Resource,
                blockedEdges: rotatedEdges,
            };
            
            // Проверяем можно ли зайти
            const blocked = !canMoveBetween(currentTile, neighborCoord, tempTile);
            
            positions.push({ coord: neighborCoord, blocked });
        }
        
        return positions;
    }

    /**
     * Получить только валидные позиции (без заблокированных)
     */
    private getValidPlacementPositions(): HexCoord[] {
        return this.getAllPlacementPositions()
            .filter(p => !p.blocked)
            .map(p => p.coord);
    }

    // --------------------
    // HUD + Buttons
    // --------------------
    // Action buttons removed - now using context menu on tiles

    private createRotateButton() {
        const { bg, label } = this.rotateButton;
        bg.eventMode = "static";
        bg.cursor = "pointer";
        label.anchor.set(0.5);
        label.eventMode = "none";

        bg.on("pointerdown", () => {
            if (!this.isMyTurn) return;
            if (this.game.state.uiMode !== "TILE_PLACEMENT") return;
            this.game.rotatePendingTile();
            this.renderAll();
        });

        this.hudLayer.addChild(bg);
        this.hudLayer.addChild(label);
    }

    private createPlaceTileButton() {
        const { bg, label } = this.placeTileButton;
        bg.eventMode = "static";
        bg.cursor = "pointer";
        label.anchor.set(0.5);
        label.eventMode = "none";

        bg.on("pointerdown", () => {
            if (!this.isMyTurn) return;
            if (this.game.state.uiMode !== "TILE_PLACEMENT") return;
            if (!this.game.state.selectedPlacementPosition) return;
            this.game.placeTileAtSelected();
            this.renderAll();
        });

        this.hudLayer.addChild(bg);
        this.hudLayer.addChild(label);
    }

    private renderHUD() {
        // v0.6: Old HUD removed - replaced by Top Status Bar
        // All info now in: Top Status Bar + Combat Summary + Hero Board
        
        // Hide old HUD background and text
        this.hudBg.visible = false;
        this.hudText.visible = false;

        // Hide old HUD buttons (now using on-tile controls)
        this.rotateButton.bg.visible = false;
        this.rotateButton.label.visible = false;
        this.placeTileButton.bg.visible = false;
        this.placeTileButton.label.visible = false;
    }

    // --------------------
    // v0.6: TOP STATUS BAR - Game Phase + Turn Context
    // --------------------
    private renderTopStatusBar() {
        this.topStatusLayer.removeChildren();
        
        const w = this.app.renderer.width;
        const h = 56;
        const p = this.game.state.players[this.game.state.currentPlayerIndex];
        
        // Background bar
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x0d1117, alpha: 0.98 });
        this.topStatusLayer.addChild(bg);
        
        // ═══════════════════════════════════════
        // CENTER: PHASE INDICATOR
        // ═══════════════════════════════════════
        let phaseText = "";
        let phaseColor = 0x00ff88;
        let phaseBgColor = 0x0a2a1a;
        let tilesRemaining = 0;
        let totalTiles = 31;
        let showTilesBar = false;
        
        if (this.game.state.gameOver) {
            if (this.game.state.missionFailed) {
                phaseText = "💀 MISSION FAILED";
                phaseColor = 0xff4444;
                phaseBgColor = 0x3a1a1a;
            } else {
                phaseText = "🏆 VICTORY";
                phaseColor = 0xffd700;
                phaseBgColor = 0x3a3a1a;
            }
        } else if (this.game.state.finalTrialStarted) {
            phaseText = "⚡ FINAL TRIAL";
            phaseColor = 0xff6b6b;
            phaseBgColor = 0x3a1a2a;
        } else if (this.game.state.isFinalPreparation) {
            phaseText = `🔧 ORBITAL • ${this.game.state.finalPrepRoundsLeft} rounds`;
            phaseColor = 0xffaa00;
            phaseBgColor = 0x3a2a1a;
        } else if (this.game.state.isFinalPhase) {
            phaseText = `🚨 FINAL • ${this.game.state.finalRoundsLeft} rounds`;
            phaseColor = 0xff4444;
            phaseBgColor = 0x3a1a1a;
        } else {
            phaseText = "🔍 EXPLORATION";
            phaseColor = 0x00ff88;
            phaseBgColor = 0x0a2a1a;
            tilesRemaining = this.game.state.tileDeck.getRemainingCount();
            showTilesBar = true;
        }
        
        // Phase plate
        const plateW = 280;
        const plateH = 44;
        const plateX = (w - plateW) / 2;
        const plateY = 6;
        
        const phasePlate = new PIXI.Graphics();
        phasePlate.roundRect(plateX, plateY, plateW, plateH, 10);
        phasePlate.fill({ color: phaseBgColor, alpha: 1 });
        phasePlate.stroke({ color: phaseColor, width: 2, alpha: 0.8 });
        this.topStatusLayer.addChild(phasePlate);
        
        // Phase text - BIGGER
        const phaseLabel = new PIXI.Text({
            text: phaseText,
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: phaseColor,
                fontWeight: "900",
                letterSpacing: 2,
                dropShadow: { color: phaseColor, blur: 12, alpha: 0.7, distance: 0 },
            }),
        });
        phaseLabel.anchor.set(0.5);
        phaseLabel.position.set(w / 2, showTilesBar ? plateY + 13 : plateY + plateH / 2);
        this.topStatusLayer.addChild(phaseLabel);
        
        // Tiles progress bar - MORE VISIBLE!
        if (showTilesBar) {
            const barW = plateW - 20;
            const barH = 16;
            const barX = plateX + 10;
            const barY = plateY + 26;
            
            // Bar background - darker for contrast
            const tilesBarBg = new PIXI.Graphics();
            tilesBarBg.roundRect(barX, barY, barW, barH, 6);
            tilesBarBg.fill({ color: 0x0a0f1a });
            tilesBarBg.stroke({ color: 0x00d4ff, width: 2, alpha: 0.6 });
            this.topStatusLayer.addChild(tilesBarBg);
            
            // Bar fill
            const fillRatio = tilesRemaining / totalTiles;
            const fillW = Math.max(barW * fillRatio, 4);
            
            // Cyan default, yellow/red when low
            let fillColor = 0x00d4ff;
            if (fillRatio < 0.25) fillColor = 0xff4444;
            else if (fillRatio < 0.5) fillColor = 0xffaa00;
            
            const tilesBarFill = new PIXI.Graphics();
            tilesBarFill.roundRect(barX + 2, barY + 2, fillW - 4, barH - 4, 4);
            tilesBarFill.fill({ color: fillColor });
            this.topStatusLayer.addChild(tilesBarFill);
            
            // Tiles count - OUTSIDE the bar, very visible
            const tilesText = new PIXI.Text({
                text: `${tilesRemaining}`,
                style: new PIXI.TextStyle({ 
                    fontSize: 14, 
                    fill: 0x00d4ff, 
                    fontWeight: "900",
                }),
            });
            tilesText.anchor.set(0.5);
            tilesText.position.set(plateX + plateW / 2, barY + barH / 2);
            this.topStatusLayer.addChild(tilesText);
        }
        
        // ═══════════════════════════════════════
        // LEFT: TURN + AP
        // ═══════════════════════════════════════
        const isMyTurn = this.isMyTurn;
        const turnText = isMyTurn ? "YOUR TURN" : `${p.id}'s TURN`;
        const turnColor = isMyTurn ? 0x00ff88 : 0xffaa00;
        
        const turnLabel = new PIXI.Text({
            text: turnText,
            style: new PIXI.TextStyle({ fontSize: 18, fill: turnColor, fontWeight: "800" }),
        });
        turnLabel.position.set(16, 8);
        this.topStatusLayer.addChild(turnLabel);
        
        const roundLabel = new PIXI.Text({
            text: `Round ${this.game.state.round}`,
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0x8b949e }),
        });
        roundLabel.position.set(16, 30);
        this.topStatusLayer.addChild(roundLabel);
        
        // AP dots - with spacing from turn text
        const apX = 160;
        for (let i = 0; i < 2; i++) {
            const dot = new PIXI.Graphics();
            const filled = i < this.game.state.actionPoints;
            dot.circle(apX + i * 28, 24, 10);
            
            if (filled) {
                dot.fill({ color: 0x00ff88 });
                dot.stroke({ color: 0x00aa55, width: 2 });
            } else {
                dot.fill({ color: 0x21262d });
                dot.stroke({ color: 0x484f58, width: 2 });
            }
            this.topStatusLayer.addChild(dot);
        }
        
        const apLabel = new PIXI.Text({
            text: "AP",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e }),
        });
        apLabel.anchor.set(0.5);
        apLabel.position.set(apX + 14, 42);
        this.topStatusLayer.addChild(apLabel);
        
        // ═══════════════════════════════════════
        // RIGHT: Player indicator only (no resources - they're in Hero Board)
        // ═══════════════════════════════════════
        const myPlayer = this.game.state.players[this.myPlayerIndex];
        const playerColor = this.PLAYER_COLORS[this.myPlayerIndex % this.PLAYER_COLORS.length];
        
        const playerLabel = new PIXI.Text({
            text: myPlayer.id,
            style: new PIXI.TextStyle({ 
                fontSize: 22, 
                fill: playerColor, 
                fontWeight: "900",
            }),
        });
        playerLabel.anchor.set(1, 0.5);
        playerLabel.position.set(w - 70, h / 2);
        this.topStatusLayer.addChild(playerLabel);

        // Settings button
        const settingsBtn = new PIXI.Container();
        const settingsBg = new PIXI.Graphics();
        settingsBg.roundRect(0, 0, 32, 32, 8);
        settingsBg.fill({ color: 0x21262d, alpha: 0.95 });
        settingsBg.stroke({ color: 0x4a90d9, width: 2, alpha: 0.8 });
        
        const settingsIcon = new PIXI.Text({
            text: "⚙️",
            style: new PIXI.TextStyle({ fontSize: 16 }),
        });
        settingsIcon.anchor.set(0.5);
        settingsIcon.position.set(16, 16);
        settingsIcon.eventMode = "none";
        
        settingsBtn.addChild(settingsBg);
        settingsBtn.addChild(settingsIcon);
        settingsBtn.position.set(w - 50, 12);
        settingsBtn.eventMode = "static";
        settingsBtn.cursor = "pointer";
        settingsBtn.on("pointerdown", () => {
            this.settingsVisible = !this.settingsVisible;
            this.renderAll();
        });
        
        settingsBtn.on("pointerover", () => {
            settingsBg.clear();
            settingsBg.roundRect(0, 0, 32, 32, 8);
            settingsBg.fill({ color: 0x30363d, alpha: 0.95 });
            settingsBg.stroke({ color: 0x6cb2ff, width: 2 });
        });
        settingsBtn.on("pointerout", () => {
            settingsBg.clear();
            settingsBg.roundRect(0, 0, 32, 32, 8);
            settingsBg.fill({ color: 0x21262d, alpha: 0.95 });
            settingsBg.stroke({ color: 0x4a90d9, width: 2, alpha: 0.8 });
        });
        
        this.topStatusLayer.addChild(settingsBtn);
    }

    // --------------------
    // v0.6: COMBAT SUMMARY PANEL - Left Side (Simplified)
    // --------------------
    private renderCombatSummary() {
        this.combatSummaryLayer.removeChildren();
        
        const myPlayer = this.game.state.players[this.myPlayerIndex];
        if (!myPlayer) return;
        
        const panelW = 170;
        const panelH = 200;
        const panelX = 16;
        const panelY = 70; // Below top status bar
        
        // Calculate static combat bonuses
        const bonuses = this.calculateStaticCombatBonuses(myPlayer);
        const total = 1 + bonuses.units + bonuses.modules + bonuses.weapons + bonuses.race;
        
        // Check if player is near a monster to determine context color
        const myTile = this.game.state.board.getTile(myPlayer.position);
        const monsterTier = myTile?.monsterTier && myTile.encounterActive ? myTile.monsterTier : 0;
        const canBeat = monsterTier > 0 && total >= monsterTier;
        const nearMonster = monsterTier > 0;
        
        // Border color based on context
        let borderColor = 0xffd700; // Default gold
        if (nearMonster) {
            borderColor = canBeat ? 0x00ff88 : 0xff4444;
        }
        
        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x0d1117, alpha: 0.96 });
        bg.stroke({ color: borderColor, width: 3 });
        this.combatSummaryLayer.addChild(bg);
        
        // Header
        const header = new PIXI.Text({
            text: "⚔ POWER",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: borderColor,
                fontWeight: "800",
                letterSpacing: 1,
            }),
        });
        header.anchor.set(0.5, 0);
        header.position.set(panelX + panelW / 2, panelY + 10);
        this.combatSummaryLayer.addChild(header);
        
        // Large total display
        const totalColor = nearMonster ? (canBeat ? 0x00ff88 : 0xff4444) : 0x00ff88;
        const totalLabel = new PIXI.Text({
            text: `${total}`,
            style: new PIXI.TextStyle({
                fontSize: 48,
                fill: totalColor,
                fontWeight: "900",
                dropShadow: { color: totalColor, blur: 10, alpha: 0.5, distance: 0 },
            }),
        });
        totalLabel.anchor.set(0.5);
        totalLabel.position.set(panelX + panelW / 2, panelY + 58);
        this.combatSummaryLayer.addChild(totalLabel);
        
        // Breakdown section
        let y = panelY + 95;
        const leftX = panelX + 12;
        const rightX = panelX + panelW - 12;
        
        // Divider
        const divider = new PIXI.Graphics();
        divider.rect(panelX + 10, y - 5, panelW - 20, 1);
        divider.fill({ color: 0x30363d });
        this.combatSummaryLayer.addChild(divider);
        
        // Breakdown items
        const breakdownItems = [
            { label: "Base", value: 1, color: 0x8b949e },
        ];
        if (bonuses.units > 0) breakdownItems.push({ label: "Units", value: bonuses.units, color: 0x3b82f6 });
        if (bonuses.weapons > 0) breakdownItems.push({ label: "Gear", value: bonuses.weapons, color: 0xffd700 });
        if (bonuses.modules > 0) breakdownItems.push({ label: "Mods", value: bonuses.modules, color: 0x60a5fa });
        if (bonuses.race > 0) breakdownItems.push({ label: "Race", value: bonuses.race, color: 0x00ff88 });
        
        for (const item of breakdownItems) {
            const labelText = new PIXI.Text({
                text: item.label,
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e }),
            });
            labelText.position.set(leftX, y);
            this.combatSummaryLayer.addChild(labelText);
            
            const valueText = new PIXI.Text({
                text: item.value === 1 && item.label === "Base" ? "1" : `+${item.value}`,
                style: new PIXI.TextStyle({ fontSize: 11, fill: item.color, fontWeight: "700" }),
            });
            valueText.anchor.set(1, 0);
            valueText.position.set(rightX, y);
            this.combatSummaryLayer.addChild(valueText);
            
            y += 16;
        }
        
        // Bottom: Reroll + Defense
        y = panelY + panelH - 26;
        const infoItems: string[] = [];
        if (bonuses.hasReroll) infoItems.push("🎲");
        if (bonuses.skullReduction > 0) infoItems.push(`🛡️${bonuses.skullReduction}`);
        
        if (infoItems.length > 0) {
            const infoRow = new PIXI.Text({
                text: infoItems.join("  "),
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0x8b949e }),
            });
            infoRow.anchor.set(0.5, 0);
            infoRow.position.set(panelX + panelW / 2, y);
            this.combatSummaryLayer.addChild(infoRow);
        }
        
        // Context hint when near monster
        if (nearMonster) {
            const hintText = canBeat ? `✓ Can beat T${monsterTier}` : `✗ Need ${monsterTier - total} more`;
            const hint = new PIXI.Text({
                text: hintText,
                style: new PIXI.TextStyle({ 
                    fontSize: 10, 
                    fill: canBeat ? 0x00ff88 : 0xff6b6b,
                    fontWeight: "600",
                }),
            });
            hint.anchor.set(0.5, 0);
            hint.position.set(panelX + panelW / 2, panelY + panelH - 12);
            this.combatSummaryLayer.addChild(hint);
        }
    }
    
    public addCombatLine(label: string, value: string, color: number, panelX: number, y: number) {
        const labelText = new PIXI.Text({
            text: label,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x8b949e }),
        });
        labelText.position.set(panelX + 12, y);
        this.combatSummaryLayer.addChild(labelText);
        
        const valueText = new PIXI.Text({
            text: value,
            style: new PIXI.TextStyle({ fontSize: 12, fill: color, fontWeight: "600" }),
        });
        valueText.anchor.set(1, 0);
        valueText.position.set(panelX + 188, y);
        this.combatSummaryLayer.addChild(valueText);
    }
    
    private calculateStaticCombatBonuses(player: import("../entities/Player").Player): {
        units: number;
        modules: number;
        weapons: number;
        race: number;
        skullReduction: number;
        hasReroll: boolean;
    } {
        let units = 0;
        let modules = 0;
        let weapons = 0;
        let race = 0;
        let skullReduction = 0;
        let hasReroll = false;
        
        // Units
        for (const unit of player.units) {
            if (!unit) continue;
            if (unit.type === "assault") units += 1;
            if (unit.type === "shield") skullReduction += 1;
            if (unit.type === "tactical") hasReroll = true;
        }
        
        // Base Modules (buildings)
        if (player.modules.includes("AssaultBay")) modules += 1; // +1 when rolling at least 1
        if (player.modules.includes("ShieldArray")) skullReduction += 1;
        if (player.modules.includes("TacticalUplink")) hasReroll = true;
        
        // Weapons (static bonuses)
        for (const weapon of player.inventory.weapons) {
            if (!weapon) continue;
            if (weapon.effectId === "pulse_blade" || weapon.effectId === "blaster_core") weapons += 1;
            if (weapon.effectId === "heavy_cannon") weapons += 3;
            if (weapon.effectId === "quantum_blade") weapons += 2;
            if (weapon.effectId === "plasma_edge") weapons += 2; // Conditional, but show max
            if (weapon.effectId === "shock_pike") weapons += 1; // Conditional
            if (weapon.effectId === "heavy_striker") hasReroll = true;
        }
        
        // Modules/Spells
        for (const spell of player.inventory.spells) {
            if (!spell) continue;
            if (spell.effectId === "reroll_module") hasReroll = true;
        }
        
        // Amulet
        if (player.inventory.amulet?.effectId === "stabilizer_plating") skullReduction += 1;
        
        // Race bonuses
        if (player.raceId === "warbound") race += 1; // +1 if roll has at least 1 sword
        if (player.raceId === "warbound" && player.raceOption === "A") race += 1; // +1 vs T3+
        if (player.raceId === "bioform") skullReduction += 1; // Ignore first skull
        if (player.raceId === "chrono") hasReroll = true; // Free reroll once per turn
        if (player.raceId === "chrono" && player.raceOption === "A") skullReduction += 1; // First skull = 0
        
        return { units, modules, weapons, race, skullReduction, hasReroll };
    }

    // --------------------
    // v0.6: CONTEXTUAL HINTS
    // --------------------
    private renderContextHints() {
        this.contextHintLayer.removeChildren();
        
        const myPlayer = this.game.state.players[this.myPlayerIndex];
        if (!myPlayer) return;
        if (!this.isMyTurn) return; // Only show hints on my turn
        if (!this.tutorialHints.isEnabled()) return;
        
        const hints: string[] = [];
        
        // Low on components
        if (myPlayer.components < 2) {
            hints.push("💡 Components are earned from Tier 2+ monsters");
        }
        
        // Prestige pressure warning
        if (myPlayer.prestige >= 12 && myPlayer.prestige < 15) {
            hints.push("⚠️ Prestige Pressure active: Monsters require +1 to defeat");
        }
        if (myPlayer.prestige >= 15) {
            hints.push("🚫 Prestige ≥15: No rerolls allowed in combat!");
        }
        
        // Can't gather (not on gatherable tile)
        const myTile = this.game.state.board.getTile(myPlayer.position);
        const isGatherableTile = myTile && (
            myTile.type === TileType.Resource || 
            myTile.type === TileType.StartingSector
        ) && !myTile.encounterActive && !myTile.ownerId;
        if (myTile && !isGatherableTile && this.game.state.actionPoints > 0) {
            hints.push("📍 Move to a resource tile to gather");
        }
        
        // No base built
        if (!myPlayer.basePosition && myPlayer.materials >= 2) {
            hints.push("🏠 You can build a Base (costs 2🧱)");
        }
        
        // At base, can craft
        if (this.game.isInOwnBase() && myPlayer.components >= 1) {
            hints.push("🔧 You're at Base - CRAFT available!");
        }
        
        // Final Trial preview
        if (this.game.state.isFinalPreparation && !this.game.state.finalTrialStarted) {
            const score = this.calculateFinalTrialPreview(myPlayer);
            hints.push(`📊 Final Trial Preview: ~${score} points`);
        }
        
        // Show first hint only (to not clutter)
        if (hints.length > 0) {
            const hintText = new PIXI.Text({
                text: hints[0],
                style: new PIXI.TextStyle({
                    fontSize: 13,
                    fill: 0xffaa00,
                    fontWeight: "600",
                    dropShadow: { color: 0x000000, blur: 4, alpha: 0.8, distance: 1 },
                }),
            });
            hintText.anchor.set(0.5, 0);
            hintText.position.set(this.app.renderer.width / 2, this.app.renderer.height - 80);
            this.contextHintLayer.addChild(hintText);
        }
    }
    
    private calculateFinalTrialPreview(player: import("../entities/Player").Player): number {
        let score = 0;
        
        // Prestige
        score += player.prestige;
        
        // Equipment (1 point each)
        for (const w of player.inventory.weapons) if (w) score += 1;
        for (const s of player.inventory.spells) if (s) score += 1;
        if (player.inventory.amulet) score += 1;
        
        // Units (1 point each)
        for (const u of player.units) if (u) score += 1;
        
        // Base modules (1 point each)
        score += player.modules.length;
        
        return score;
    }

    // --------------------
    // Hero Board (v0.8 - Informative with context)
    // --------------------
    private renderHeroBoard() {
        this.heroBoardPanel.render({
            app: this.app,
            game: this.game,
            layer: this.heroBoardLayer,
            playerColors: this.PLAYER_COLORS,
            playerIndex: this.myPlayerIndex,
        });
    }
    
    /**
     * v0.6: Ultra compact equipment summary - single row (improved)
     */
    public renderEquipmentSummaryCompact(p: import("../entities/Player").Player, x: number, y: number, width: number) {
        const weaponsCount = p.inventory.weapons.filter(w => w !== null).length;
        const modulesCount = p.inventory.spells.filter(s => s !== null).length;
        const unitsCount = p.units.filter(u => u !== null).length;
        const hasAmulet = p.inventory.amulet !== null;
        
        // Single row with all equipment
        const items = [
            { icon: "⚔", count: weaponsCount, max: 2, color: 0xffd700 },
            { icon: "🔧", count: modulesCount, max: 2, color: 0x9333ea },
            { icon: "🤖", count: unitsCount, max: 2, color: 0x3b82f6 },
            { icon: "📿", count: hasAmulet ? 1 : 0, max: 1, color: 0x3498db },
        ];
        
        const itemW = (width - 30) / 4;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const ix = x + i * (itemW + 10);
            const filled = item.count > 0;
            
            // Box with better styling
            const box = new PIXI.Graphics();
            box.roundRect(ix, y, itemW, 64, 10);
            box.fill({ color: filled ? 0x161b2e : 0x0a0e1a, alpha: filled ? 0.8 : 0.4 });
            box.stroke({ color: item.color, width: filled ? 2 : 1, alpha: filled ? 0.6 : 0.3 });
            this.heroBoardLayer.addChild(box);
            
            // Icon
            const icon = new PIXI.Text({
                text: item.icon,
                style: new PIXI.TextStyle({ 
                    fontSize: 26,
                }),
            });
            icon.alpha = filled ? 1 : 0.4;
            icon.anchor.set(0.5);
            icon.position.set(ix + itemW / 2, y + 24);
            this.heroBoardLayer.addChild(icon);
            
            // Count
            const countText = new PIXI.Text({
                text: `${item.count}/${item.max}`,
                style: new PIXI.TextStyle({ 
                    fontSize: 15, 
                    fill: filled ? item.color : 0x484f58, 
                    fontWeight: "800" 
                }),
            });
            countText.anchor.set(0.5);
            countText.position.set(ix + itemW / 2, y + 48);
            this.heroBoardLayer.addChild(countText);
        }
    }
    
    /**
     * v0.6: Simplified equipment summary - just icons with counts
     */
    public renderEquipmentSummary(p: import("../entities/Player").Player, x: number, y: number, _width: number) {
        const slotSize = 42;
        const gap = 10;
        
        // Count filled slots
        const weaponsCount = p.inventory.weapons.filter(w => w !== null).length;
        const modulesCount = p.inventory.spells.filter(s => s !== null).length;
        const unitsCount = p.units.filter(u => u !== null).length;
        const hasAmulet = p.inventory.amulet !== null;
        
        // Row 1: Weapons (2 slots)
        const weaponLabel = new PIXI.Text({
            text: `⚔ ${weaponsCount}/2`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffd700, fontWeight: "700" }),
        });
        weaponLabel.position.set(x, y);
        this.heroBoardLayer.addChild(weaponLabel);
        
        for (let i = 0; i < 2; i++) {
            const item = p.inventory.weapons[i];
            this.renderEquipSlotSimple(x + i * (slotSize + gap), y + 24, slotSize, item !== null);
        }
        
        // Row 2: Modules (2 slots)
        const moduleLabel = new PIXI.Text({
            text: `🔧 ${modulesCount}/2`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0x9333ea, fontWeight: "700" }),
        });
        moduleLabel.position.set(x + 160, y);
        this.heroBoardLayer.addChild(moduleLabel);
        
        for (let i = 0; i < 2; i++) {
            const item = p.inventory.spells[i];
            this.renderEquipSlotSimple(x + 160 + i * (slotSize + gap), y + 24, slotSize, item !== null);
        }
        
        // Row 3: Units (2 slots)
        const unitLabel = new PIXI.Text({
            text: `🤖 ${unitsCount}/2`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0x3b82f6, fontWeight: "700" }),
        });
        unitLabel.position.set(x, y + 50);
        this.heroBoardLayer.addChild(unitLabel);
        
        for (let i = 0; i < 2; i++) {
            const unit = p.units[i];
            this.renderEquipSlotSimple(x + i * (slotSize + gap), y + 74, slotSize, unit !== null, unit?.emoji);
        }
        
        // Amulet
        const amuletLabel = new PIXI.Text({
            text: `📿 ${hasAmulet ? "1" : "0"}/1`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0x3498db, fontWeight: "700" }),
        });
        amuletLabel.position.set(x + 160, y + 50);
        this.heroBoardLayer.addChild(amuletLabel);
        
        this.renderEquipSlotSimple(x + 160, y + 74, slotSize, hasAmulet);
    }
    
    private renderEquipSlotSimple(x: number, y: number, size: number, filled: boolean, emoji?: string) {
        const slot = new PIXI.Graphics();
        slot.roundRect(x, y, size, size, 6);
        
        if (filled) {
            slot.fill({ color: 0x2d3748, alpha: 1 });
            slot.stroke({ color: 0x00ff88, width: 2 });
            
            if (emoji) {
                const icon = new PIXI.Text({
                    text: emoji,
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                icon.anchor.set(0.5);
                icon.position.set(x + size / 2, y + size / 2);
                this.heroBoardLayer.addChild(icon);
            } else {
                const checkmark = new PIXI.Text({
                    text: "✓",
                    style: new PIXI.TextStyle({ fontSize: 20, fill: 0x00ff88, fontWeight: "700" }),
                });
                checkmark.anchor.set(0.5);
                checkmark.position.set(x + size / 2, y + size / 2);
                this.heroBoardLayer.addChild(checkmark);
            }
        } else {
            slot.fill({ color: 0x21262d, alpha: 1 });
            slot.stroke({ color: 0x484f58, width: 2 });
        }
        
        this.heroBoardLayer.addChild(slot);
    }
    
    public renderSectionHeader(text: string, x: number, y: number, color: number) {
        const label = new PIXI.Text({
            text: text,
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: color,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        label.position.set(x, y);
        this.heroBoardLayer.addChild(label);
    }
    
    public renderLifeTokensCompact(p: { hp: number; maxHp: number }, x: number, y: number) {
        const heartSize = 16;
        const gap = 4;

        for (let i = 0; i < p.maxHp; i++) {
            const heart = new PIXI.Graphics();
            const filled = i < p.hp;
            const s = heartSize / 20;
            heart.moveTo(0, 6 * s);
            heart.bezierCurveTo(-5 * s, -3 * s, -12 * s, -3 * s, -12 * s, 2 * s);
            heart.bezierCurveTo(-12 * s, 7 * s, -8 * s, 12 * s, 0, 16 * s);
            heart.bezierCurveTo(8 * s, 12 * s, 12 * s, 7 * s, 12 * s, 2 * s);
            heart.bezierCurveTo(12 * s, -3 * s, 5 * s, -3 * s, 0, 6 * s);

            if (filled) {
                heart.fill({ color: 0xff3b4a, alpha: 1 });
                heart.stroke({ color: 0xcc0000, width: 1 });
            } else {
                heart.fill({ color: 0x2d3748, alpha: 0.6 });
                heart.stroke({ color: 0x4a5568, width: 1 });
            }

            heart.position.set(x + i * (heartSize + gap) + heartSize / 2, y + heartSize / 2);
            this.heroBoardLayer.addChild(heart);
        }

        const hpLabel = new PIXI.Text({
            text: `${p.hp}/${p.maxHp}`,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "600" }),
        });
        hpLabel.position.set(x + p.maxHp * (heartSize + gap) + 8, y + 2);
        this.heroBoardLayer.addChild(hpLabel);
    }
    
    /**
     * v0.6: Modern Prestige Bar with large display
     */
    public renderPrestigeBarModern(p: { prestige: number }, x: number, y: number, width: number) {
        const barH = 32; // Tall bar
        const pressureThreshold = 12;
        const noRerollThreshold = 15;
        const maxDisplay = 20;
        
        // Background card
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, width, 70, 10);
        cardBg.fill({ color: 0x161b2e, alpha: 0.6 });
        this.heroBoardLayer.addChild(cardBg);
        
        // Label
        const label = new PIXI.Text({
            text: "⭐ PRESTIGE",
            style: new PIXI.TextStyle({ 
                fontSize: 14, 
                fill: 0xffd700, 
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        label.position.set(x + 10, y + 8);
        this.heroBoardLayer.addChild(label);
        
        // Large value display
        const valueDisplay = new PIXI.Text({
            text: `${p.prestige}`,
            style: new PIXI.TextStyle({ 
                fontSize: 32, 
                fill: 0xffd700, 
                fontWeight: "900",
                dropShadow: { color: 0xffd700, blur: 8, alpha: 0.6, distance: 0 },
            }),
        });
        valueDisplay.anchor.set(1, 0);
        valueDisplay.position.set(x + width - 10, y + 4);
        this.heroBoardLayer.addChild(valueDisplay);
        
        // Bar background
        const barY = y + 42;
        const barBg = new PIXI.Graphics();
        barBg.roundRect(x + 10, barY, width - 20, barH, 8);
        barBg.fill({ color: 0x0a0e1a, alpha: 1 });
        barBg.stroke({ color: 0x30363d, width: 2 });
        this.heroBoardLayer.addChild(barBg);
        
        // Bar fill
        const fillWidth = Math.min(p.prestige / maxDisplay, 1) * (width - 20);
        
        let barColor = 0xffd700;
        if (p.prestige >= noRerollThreshold) {
            barColor = 0xff4444;
        } else if (p.prestige >= pressureThreshold) {
            barColor = 0xffaa00;
        }
        
        if (fillWidth > 0) {
            const barFill = new PIXI.Graphics();
            barFill.roundRect(x + 10, barY, fillWidth, barH, 8);
            barFill.fill({ color: barColor, alpha: 1 });
            this.heroBoardLayer.addChild(barFill);
        }
        
        // Threshold markers
        const marker12X = x + 10 + (pressureThreshold / maxDisplay) * (width - 20);
        const marker12 = new PIXI.Graphics();
        marker12.rect(marker12X - 1, barY + 4, 2, barH - 8);
        marker12.fill({ color: 0xffffff, alpha: 0.6 });
        this.heroBoardLayer.addChild(marker12);
        
        const marker12Label = new PIXI.Text({
            text: "12",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: "700" }),
        });
        marker12Label.anchor.set(0.5, 1);
        marker12Label.position.set(marker12X, barY - 2);
        this.heroBoardLayer.addChild(marker12Label);
        
        const marker15X = x + 10 + (noRerollThreshold / maxDisplay) * (width - 20);
        const marker15 = new PIXI.Graphics();
        marker15.rect(marker15X - 1, barY + 4, 2, barH - 8);
        marker15.fill({ color: 0xffffff, alpha: 0.6 });
        this.heroBoardLayer.addChild(marker15);
        
        const marker15Label = new PIXI.Text({
            text: "15",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: "700" }),
        });
        marker15Label.anchor.set(0.5, 1);
        marker15Label.position.set(marker15X, barY - 2);
        this.heroBoardLayer.addChild(marker15Label);
    }
    
    /**
     * v0.6: Prestige as a progress bar with pressure warnings (LARGER VERSION)
     */
    public renderPrestigeBar(p: { prestige: number }, x: number, y: number, width: number) {
        const barH = 24; // Increased from 16
        const pressureThreshold = 12;
        const noRerollThreshold = 15;
        const maxDisplay = 20; // Visual max for bar
        
        // Label with value
        const label = new PIXI.Text({
            text: `⭐ PRESTIGE: ${p.prestige}`,
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffd700, fontWeight: "800", letterSpacing: 1 }),
        });
        label.position.set(x, y);
        this.heroBoardLayer.addChild(label);
        
        // Bar background
        const barY = y + 28;
        const barBg = new PIXI.Graphics();
        barBg.roundRect(x, barY, width, barH, 6);
        barBg.fill({ color: 0x21262d, alpha: 1 });
        barBg.stroke({ color: 0x30363d, width: 2 });
        this.heroBoardLayer.addChild(barBg);
        
        // Bar fill (segmented)
        const fillWidth = Math.min(p.prestige / maxDisplay, 1) * width;
        
        // Color based on pressure
        let barColor = 0xffd700; // Normal: gold
        if (p.prestige >= noRerollThreshold) {
            barColor = 0xff4444; // Danger: red
        } else if (p.prestige >= pressureThreshold) {
            barColor = 0xffaa00; // Warning: orange
        }
        
        const barFill = new PIXI.Graphics();
        barFill.roundRect(x, barY, fillWidth, barH, 6);
        barFill.fill({ color: barColor, alpha: 1 });
        this.heroBoardLayer.addChild(barFill);
        
        // Threshold markers with labels
        // 12 marker (pressure starts)
        const marker12X = x + (pressureThreshold / maxDisplay) * width;
        const marker12 = new PIXI.Graphics();
        marker12.rect(marker12X - 1, barY, 2, barH);
        marker12.fill({ color: 0xffaa00, alpha: 1 });
        this.heroBoardLayer.addChild(marker12);
        
        const marker12Label = new PIXI.Text({
            text: "12",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffaa00, fontWeight: "700" }),
        });
        marker12Label.anchor.set(0.5, 1);
        marker12Label.position.set(marker12X, barY - 2);
        this.heroBoardLayer.addChild(marker12Label);
        
        // 15 marker (no reroll)
        const marker15X = x + (noRerollThreshold / maxDisplay) * width;
        const marker15 = new PIXI.Graphics();
        marker15.rect(marker15X - 1, barY, 2, barH);
        marker15.fill({ color: 0xff4444, alpha: 1 });
        this.heroBoardLayer.addChild(marker15);
        
        const marker15Label = new PIXI.Text({
            text: "15",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xff4444, fontWeight: "700" }),
        });
        marker15Label.anchor.set(0.5, 1);
        marker15Label.position.set(marker15X, barY - 2);
        this.heroBoardLayer.addChild(marker15Label);
        
        // Warning text below bar (LARGER)
        let warningText = "";
        let warningColor = 0x8b949e;
        
        if (p.prestige >= noRerollThreshold) {
            warningText = "🚫 No rerolls!";
            warningColor = 0xff4444;
        } else if (p.prestige >= pressureThreshold) {
            warningText = "⚠️ +1 difficulty";
            warningColor = 0xffaa00;
        } else {
            const toNextThreshold = pressureThreshold - p.prestige;
            warningText = `${toNextThreshold} to pressure`;
            warningColor = 0x8b949e;
        }
        
        const warning = new PIXI.Text({
            text: warningText,
            style: new PIXI.TextStyle({ fontSize: 14, fill: warningColor, fontWeight: "600" }),
        });
        warning.position.set(x, barY + barH + 6);
        this.heroBoardLayer.addChild(warning);
    }
    
    public renderModuleTokensCompact(p: { modules: string[] }, x: number, y: number, _width: number) {
        if (p.modules.length === 0) {
            const none = new PIXI.Text({
                text: "No modules built yet",
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x718096 }),
            });
            none.position.set(x, y + 4);
            this.heroBoardLayer.addChild(none);
            return;
        }

        const slotSize = 28;
        const gap = 6;
        for (let i = 0; i < p.modules.length; i++) {
            const slot = new PIXI.Graphics();
            slot.roundRect(x + i * (slotSize + gap), y, slotSize, slotSize, 5);
            slot.fill({ color: 0x4a5568, alpha: 1 });
            slot.stroke({ color: 0x60a5fa, width: 2 });
            this.heroBoardLayer.addChild(slot);

            const label = new PIXI.Text({
                text: p.modules[i][0],
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "700" }),
            });
            label.anchor.set(0.5);
            label.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
            this.heroBoardLayer.addChild(label);
        }
    }
    
    public renderUnitsCompact(p: import("../entities/Player").Player, x: number, y: number, _width: number) {
        const slotSize = 36;
        const gap = 8;
        
        for (let i = 0; i < 2; i++) {
            const unit = p.units[i];
            
            const slot = new PIXI.Graphics();
            slot.roundRect(x + i * (slotSize + gap), y, slotSize, slotSize, 6);
            
            if (unit) {
                slot.fill({ color: 0x3b82f6, alpha: 0.8 });
                slot.stroke({ color: 0x60a5fa, width: 2 });
                
                const emoji = new PIXI.Text({
                    text: unit.emoji,
                    style: new PIXI.TextStyle({ fontSize: 20 }),
                });
                emoji.anchor.set(0.5);
                emoji.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
                this.heroBoardLayer.addChild(emoji);
                
                // Unit name below
                const name = new PIXI.Text({
                    text: unit.name.split(" ")[0],
                    style: new PIXI.TextStyle({ fontSize: 8, fill: 0xa0aec0 }),
                });
                name.anchor.set(0.5, 0);
                name.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize + 2);
                this.heroBoardLayer.addChild(name);
            } else {
                slot.fill({ color: 0x2d3748, alpha: 0.5 });
                slot.stroke({ color: 0x4a5568, width: 1 });
                
                // Empty slot hint
                const plus = new PIXI.Text({
                    text: "+",
                    style: new PIXI.TextStyle({ fontSize: 16, fill: 0x4a5568 }),
                });
                plus.anchor.set(0.5);
                plus.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
                this.heroBoardLayer.addChild(plus);
            }
            
            this.heroBoardLayer.addChild(slot);
        }
        
        // Hire hint
        const hasEmptySlot = p.units.some(u => u === null);
        if (hasEmptySlot && this.game.isInOwnBase()) {
            const hint = new PIXI.Text({
                text: "← HIRE at Base",
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0x3b82f6, fontWeight: "600" }),
            });
            hint.position.set(x + 2 * (slotSize + gap) + 10, y + 10);
            this.heroBoardLayer.addChild(hint);
        }
    }
    
    public renderEquipmentCompact(p: import("../entities/Player").Player, x: number, y: number, _width: number) {
        const slotSize = 36;
        const gap = 6;
        const isAtBase = this.game.isInOwnBase();
        
        // Row 1: Weapons (2 slots) + Amulet (1 slot)
        const weaponLabel = new PIXI.Text({
            text: "⚔ Weapons",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffd700, fontWeight: "600" }),
        });
        weaponLabel.position.set(x, y);
        this.heroBoardLayer.addChild(weaponLabel);
        
        for (let i = 0; i < 2; i++) {
            const item = p.inventory.weapons[i];
            this.renderEquipSlot(x + i * (slotSize + gap), y + 18, slotSize, item, "weapon", isAtBase);
        }
        
        // Amulet on the right
        const amuletLabel = new PIXI.Text({
            text: "📿 Amulet",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x3498db, fontWeight: "600" }),
        });
        amuletLabel.position.set(x + 180, y);
        this.heroBoardLayer.addChild(amuletLabel);
        
        this.renderEquipSlot(x + 180, y + 18, slotSize, p.inventory.amulet, "amulet", isAtBase);
        
        // Row 2: Modules (2 slots)
        const moduleLabel = new PIXI.Text({
            text: "🔧 Modules",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x9333ea, fontWeight: "600" }),
        });
        moduleLabel.position.set(x, y + 60);
        this.heroBoardLayer.addChild(moduleLabel);
        
        for (let i = 0; i < 2; i++) {
            const item = p.inventory.spells[i];
            this.renderEquipSlot(x + i * (slotSize + gap), y + 78, slotSize, item, "module", isAtBase);
        }
        
        // Craft hint
        if (isAtBase) {
            const craftHint = new PIXI.Text({
                text: "← CRAFT at Base",
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0x9333ea, fontWeight: "600" }),
            });
            craftHint.position.set(x + 90, y + 85);
            this.heroBoardLayer.addChild(craftHint);
        }
    }
    
    private renderEquipSlot(x: number, y: number, size: number, item: any, type: string, _isAtBase: boolean) {
        const slot = new PIXI.Graphics();
        slot.roundRect(x, y, size, size, 6);
        
        const colors: Record<string, number> = {
            weapon: 0xffd700,
            module: 0x9333ea,
            amulet: 0x3498db,
        };
        const strokeColor = colors[type] || 0x4a5568;
        
        if (item) {
            slot.fill({ color: 0x4a5568, alpha: 1 });
            slot.stroke({ color: strokeColor, width: 2 });
            
            const emoji = new PIXI.Text({
                text: item.emoji || item.name?.[0] || "?",
                style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffffff }),
            });
            emoji.anchor.set(0.5);
            emoji.position.set(x + size / 2, y + size / 2);
            this.heroBoardLayer.addChild(emoji);
        } else {
            slot.fill({ color: 0x1a1f2e, alpha: 0.8 });
            slot.stroke({ color: 0x4a5568, width: 1 });
            
            // Empty slot icon
            const icon = new PIXI.Text({
                text: type === "weapon" ? "⚔" : type === "module" ? "🔧" : "📿",
                style: new PIXI.TextStyle({ fontSize: 14 }),
            });
            icon.anchor.set(0.5);
            icon.alpha = 0.3;
            icon.position.set(x + size / 2, y + size / 2);
            this.heroBoardLayer.addChild(icon);
        }
        
        this.heroBoardLayer.addChild(slot);
    }
    
    public renderDivider(x: number, y: number, width: number) {
        const divider = new PIXI.Graphics();
        divider.moveTo(x, y);
        divider.lineTo(x + width, y);
        divider.stroke({ color: 0x4a5568, width: 1, alpha: 0.4 });
        this.heroBoardLayer.addChild(divider);
    }


    // --------------------
    // BUILD MENU (модальное окно)
    // --------------------
    private renderBuildMenu() {
        this.buildMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.buildMenuLayer,
            playerColors: this.PLAYER_COLORS,
            shownHints: this.tutorialHints.getShownHints(),
            hintsEnabled: this.tutorialHints.isEnabled(),
            showHint: this.showHint.bind(this),
            renderAll: this.renderAll.bind(this),
        });
    }

    // --------------------
    // Craft Menu (v0.5)
    // --------------------
    private renderCraftMenu() {
        this.craftMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.craftMenuLayer,
            playerColors: this.PLAYER_COLORS,
            canShowHint: (id) => this.tutorialHints.canShowHint(id),
            showHint: this.showHint.bind(this),
            renderAll: this.renderAll.bind(this),
        });
    }

    // --------------------
    // Hire Unit Menu (v0.5)
    // --------------------
    private showHireUnitMenu(): void {
        this.hireUnitMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.craftMenuLayer,
            playerColors: this.PLAYER_COLORS,
            renderAll: this.renderAll.bind(this),
        });
    }

    // --------------------
    // Orbital Hangar Menu (v0.5)
    // --------------------
    private showOrbitalHangarMenu(): void {
        this.orbitalHangarMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.craftMenuLayer,
            playerColors: this.PLAYER_COLORS,
            renderAll: this.renderAll.bind(this),
        });
    }

    // --------------------
    // Final Phase Banner (v0.5)
    // --------------------
    private renderFinalPhaseBanner() {
        this.finalPhaseBanner.render({
            app: this.app,
            game: this.game,
            layer: this.finalPhaseBannerLayer,
            isMyTurn: this.isMyTurn,
            onRecall: () => {
                this.game.doRecallToBase();
                this.renderAll();
            },
            onFinalTrial: () => {
                this.game.doFinalTrial(0);
                this.renderAll();
            },
        });
    }

    // --------------------
    // Event Log (with prominent modifier display)
    // --------------------
    private renderEventLog() {
        this.eventLogPanel.render({
            app: this.app,
            game: this.game,
            layer: this.eventLogLayer,
        });
    }

    // --------------------
    // Deck Info (UI колоды)
    // --------------------
    private renderDeckInfo() {
        this.deckInfoPanel.render({
            app: this.app,
            game: this.game,
            layer: this.deckInfoLayer,
        });
    }

    // ========================================
    // DEBUG PANEL
    // ========================================

    private debugToggleButtonContainer = new PIXI.Container();
    private debugToggleButtonBg = new PIXI.Graphics();
    private debugToggleButtonIcon = new PIXI.Text({
        text: "🐛",
        style: new PIXI.TextStyle({ fontSize: 16 }),
    });

    private createDebugToggleButton() {
        this.debugToggleButtonContainer.eventMode = "static";
        this.debugToggleButtonContainer.cursor = "pointer";
        this.debugToggleButtonContainer.hitArea = new PIXI.Rectangle(0, 0, 40, 30);
        
        this.debugToggleButtonContainer.addChild(this.debugToggleButtonBg);
        this.debugToggleButtonContainer.addChild(this.debugToggleButtonIcon);
        this.debugToggleButtonIcon.anchor.set(0.5);
        this.debugToggleButtonIcon.position.set(20, 15); // Center in button
        
        this.debugToggleButtonContainer.on("pointerdown", () => {
            this.debugPanelVisible = !this.debugPanelVisible;
            this.renderDebugPanel();
        });
        
        this.hudLayer.addChild(this.debugToggleButtonContainer);
    }

    private renderDebugPanel() {
        const h = this.app.renderer.height;
        
        // Position the container at bottom left
        this.debugToggleButtonContainer.position.set(10, h - 45);
        
        // Toggle button (always visible) - draw at local 0,0
        this.debugToggleButtonBg.clear();
        this.debugToggleButtonBg.roundRect(0, 0, 40, 30, 6);
        this.debugToggleButtonBg.fill({ color: this.debugPanelVisible ? 0xff6600 : 0x333333, alpha: 0.9 });
        this.debugToggleButtonBg.stroke({ color: 0xffffff, alpha: 0.3, width: 1 });

        // Clear panel
        this.debugPanelLayer.removeChildren();
        
        if (!this.debugPanelVisible) return;

        // Panel background - bottom left corner
        const panelW = 200;
        const panelH = 280;
        const panelX = 10;
        const panelY = h - panelH - 55; // Above the toggle button

        const panelBg = new PIXI.Graphics();
        panelBg.roundRect(panelX, panelY, panelW, panelH, 10);
        panelBg.fill({ color: 0x1a1a2e, alpha: 0.95 });
        panelBg.stroke({ color: 0xff6600, width: 2, alpha: 0.8 });
        this.debugPanelLayer.addChild(panelBg);

        // Title
        const title = new PIXI.Text({
            text: "🐛 DEBUG PANEL",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0xff6600,
                fontWeight: "700",
            }),
        });
        title.position.set(panelX + 15, panelY + 10);
        this.debugPanelLayer.addChild(title);

        // Buttons
        const buttons = [
            { label: "💰 +10 Resources", callback: () => this.onDebugAddResources?.() },
            { label: "❤️ Full Heal", callback: () => this.onDebugHeal?.() },
            { label: "⏭️ Skip Turn", callback: () => this.onDebugSkipTurn?.() },
            { label: "🔄 Reset Game", callback: () => this.onDebugReset?.() },
            { label: "🚪 Leave Game", callback: () => this.onDebugLeaveGame?.() },
        ];

        const btnW = panelW - 20;
        const btnH = 35;
        
        buttons.forEach((btn, index) => {
            const btnY = panelY + 40 + index * 42;
            const btnX = panelX + 10;
            
            // Button container for proper hit detection
            const btnContainer = new PIXI.Container();
            btnContainer.position.set(btnX, btnY);
            btnContainer.eventMode = "static";
            btnContainer.cursor = "pointer";
            btnContainer.hitArea = new PIXI.Rectangle(0, 0, btnW, btnH);
            
            const btnBg = new PIXI.Graphics();
            btnBg.roundRect(0, 0, btnW, btnH, 6);
            btnBg.fill({ color: 0x2d3748 });
            btnBg.stroke({ color: 0x4a5568, width: 1 });
            
            const label = new PIXI.Text({
                text: btn.label,
                style: new PIXI.TextStyle({
                    fontSize: 13,
                    fill: 0xffffff,
                }),
            });
            label.position.set(10, 9);
            label.eventMode = "none";
            
            btnContainer.addChild(btnBg);
            btnContainer.addChild(label);
            
            btnContainer.on("pointerover", () => {
                btnBg.clear();
                btnBg.roundRect(0, 0, btnW, btnH, 6);
                btnBg.fill({ color: 0x4a5568 });
                btnBg.stroke({ color: 0xff6600, width: 1 });
            });
            
            btnContainer.on("pointerout", () => {
                btnBg.clear();
                btnBg.roundRect(0, 0, btnW, btnH, 6);
                btnBg.fill({ color: 0x2d3748 });
                btnBg.stroke({ color: 0x4a5568, width: 1 });
            });
            
            btnContainer.on("pointerdown", () => {
                console.log(`[Debug] Button clicked: ${btn.label}`);
                btn.callback();
                this.renderAll();
            });
            
            this.debugPanelLayer.addChild(btnContainer);
        });

        // Player info
        const myPlayer = this.game.state.players[this.myPlayerIndex];
        if (myPlayer) {
            const info = new PIXI.Text({
                text: `Player: ${myPlayer.id}\n🧬${myPlayer.biomass} 🧱${myPlayer.materials} ⚙${myPlayer.alloys}`,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: 0x888888,
                }),
            });
            info.position.set(panelX + 15, panelY + panelH - 45);
            this.debugPanelLayer.addChild(info);
        }
    }

    // ===========================================
    // CONTEXT MENU - Actions on tile
    // ===========================================

    // Prevent double-click issues
    private lastClickTime = 0;
    private lastClickCoord: HexCoord | null = null;
    
    private showContextMenu(coord: HexCoord): void {
        // Debounce clicks (prevent double-click issues from re-render)
        const now = Date.now();
        if (this.lastClickCoord && 
            this.lastClickCoord.q === coord.q && 
            this.lastClickCoord.r === coord.r && 
            now - this.lastClickTime < 300) {
            return; // Ignore rapid clicks on same tile
        }
        this.lastClickTime = now;
        this.lastClickCoord = coord;
        
        const player = this.game.state.players[this.game.state.currentPlayerIndex];
        const tile = this.game.state.board.getTile(coord);
        const playerPos = player.position;
        
        const isOnTile = playerPos.q === coord.q && playerPos.r === coord.r;
        const isNeighbor = neighbors(playerPos).some(n => n.q === coord.q && n.r === coord.r);
        
        // If clicking on a NEIGHBOR discovered tile - auto-move first, then show menu
        if (!isOnTile && isNeighbor && tile && tile.discovered) {
            // Save current player index and position BEFORE action (turn may change after combat!)
            const prevPlayerIndex = this.game.state.currentPlayerIndex;
            const prevPos = { ...player.position };
            
            this.game.handleHexClick(coord);
            this.renderAll();
            
            // Check if turn changed (combat ends turn!) or if still same player
            const turnChanged = this.game.state.currentPlayerIndex !== prevPlayerIndex;
            if (turnChanged) {
                // Combat happened - turn is over, don't show menu
                return;
            }
            
            // Check if move happened (for same player)
            const currentPlayer = this.game.state.players[this.game.state.currentPlayerIndex];
            const newPos = currentPlayer.position;
            const didMove = prevPos.q !== newPos.q || prevPos.r !== newPos.r;
            
            if (didMove && this.game.state.actionPoints > 0 && this.isMyTurn) {
                // Show menu after move with small delay
                setTimeout(() => {
                    if (this.game.state.actionPoints > 0 && this.isMyTurn) {
                        // Get actions for new position
                        const newTile = this.game.state.board.getTile(newPos);
                        const newActions = this.getAvailableActionsForTile(newPos, newPos, newTile);
                        
                        if (newActions.length > 0) {
                            this.contextMenuTile = newPos;
                            this.contextMenuVisible = true;
                            this.renderContextMenu(newPos, newActions);
                        }
                    }
                }, 150);
            }
            return;
        }
        
        // If clicking on tile where menu is already shown - toggle it off
        if (this.contextMenuVisible && 
            this.contextMenuTile?.q === coord.q && 
            this.contextMenuTile?.r === coord.r) {
            this.hideContextMenu();
            return;
        }
        
        // Calculate what actions are available for this tile
        const actions = this.getAvailableActionsForTile(coord, playerPos, tile);
        
        if (actions.length === 0) {
            this.hideContextMenu();
            return;
        }
        
        this.contextMenuTile = coord;
        this.contextMenuVisible = true;
        this.renderContextMenu(coord, actions);
    }

    private hideContextMenu(): void {
        this.contextMenuVisible = false;
        this.contextMenuTile = null;
        this.contextMenuLayer.removeChildren();
    }

    private getAvailableActionsForTile(
        coord: HexCoord, 
        playerPos: HexCoord, 
        tile: Tile | undefined
    ): Array<{ key: string; label: string; emoji: string; hint: string; enabled: boolean; action: () => void }> {
        const actions: Array<{ key: string; label: string; emoji: string; hint: string; enabled: boolean; action: () => void }> = [];
        const player = this.game.state.players[this.game.state.currentPlayerIndex];
        const isOnTile = playerPos.q === coord.q && playerPos.r === coord.r;
        const isNeighbor = neighbors(playerPos).some(n => n.q === coord.q && n.r === coord.r);
        
        if (!tile || !tile.discovered) {
            // Fog tile - can explore if neighbor AND deck has tiles
            const hasRemainingTiles = this.game.state.tileDeck.getRemainingCount() > 0;
            if (isNeighbor && this.game.state.actionPoints >= 1 && hasRemainingTiles) {
                actions.push({
                    key: "EXPLORE",
                    label: "Explore",
                    emoji: "🔭",
                    hint: "Discover new territory",
                    enabled: true,
                    action: () => {
                        this.hideContextMenu();
                        this.game.state.uiMode = "TILE_PLACEMENT";
                        this.game.state.selectedPlacementPosition = coord;
                        this.renderAll();
                    }
                });
            }
            return actions;
        }
        
        // Discovered tile
        if (isOnTile) {
            // GATHER - if has resource, no monster, and no base built here
            const hasResources = tile.resources && 
                ((tile.resources.biomass ?? 0) > 0 || 
                 (tile.resources.materials ?? 0) > 0 || 
                 (tile.resources.alloys ?? 0) > 0);
            
            // Can't gather on tiles with a base (ownerId set)
            if (hasResources && !tile.encounterActive && !tile.ownerId) {
                const mainResource = tile.resources!.biomass ? "Biomass" : 
                                     tile.resources!.materials ? "Materials" : "Alloys";
                const resourceEmoji = this.getResourceEmoji(mainResource);
                
                // Check cooldown
                const onCooldown = tile.cooldownUntilRoundByPlayer?.[player.id] 
                    ? tile.cooldownUntilRoundByPlayer[player.id] > this.game.state.round 
                    : false;
                
                actions.push({
                    key: "GATHER",
                    label: "Gather",
                    emoji: resourceEmoji,
                    hint: onCooldown ? "On cooldown" : `Collect ${mainResource}`,
                    enabled: this.game.state.actionPoints >= 1 && !onCooldown,
                    action: () => {
                        this.hideContextMenu();
                        this.game.doGather();
                        this.renderAll();
                    }
                });

                actions.push({
                    key: "HEAL",
                    label: "Heal",
                    emoji: "❤️",
                    hint: player.hp < player.maxHp ? "Restore 2 HP (1 AP)" : "Already at full HP",
                    enabled: this.game.state.actionPoints >= 1 && player.hp < player.maxHp,
                    action: () => {
                        this.hideContextMenu();
                        this.game.doHeal();
                        this.renderAll();
                    }
                });
            }
            
            // TRADE - if on Landing Hub
            if (tile.type === TileType.LandingHub) {
                actions.push({
                    key: "TRADE",
                    label: "Trade",
                    emoji: "🔄",
                    hint: "Exchange 3 of one → 1 of another",
                    enabled: this.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.game.doTrade();
                        this.renderAll();
                    }
                });


            }
            
            // BUILD - Base or Modules
            const canBuildBase = this.game.canBuildBase();
            const isInBase = this.game.isInOwnBase();
            
            if (canBuildBase) {
                actions.push({
                    key: "BUILD_BASE",
                    label: "Build Base",
                    emoji: "🏠",
                    hint: "Establish your base here (2 Materials)",
                    enabled: player.materials >= 2 && this.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.game.doBuildBase();
                        this.renderAll();
                    }
                });
            }
            
            if (isInBase) {
                actions.push({
                    key: "BUILD_MODULES",
                    label: "Modules",
                    emoji: "🏗",
                    hint: "Build modules in your base",
                    enabled: this.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.game.state.uiMode = "BUILD_MENU";
                        this.renderAll();
                    }
                });
                
                // v0.5: CRAFT action (only at base)
                actions.push({
                    key: "CRAFT",
                    label: "Craft",
                    emoji: "🔧",
                    hint: "Craft items using Components",
                    enabled: this.game.state.actionPoints >= 1 && this.game.canCraft(),
                    action: () => {
                        this.hideContextMenu();
                        this.game.toggleCraftMenu();
                        this.renderAll();
                    }
                });
                
                // v0.5: HIRE UNIT action (only at base with empty slots)
                if (this.game.canHireUnit()) {
                    actions.push({
                        key: "HIRE_UNIT",
                        label: "Hire Unit",
                        emoji: "🤖",
                        hint: "Hire combat units",
                        enabled: this.game.state.actionPoints >= 1,
                        action: () => {
                            this.hideContextMenu();
                            this.showHireUnitMenu();
                        }
                    });
                }
            }
            
            // v0.5: RECALL TO BASE action (only during Orbital Phase)
            if (this.game.canRecallToBase()) {
                actions.push({
                    key: "RECALL",
                    label: "Recall",
                    emoji: "📡",
                    hint: "Teleport to your Base (free)",
                    enabled: true,
                    action: () => {
                        this.hideContextMenu();
                        this.game.doRecallToBase();
                        this.renderAll();
                    }
                });
            }
            
            // v0.5: ORBITAL HANGAR TELEPORT (only at base, with module built)
            if (this.game.canUseOrbitalHangar()) {
                actions.push({
                    key: "ORBITAL_TELEPORT",
                    label: "Teleport",
                    emoji: "🚀",
                    hint: "Use Orbital Hangar (1 AP)",
                    enabled: this.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.showOrbitalHangarMenu();
                    }
                });
            }
        }
        // Note: MOVE is handled automatically in showContextMenu, not as a menu item
        
        return actions;
    }

    private getResourceEmoji(kind: string | undefined): string {
        switch (kind) {
            case "Biomass": return "🧬";
            case "Materials": return "🧱";
            case "Alloys": return "⚙";
            default: return "📦";
        }
    }

    private renderContextMenu(coord: HexCoord, actions: Array<{ key: string; label: string; emoji: string; hint: string; enabled: boolean; action: () => void }>): void {
        this.contextMenuLayer.removeChildren();
        
        const { x, y } = this.hexToPixel(coord);
        
        // Apply board transform
        const screenX = (x + this.panX) * this.zoom + this.app.screen.width / 2;
        const screenY = (y + this.panY) * this.zoom + this.app.screen.height / 2;
        
        const btnW = 120;
        const btnH = 36;
        const gap = 6;
        const menuWidth = btnW + 20;
        const menuHeight = actions.length * (btnH + gap) + 20;
        
        // Position menu above or below tile
        const menuX = screenX - menuWidth / 2;
        const menuY = screenY + this.HEX_SIZE * this.zoom + 10;
        
        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, menuWidth, menuHeight, 10);
        bg.fill({ color: 0x1a1a2e, alpha: 0.95 });
        bg.stroke({ color: 0x4a90d9, width: 2 });
        bg.position.set(menuX, menuY);
        this.contextMenuLayer.addChild(bg);

        if (this.tutorialHints.canShowHint("context_menu")) {
            this.showHint(
                "context_menu",
                "🧭 Action Menu",
                "Click an action to spend 1 AP. Hover actions to see what they do and their costs.",
                {
                    anchor: "top",
                    x: menuX + menuWidth / 2,
                    y: menuY - 20,
                    highlightRect: { x: menuX, y: menuY, width: menuWidth, height: menuHeight },
                }
            );
        }
        
        // Arrow pointing to tile
        const arrow = new PIXI.Graphics();
        arrow.moveTo(screenX - 8, menuY);
        arrow.lineTo(screenX, menuY - 10);
        arrow.lineTo(screenX + 8, menuY);
        arrow.closePath();
        arrow.fill({ color: 0x1a1a2e });
        arrow.stroke({ color: 0x4a90d9, width: 2 });
        this.contextMenuLayer.addChild(arrow);
        
        // Action buttons
        actions.forEach((action, i) => {
            const btnContainer = new PIXI.Container();
            btnContainer.position.set(menuX + 10, menuY + 10 + i * (btnH + gap));
            btnContainer.eventMode = action.enabled ? "static" : "none";
            btnContainer.cursor = action.enabled ? "pointer" : "not-allowed";
            
            const btnBg = new PIXI.Graphics();
            btnBg.roundRect(0, 0, btnW, btnH, 6);
            const bgColor = action.enabled ? 0x2d4a3d : 0x2d2d2d;
            btnBg.fill({ color: bgColor });
            btnBg.stroke({ color: action.enabled ? 0x4ade80 : 0x555555, width: 1 });
            btnBg.hitArea = new PIXI.Rectangle(0, 0, btnW, btnH);
            
            const label = new PIXI.Text({
                text: `${action.emoji} ${action.label}`,
                style: new PIXI.TextStyle({
                    fontSize: 13,
                    fill: action.enabled ? 0xffffff : 0x666666,
                    fontWeight: "600",
                }),
            });
            label.anchor.set(0, 0.5);
            label.position.set(10, btnH / 2);
            label.eventMode = "none";
            
            btnContainer.addChild(btnBg);
            btnContainer.addChild(label);
            
            if (action.enabled) {
                btnContainer.on("pointerover", () => {
                    btnBg.clear();
                    btnBg.roundRect(0, 0, btnW, btnH, 6);
                    btnBg.fill({ color: 0x3d6a4d });
                    btnBg.stroke({ color: 0x6ade80, width: 2 });
                    
                    // Show hint
                    this.showActionHint(action.hint, menuX + menuWidth + 10, menuY + 10 + i * (btnH + gap));
                });
                
                btnContainer.on("pointerout", () => {
                    btnBg.clear();
                    btnBg.roundRect(0, 0, btnW, btnH, 6);
                    btnBg.fill({ color: 0x2d4a3d });
                    btnBg.stroke({ color: 0x4ade80, width: 1 });
                    
                    this.hideActionHint();
                });
                
                btnContainer.on("pointerdown", () => {
                    action.action();
                });
            }
            
            this.contextMenuLayer.addChild(btnContainer);
        });
        
        // Close button
        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(menuX + menuWidth - 12, menuY + 12, 10);
        closeBtn.fill({ color: 0x444444 });
        closeBtn.stroke({ color: 0x666666, width: 1 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.hitArea = new PIXI.Circle(menuX + menuWidth - 12, menuY + 12, 10);
        
        const closeX = new PIXI.Text({
            text: "×",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xcccccc }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(menuX + menuWidth - 12, menuY + 11);
        closeX.eventMode = "none";
        
        closeBtn.on("pointerdown", () => this.hideContextMenu());
        
        this.contextMenuLayer.addChild(closeBtn);
        this.contextMenuLayer.addChild(closeX);
    }

    private hintContainer: PIXI.Container | null = null;

    // Render rotate/place controls below ghost tile
    private renderTilePlacementControls(tileX: number, tileY: number, blocked: boolean = false): void {
        // Transform to screen coordinates
        const screenX = (tileX + this.panX) * this.zoom + this.app.screen.width / 2;
        const screenY = (tileY + this.panY) * this.zoom + this.app.screen.height / 2;
        
        // Подняли кнопки ближе к тайлу (было +15, стало -5)
        const controlsY = screenY + this.HEX_SIZE * this.zoom * 0.6;
        const btnW = 50;
        const btnH = 36;
        const gap = 10;
        
        // Container for controls
        const controlsContainer = new PIXI.Container();
        controlsContainer.position.set(screenX - (btnW * 2 + gap * 1.5 + 70) / 2, controlsY);
        
        // Rotate Left button (◀)
        const rotateLeftBtn = new PIXI.Graphics();
        rotateLeftBtn.roundRect(0, 0, btnW, btnH, 8);
        rotateLeftBtn.fill({ color: 0x2d4a6d });
        rotateLeftBtn.stroke({ color: 0x4a90d9, width: 2 });
        rotateLeftBtn.eventMode = "static";
        rotateLeftBtn.cursor = "pointer";
        rotateLeftBtn.hitArea = new PIXI.Rectangle(0, 0, btnW, btnH);
        
        const rotateLeftLabel = new PIXI.Text({
            text: "◀",
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffffff }),
        });
        rotateLeftLabel.anchor.set(0.5);
        rotateLeftLabel.position.set(btnW / 2, btnH / 2);
        rotateLeftLabel.eventMode = "none";
        
        rotateLeftBtn.addChild(rotateLeftLabel);
        rotateLeftBtn.on("pointerdown", () => {
            // Rotate counter-clockwise (subtract)
            this.game.state.pendingTileRotation = (this.game.state.pendingTileRotation + 5) % 6;
            this.renderAll();
        });
        rotateLeftBtn.on("pointerover", () => {
            rotateLeftBtn.clear();
            rotateLeftBtn.roundRect(0, 0, btnW, btnH, 8);
            rotateLeftBtn.fill({ color: 0x3d6a8d });
            rotateLeftBtn.stroke({ color: 0x6ab0f9, width: 2 });
        });
        rotateLeftBtn.on("pointerout", () => {
            rotateLeftBtn.clear();
            rotateLeftBtn.roundRect(0, 0, btnW, btnH, 8);
            rotateLeftBtn.fill({ color: 0x2d4a6d });
            rotateLeftBtn.stroke({ color: 0x4a90d9, width: 2 });
        });
        
        controlsContainer.addChild(rotateLeftBtn);
        
        // Rotate Right button (▶)
        const rotateRightBtn = new PIXI.Graphics();
        rotateRightBtn.roundRect(btnW + gap, 0, btnW, btnH, 8);
        rotateRightBtn.fill({ color: 0x2d4a6d });
        rotateRightBtn.stroke({ color: 0x4a90d9, width: 2 });
        rotateRightBtn.eventMode = "static";
        rotateRightBtn.cursor = "pointer";
        rotateRightBtn.hitArea = new PIXI.Rectangle(btnW + gap, 0, btnW, btnH);
        
        const rotateRightLabel = new PIXI.Text({
            text: "▶",
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffffff }),
        });
        rotateRightLabel.anchor.set(0.5);
        rotateRightLabel.position.set(btnW + gap + btnW / 2, btnH / 2);
        rotateRightLabel.eventMode = "none";
        
        rotateRightBtn.addChild(rotateRightLabel);
        rotateRightBtn.on("pointerdown", () => {
            // Rotate clockwise (add)
            this.game.state.pendingTileRotation = (this.game.state.pendingTileRotation + 1) % 6;
            this.renderAll();
        });
        rotateRightBtn.on("pointerover", () => {
            rotateRightBtn.clear();
            rotateRightBtn.roundRect(btnW + gap, 0, btnW, btnH, 8);
            rotateRightBtn.fill({ color: 0x3d6a8d });
            rotateRightBtn.stroke({ color: 0x6ab0f9, width: 2 });
        });
        rotateRightBtn.on("pointerout", () => {
            rotateRightBtn.clear();
            rotateRightBtn.roundRect(btnW + gap, 0, btnW, btnH, 8);
            rotateRightBtn.fill({ color: 0x2d4a6d });
            rotateRightBtn.stroke({ color: 0x4a90d9, width: 2 });
        });
        
        controlsContainer.addChild(rotateRightBtn);
        
        // Place button (✓ PLACE) - disabled if blocked
        const placeBtnW = 80;
        const placeBtnX = (btnW + gap) * 2;
        const placeBtn = new PIXI.Graphics();
        placeBtn.roundRect(placeBtnX, 0, placeBtnW, btnH, 8);
        
        if (blocked) {
            // Disabled state - gray
            placeBtn.fill({ color: 0x444444 });
            placeBtn.stroke({ color: 0x666666, width: 2 });
            placeBtn.eventMode = "none";
            placeBtn.cursor = "not-allowed";
        } else {
            // Enabled state - green
            placeBtn.fill({ color: 0x2d6a4d });
            placeBtn.stroke({ color: 0x4ade80, width: 2 });
            placeBtn.eventMode = "static";
            placeBtn.cursor = "pointer";
        }
        placeBtn.hitArea = new PIXI.Rectangle(placeBtnX, 0, placeBtnW, btnH);
        
        const placeLabel = new PIXI.Text({
            text: blocked ? "🚫 BLOCKED" : "✓ PLACE",
            style: new PIXI.TextStyle({ 
                fontSize: blocked ? 11 : 13, 
                fill: blocked ? 0x888888 : 0xffffff, 
                fontWeight: "700" 
            }),
        });
        placeLabel.anchor.set(0.5);
        placeLabel.position.set(placeBtnX + placeBtnW / 2, btnH / 2);
        placeLabel.eventMode = "none";
        
        placeBtn.addChild(placeLabel);
        
        if (!blocked) {
            placeBtn.on("pointerdown", () => {
                this.game.placeTileAtSelected();
                this.renderAll();
            });
            placeBtn.on("pointerover", () => {
                placeBtn.clear();
                placeBtn.roundRect(placeBtnX, 0, placeBtnW, btnH, 8);
                placeBtn.fill({ color: 0x3d8a5d });
                placeBtn.stroke({ color: 0x6afe90, width: 2 });
            });
            placeBtn.on("pointerout", () => {
                placeBtn.clear();
                placeBtn.roundRect(placeBtnX, 0, placeBtnW, btnH, 8);
                placeBtn.fill({ color: 0x2d6a4d });
                placeBtn.stroke({ color: 0x4ade80, width: 2 });
            });
        }
        
        controlsContainer.addChild(placeBtn);
        
        // Cancel button (✕)
        const cancelBtnW = 36;
        const cancelBtnX = placeBtnX + placeBtnW + gap;
        const cancelBtn = new PIXI.Graphics();
        cancelBtn.roundRect(cancelBtnX, 0, cancelBtnW, btnH, 8);
        cancelBtn.fill({ color: 0x6a2d2d });
        cancelBtn.stroke({ color: 0xde4a4a, width: 2 });
        cancelBtn.eventMode = "static";
        cancelBtn.cursor = "pointer";
        cancelBtn.hitArea = new PIXI.Rectangle(cancelBtnX, 0, cancelBtnW, btnH);
        
        const cancelLabel = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "700" }),
        });
        cancelLabel.anchor.set(0.5);
        cancelLabel.position.set(cancelBtnX + cancelBtnW / 2, btnH / 2);
        cancelLabel.eventMode = "none";
        
        cancelBtn.addChild(cancelLabel);
        cancelBtn.on("pointerdown", () => {
            // Cancel tile placement mode
            this.game.state.uiMode = "NONE";
            this.game.state.selectedPlacementPosition = null;
            this.game.state.pendingTileRotation = 0;
            this.renderAll();
        });
        cancelBtn.on("pointerover", () => {
            cancelBtn.clear();
            cancelBtn.roundRect(cancelBtnX, 0, cancelBtnW, btnH, 8);
            cancelBtn.fill({ color: 0x8a3d3d });
            cancelBtn.stroke({ color: 0xfe6a6a, width: 2 });
        });
        cancelBtn.on("pointerout", () => {
            cancelBtn.clear();
            cancelBtn.roundRect(cancelBtnX, 0, cancelBtnW, btnH, 8);
            cancelBtn.fill({ color: 0x6a2d2d });
            cancelBtn.stroke({ color: 0xde4a4a, width: 2 });
        });
        
        controlsContainer.addChild(cancelBtn);
        
        this.contextMenuLayer.addChild(controlsContainer);
    }

    private showActionHint(text: string, x: number, y: number): void {
        if (!this.tutorialHints.isEnabled()) return;
        this.hideActionHint();
        
        this.hintContainer = new PIXI.Container();
        this.hintContainer.position.set(x, y);
        
        const hint = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({
                fontSize: 11,
                fill: 0xaaaaaa,
                fontStyle: "italic",
            }),
        });
        
        const bg = new PIXI.Graphics();
        bg.roundRect(-4, -2, hint.width + 8, hint.height + 4, 4);
        bg.fill({ color: 0x000000, alpha: 0.8 });
        
        this.hintContainer.addChild(bg);
        this.hintContainer.addChild(hint);
        this.contextMenuLayer.addChild(this.hintContainer);
    }

    private hideActionHint(): void {
        if (this.hintContainer) {
            this.contextMenuLayer.removeChild(this.hintContainer);
            this.hintContainer = null;
        }
    }

    // ===========================================
    // DICE ROLL UI
    // ===========================================

    /**
     * Show animated dice roll with interactive roll button
     * @param result The dice result to show
     * @param onComplete Callback when animation completes
     */
    public showDiceRoll(result: { swords: number; skulls: number }, onComplete?: () => void): void {
        this.diceRollUI.showDiceRoll(result, onComplete);
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================

    public showToast(message: string, type: "info" | "success" | "warning" | "error" = "info", duration = 3000): void {
        this.toastManager.showToast(message, type, duration);
    }

    // ========================================
    // TUTORIAL HINTS
    // ========================================

    private setHintsEnabled(enabled: boolean): void {
        this.tutorialHints.setEnabled(enabled);
        if (!enabled) {
            this.hideActionHint();
        }
        this.renderAll();
    }

    public showHint(id: string, title: string, message: string, options?: {
        x?: number;
        y?: number;
        anchor?: "center" | "top" | "bottom";
        showOnce?: boolean;
        highlightRect?: { x: number; y: number; width: number; height: number };
    }): void {
        this.tutorialHints.showHint(id, title, message, options);
    }

    public hideHint(): void {
        this.tutorialHints.hideHint();
    }

    // Check and show tutorial hints based on game state
    public checkTutorialHints(): void {
        this.tutorialHints.checkTutorialHints(this.game, this.myPlayerIndex);
    }

    private renderSettingsMenu(): void {
        this.settingsLayer.removeChildren();
        if (!this.settingsVisible) return;

        const screenW = this.app.renderer.width;
        const screenH = this.app.renderer.height;

        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", () => {
            this.settingsVisible = false;
            this.renderAll();
        });
        this.settingsLayer.addChild(backdrop);

        const panelW = 420;
        const panelH = 260;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;

        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: 0x4a90d9, width: 3 });
        panel.eventMode = "static";
        this.settingsLayer.addChild(panel);

        const title = new PIXI.Text({
            text: "⚙️ Settings",
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: 0xffffff,
                fontWeight: "800",
            }),
        });
        title.position.set(panelX + 20, panelY + 18);
        this.settingsLayer.addChild(title);

        const hintLabel = new PIXI.Text({
            text: "Tutorial & helper hints",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0 }),
        });
        hintLabel.position.set(panelX + 20, panelY + 80);
        this.settingsLayer.addChild(hintLabel);

        const hintDescription = new PIXI.Text({
            text: "Highlights menus and explains costs for actions.",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x6b7280 }),
        });
        hintDescription.position.set(panelX + 20, panelY + 104);
        this.settingsLayer.addChild(hintDescription);

        const toggle = new PIXI.Container();
        const toggleBg = new PIXI.Graphics();
        toggleBg.roundRect(0, 0, 80, 32, 16);
        const hintsEnabled = this.tutorialHints.isEnabled();
        toggleBg.fill({ color: hintsEnabled ? 0x22c55e : 0x374151, alpha: 0.95 });
        toggleBg.stroke({ color: hintsEnabled ? 0x4ade80 : 0x4b5563, width: 2 });

        const toggleText = new PIXI.Text({
            text: hintsEnabled ? "ON" : "OFF",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "700" }),
        });
        toggleText.anchor.set(0.5);
        toggleText.position.set(40, 16);
        toggleText.eventMode = "none";

        toggle.addChild(toggleBg);
        toggle.addChild(toggleText);
        toggle.position.set(panelX + panelW - 110, panelY + 78);
        toggle.eventMode = "static";
        toggle.cursor = "pointer";
        toggle.on("pointerdown", () => {
            this.setHintsEnabled(!hintsEnabled);
        });

        this.settingsLayer.addChild(toggle);

        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            this.settingsVisible = false;
            this.renderAll();
        });
        this.settingsLayer.addChild(closeBtn);

        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        this.settingsLayer.addChild(closeX);
    }

    // ========================================
    // TOKEN REWARD UI (Choose item after combat)
    // ========================================

    private checkPendingTokenRewards(): void {
        if (this.isTokenRewardVisible) return;
        
        // Don't show popups during reconnection protection period
        if (this.reconnectProtectionActive) return;

        const myPlayer = this.game.state.players[this.myPlayerIndex];
        const activePlayer = this.game.state.players[this.game.state.currentPlayerIndex];
        
        // v0.4: Check if there's a pending reward CHOICE
        const pendingChoice = this.game.state.pendingRewardChoice;
        
        if (this.isMyTurn) {
            // My turn - show interactive UI
            if (!myPlayer) return;

            if (pendingChoice && pendingChoice.playerId === myPlayer.id) {
                this.showRewardChoiceUI(pendingChoice);
                return;
            }

            // Check if player has pending tokens (from standard reward)
            if (myPlayer.pendingTokens && myPlayer.pendingTokens.length > 0) {
                const nextToken = myPlayer.pendingTokens[0];
                this.showTokenRewardUI(nextToken);
            } else {
                this.hideOtherPlayerStatus();
            }
        } else {
            // Not my turn - show status of what active player is doing
            if (!activePlayer) return;
            
            if (pendingChoice) {
                this.showOtherPlayerStatus(`${activePlayer.id} is choosing a reward...`, "🎁");
                return;
            }
            
            if (activePlayer.pendingTokens && activePlayer.pendingTokens.length > 0) {
                this.showOtherPlayerStatus(`${activePlayer.id} is selecting equipment...`, "🗡️");
                return;
            }
            
            // Clear status if nothing pending
            this.hideOtherPlayerStatus();
        }
    }
    
    private otherPlayerStatusContainer: PIXI.Container | null = null;
    
    private showOtherPlayerStatus(message: string, emoji: string): void {
        this.hideOtherPlayerStatus();
        
        const screenW = this.app.screen.width;
        
        this.otherPlayerStatusContainer = new PIXI.Container();
        
        // Background panel
        const bg = new PIXI.Graphics();
        const panelW = 300;
        const panelH = 50;
        const panelX = (screenW - panelW) / 2;
        const panelY = 120;
        
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x2a2a4e, alpha: 0.95 });
        bg.stroke({ color: 0xffd700, width: 2 });
        this.otherPlayerStatusContainer.addChild(bg);
        
        // Status text
        const text = new PIXI.Text({
            text: `${emoji} ${message}`,
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffffff,
                fontWeight: "bold",
            }),
        });
        text.anchor.set(0.5);
        text.position.set(panelX + panelW / 2, panelY + panelH / 2);
        this.otherPlayerStatusContainer.addChild(text);
        
        this.hudLayer.addChild(this.otherPlayerStatusContainer);
    }
    
    private hideOtherPlayerStatus(): void {
        if (this.otherPlayerStatusContainer) {
            this.otherPlayerStatusContainer.destroy({ children: true });
            this.otherPlayerStatusContainer = null;
        }
    }

    private showTokenRewardUI(token: import("../board/TileDeck").TokenType): void {
        import("../entities/Item").then(({ getItemsForToken }) => {
            const items = getItemsForToken(token);
            
            // If no items to choose (shouldn't happen for valid tokens)
            if (items.length === 0) {
                // Remove token from pending
                const player = this.game.state.players[this.myPlayerIndex];
                if (player && player.pendingTokens.length > 0) {
                    player.pendingTokens.shift();
                }
                return;
            }

            this.isTokenRewardVisible = true;
            this.tokenRewardLayer.removeChildren();

            const screenW = this.app.screen.width;
            const screenH = this.app.screen.height;

            // Semi-transparent backdrop
            const backdrop = new PIXI.Graphics();
            backdrop.rect(0, 0, screenW, screenH);
            backdrop.fill({ color: 0x000000, alpha: 0.7 });
            backdrop.eventMode = "static";
            this.tokenRewardLayer.addChild(backdrop);

            // Modal container
            const modalW = Math.min(600, screenW - 40);
            const modalH = 400;
            const modalX = (screenW - modalW) / 2;
            const modalY = (screenH - modalH) / 2;

            const modal = new PIXI.Graphics();
            modal.roundRect(modalX, modalY, modalW, modalH, 16);
            modal.fill({ color: 0x1a1a2e });
            modal.stroke({ color: 0x4a90d9, width: 3 });
            this.tokenRewardLayer.addChild(modal);

            // Title
            const tokenEmoji = token === "CommonLoot" ? "📦" : 
                              token === "UncommonLoot" ? "🎁" :
                              token === "SpellToken" ? "✨" : "🏆";
            const title = new PIXI.Text({
                text: `${tokenEmoji} ${token.replace(/([A-Z])/g, ' $1').trim()} Reward`,
                style: new PIXI.TextStyle({
                    fontSize: 24,
                    fill: 0xffd700,
                    fontFamily: "Arial",
                    fontWeight: "bold",
                }),
            });
            title.anchor.set(0.5, 0);
            title.position.set(screenW / 2, modalY + 20);
            this.tokenRewardLayer.addChild(title);

            // Subtitle
            const subtitle = new PIXI.Text({
                text: "Choose one item:",
                style: new PIXI.TextStyle({
                    fontSize: 16,
                    fill: 0xaaaaaa,
                }),
            });
            subtitle.anchor.set(0.5, 0);
            subtitle.position.set(screenW / 2, modalY + 55);
            this.tokenRewardLayer.addChild(subtitle);

            // Item cards
            const cardW = 150;
            const cardH = 220;
            const cardSpacing = 20;
            const totalCardsW = items.length * cardW + (items.length - 1) * cardSpacing;
            const cardsStartX = (screenW - totalCardsW) / 2;
            const cardsY = modalY + 90;

            items.forEach((item, index) => {
                const cardX = cardsStartX + index * (cardW + cardSpacing);

                // Card background
                const card = new PIXI.Graphics();
                card.roundRect(cardX, cardsY, cardW, cardH, 12);
                
                const bgColor = item.rarity === "legendary" ? 0x4a3000 :
                               item.rarity === "uncommon" ? 0x2a3a4a : 0x2a2a3a;
                card.fill({ color: bgColor });
                
                const borderColor = item.rarity === "legendary" ? 0xffd700 :
                                   item.rarity === "uncommon" ? 0x4a90d9 : 0x5a5a7a;
                card.stroke({ color: borderColor, width: 2 });
                
                card.eventMode = "static";
                card.cursor = "pointer";
                this.tokenRewardLayer.addChild(card);

                // Item emoji
                const emoji = new PIXI.Text({
                    text: item.emoji,
                    style: new PIXI.TextStyle({ fontSize: 48 }),
                });
                emoji.anchor.set(0.5);
                emoji.position.set(cardX + cardW / 2, cardsY + 45);
                this.tokenRewardLayer.addChild(emoji);

                // Item name
                const name = new PIXI.Text({
                    text: item.name,
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: 0xffffff,
                        fontWeight: "bold",
                        wordWrap: true,
                        wordWrapWidth: cardW - 16,
                        align: "center",
                    }),
                });
                name.anchor.set(0.5, 0);
                name.position.set(cardX + cardW / 2, cardsY + 80);
                this.tokenRewardLayer.addChild(name);

                // Item type
                const typeLabel = new PIXI.Text({
                    text: item.type.toUpperCase(),
                    style: new PIXI.TextStyle({
                        fontSize: 10,
                        fill: borderColor,
                    }),
                });
                typeLabel.anchor.set(0.5, 0);
                typeLabel.position.set(cardX + cardW / 2, cardsY + 105);
                this.tokenRewardLayer.addChild(typeLabel);

                // Item description
                const desc = new PIXI.Text({
                    text: item.description,
                    style: new PIXI.TextStyle({
                        fontSize: 11,
                        fill: 0xaaaaaa,
                        wordWrap: true,
                        wordWrapWidth: cardW - 16,
                        align: "center",
                    }),
                });
                desc.anchor.set(0.5, 0);
                desc.position.set(cardX + cardW / 2, cardsY + 125);
                this.tokenRewardLayer.addChild(desc);

                // Hover effect
                card.on("pointerover", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: 0x3a3a5a });
                    card.stroke({ color: 0xffffff, width: 3 });
                });

                card.on("pointerout", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: bgColor });
                    card.stroke({ color: borderColor, width: 2 });
                });

                // Click to select item
                card.on("pointerdown", () => {
                    this.selectTokenReward(item);
                });
            });
        });
    }

    private selectTokenReward(item: import("../entities/Item").Item): void {
        const player = this.game.state.players[this.myPlayerIndex];
        if (!player) return;

        // Remove token from pending
        if (player.pendingTokens.length > 0) {
            player.pendingTokens.shift();
        }

        // Add item to inventory based on type
        if (item.type === "weapon") {
            // Find empty weapon slot
            const emptySlot = player.inventory.weapons.findIndex(w => w === null);
            if (emptySlot >= 0) {
                player.inventory.weapons[emptySlot] = item;
            } else {
                // Weapons full - could show swap UI, for now just add anyway
                player.inventory.weapons[0] = item;
            }
        } else if (item.type === "spell") {
            // Find empty spell slot
            const emptySlot = player.inventory.spells.findIndex(s => s === null);
            if (emptySlot >= 0) {
                player.inventory.spells[emptySlot] = item;
            } else {
                player.inventory.spells[0] = item;
            }
        } else if (item.type === "amulet") {
            player.inventory.amulet = item;
        }

        // Apply immediate effects
        if (item.effectId === "reinforced_suit") {
            player.maxHp += 1;
            player.hp += 1;
        }

        this.game.addLog(`${player.id} chose ${item.emoji} ${item.name}`);
        this.showToast(`${item.emoji} ${item.name} added to inventory!`, "success");

        // Hide UI
        this.hideTokenRewardUI();
        
        // Check if more tokens pending, or finish turn
        this.game.finishTokenSelection();
        
        this.renderAll();
    }

    private hideTokenRewardUI(): void {
        this.isTokenRewardVisible = false;
        this.tokenRewardLayer.removeChildren();
    }

    // ========================================
    // REWARD CHOICE UI (v0.4 - Choose after combat)
    // ========================================

    private showRewardChoiceUI(pending: { playerId: string; monsterTier: number; standardReward: { prestige: number; tokens: string[] } }): void {
        this.isTokenRewardVisible = true;
        this.tokenRewardLayer.removeChildren();

        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;
        const player = this.game.state.players.find(p => p.id === pending.playerId);
        if (!player) return;

        // Semi-transparent backdrop
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.7 });
        backdrop.eventMode = "static";
        this.tokenRewardLayer.addChild(backdrop);

        // Modal container
        const modalW = Math.min(550, screenW - 40);
        const modalH = 320;
        const modalX = (screenW - modalW) / 2;
        const modalY = (screenH - modalH) / 2;

        const modal = new PIXI.Graphics();
        modal.roundRect(modalX, modalY, modalW, modalH, 16);
        modal.fill({ color: 0x1a1a2e });
        modal.stroke({ color: 0xffd700, width: 3 });
        this.tokenRewardLayer.addChild(modal);

        // Title
        const title = new PIXI.Text({
            text: `🎉 Victory! Tier ${pending.monsterTier} Threat Defeated`,
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: 0xffd700,
                fontFamily: "Arial",
                fontWeight: "bold",
            }),
        });
        title.anchor.set(0.5, 0);
        title.position.set(screenW / 2, modalY + 20);
        this.tokenRewardLayer.addChild(title);

        // Subtitle
        const subtitle = new PIXI.Text({
            text: "Choose your reward:",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xaaaaaa,
            }),
        });
        subtitle.anchor.set(0.5, 0);
        subtitle.position.set(screenW / 2, modalY + 55);
        this.tokenRewardLayer.addChild(subtitle);

        // Three reward options
        const cardW = 150;
        const cardH = 180;
        const cardSpacing = 20;
        const totalCardsW = 3 * cardW + 2 * cardSpacing;
        const cardsStartX = (screenW - totalCardsW) / 2;
        const cardsY = modalY + 90;

        const canPush = player.prestige < 10;
        const canRecover = player.hp < player.maxHp;

        const options = [
            {
                key: "standard",
                emoji: "🎖",
                label: "Standard",
                desc: `+${pending.standardReward.prestige} Prestige\n${pending.standardReward.tokens.length > 0 ? `+${pending.standardReward.tokens.length} Token(s)` : ""}`,
                color: 0x2563eb,
                enabled: true,
            },
            {
                key: "recover",
                emoji: "❤️",
                label: "Recover",
                desc: "+2 HP\n(Heal wounds)",
                color: 0x22c55e,
                enabled: canRecover,
            },
            {
                key: "push",
                emoji: "⭐",
                label: "Push Forward",
                desc: `+${pending.standardReward.prestige + 1} Prestige\n(No tokens)`,
                color: 0xfbbf24,
                enabled: canPush,
            },
        ];

        options.forEach((opt, index) => {
            const cardX = cardsStartX + index * (cardW + cardSpacing);

            const card = new PIXI.Graphics();
            card.roundRect(cardX, cardsY, cardW, cardH, 12);
            card.fill({ color: opt.enabled ? opt.color : 0x333344, alpha: opt.enabled ? 1 : 0.5 });
            card.stroke({ color: opt.enabled ? 0xffffff : 0x555555, width: 2 });
            
            if (opt.enabled) {
                card.eventMode = "static";
                card.cursor = "pointer";
            }
            this.tokenRewardLayer.addChild(card);

            // Emoji
            const emoji = new PIXI.Text({
                text: opt.emoji,
                style: new PIXI.TextStyle({ fontSize: 40 }),
            });
            emoji.anchor.set(0.5);
            emoji.position.set(cardX + cardW / 2, cardsY + 40);
            emoji.alpha = opt.enabled ? 1 : 0.5;
            this.tokenRewardLayer.addChild(emoji);

            // Label
            const label = new PIXI.Text({
                text: opt.label,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: opt.enabled ? 0xffffff : 0x888888,
                    fontWeight: "bold",
                }),
            });
            label.anchor.set(0.5, 0);
            label.position.set(cardX + cardW / 2, cardsY + 75);
            this.tokenRewardLayer.addChild(label);

            // Description
            const desc = new PIXI.Text({
                text: opt.desc,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: opt.enabled ? 0xcccccc : 0x666666,
                    align: "center",
                }),
            });
            desc.anchor.set(0.5, 0);
            desc.position.set(cardX + cardW / 2, cardsY + 100);
            this.tokenRewardLayer.addChild(desc);

            // Disabled reason
            if (!opt.enabled) {
                const reason = opt.key === "recover" ? "(HP Full)" : "(10+ Prestige)";
                const reasonText = new PIXI.Text({
                    text: reason,
                    style: new PIXI.TextStyle({
                        fontSize: 10,
                        fill: 0xff6666,
                    }),
                });
                reasonText.anchor.set(0.5, 0);
                reasonText.position.set(cardX + cardW / 2, cardsY + cardH - 25);
                this.tokenRewardLayer.addChild(reasonText);
            }

            // Click handler
            if (opt.enabled) {
                card.on("pointerover", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: 0x4a4a6a });
                    card.stroke({ color: 0xffd700, width: 3 });
                });

                card.on("pointerout", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: opt.color });
                    card.stroke({ color: 0xffffff, width: 2 });
                });

                card.on("pointerdown", () => {
                    this.game.chooseReward(opt.key as "standard" | "recover" | "push");
                    this.hideTokenRewardUI();
                    this.renderAll();
                });
            }
        });
    }
}
