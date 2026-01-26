import * as PIXI from "pixi.js";
import type { Game } from "../core/Game";
import type { HexCoord } from "../board/Hex";
import { hexKey, neighbors } from "../board/Hex";
import { TileType } from "../board/TileTypes";
import { canMoveBetween } from "../board/BlockedEdges";
import { type EdgeIndex, getEdgeVertices } from "../board/HexEdges";
import type { Tile } from "../board/Tile";
import { GAME_VERSION } from "../assets/AssetLoader";

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
    private diceResult: { swords: number; skulls: number } | null = null;
    private diceCallback: (() => void) | null = null;

    // Context Menu (actions on tile)
    private contextMenuLayer = new PIXI.Container();
    private contextMenuVisible = false;
    private contextMenuTile: HexCoord | null = null;

    // Toast notifications
    private toastLayer = new PIXI.Container();
    private activeToasts: { container: PIXI.Container; timer: number }[] = [];

    // Tutorial hints (persisted in localStorage)
    private tutorialLayer = new PIXI.Container();
    private shownHints: Set<string>;
    private currentHint: PIXI.Container | null = null;
    private static HINTS_STORAGE_KEY = "cosmic_frontier_hints";

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

        // Load shown hints from localStorage
        this.shownHints = this.loadShownHints();

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

        this.app.stage.addChild(this.tokenRewardLayer); // Token reward choice UI
        this.tokenRewardLayer.zIndex = 480;

        this.app.stage.addChild(this.tutorialLayer); // Tutorial hints
        this.tutorialLayer.zIndex = 500;

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
        const versionText = new PIXI.Text({
            text: GAME_VERSION,
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: 0x555555,
                fontFamily: "monospace",
            }),
        });
        versionText.position.set(60, 18); // Right of debug button
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
        this.renderBuildMenu(); // BUILD MENU modal
        this.renderCraftMenu(); // v0.5: CRAFT MENU modal
        this.renderFinalPhaseBanner(); // v0.5: Final Phase banner
        this.renderDebugPanel(); // Debug Panel
        this.checkPendingTokenRewards(); // Token reward UI
        
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
        if (here.type !== TileType.Resource) return false;
        if (here.encounterActive === true) return false;
        
        // Нельзя собирать ресурсы на клетке с городом!
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

        // Landing Hub
        if (tile.type === TileType.LandingHub) return "🚀";
        
        // Player's Base
        if (tile.ownerId) {
            return "🏰";
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
        const p = this.game.state.players[this.game.state.currentPlayerIndex];

        // нижняя панель (compact - all controls on tiles now)
        const panelH = 60;
        const panelY = this.app.renderer.height - panelH;
        const panelW = this.app.renderer.width;

        // фон панели
        this.hudBg.clear();
        this.hudBg.roundRect(0, panelY, panelW, panelH, 0);
        this.hudBg.fill({ color: 0x000000, alpha: 0.28 });
        this.hudBg.stroke({ color: 0xffffff, alpha: 0.12, width: 1 });

        // текст слева
        let statusLine = `Turn: ${p.id}   AP: ${this.game.state.actionPoints}   Round: ${this.game.state.round}`;
        
        // Multiplayer: show "waiting" indicator if not my turn
        if (!this.isMyTurn) {
            statusLine += `   ⏳ Waiting for ${p.id}...`;
        }
        
        // Final Phase indicator
        if (this.game.state.isFinalPhase) {
            statusLine += `   🚨 FINAL PHASE (${this.game.state.finalRoundsLeft} rounds)`;
            statusLine += `   👾 Threat: ${this.game.state.finalThreatHp}/40 HP`;
        }
        
        // Game Over
        if (this.game.state.gameOver) {
            if (this.game.state.missionFailed) {
                statusLine = `💀 MISSION FAILED! Final Threat survived (${this.game.state.finalThreatHp} HP)`;
            } else {
                statusLine = `🏆 VICTORY! ${this.game.state.winnerId} defeated the Final Threat!`;
            }
        }
        
        this.hudText.text =
            statusLine + `\n` +
            `HP: ${p.hp}   🧬${p.biomass}   🧱${p.materials}   ⚙${p.alloys}   ⭐${p.prestige}`;

        this.hudText.position.set(16, panelY + 14);

        // Hide old HUD buttons (now using on-tile controls)
        this.rotateButton.bg.visible = false;
        this.rotateButton.label.visible = false;
        this.placeTileButton.bg.visible = false;
        this.placeTileButton.label.visible = false;

    }

    // --------------------
    // Hero Board (v0.5 - Redesigned)
    // --------------------
    private renderHeroBoard() {
        // Show MY player's Hero Board (not the current turn player)
        const playerIndex = this.myPlayerIndex;
        const p = this.game.state.players[playerIndex];
        if (!p) return;
        
        const playerColor = this.PLAYER_COLORS[playerIndex % this.PLAYER_COLORS.length];
        
        this.heroBoardLayer.removeChildren();

        // Wider panel for better layout
        const panelW = 380;
        const panelH = 420;
        const panelX = this.app.renderer.width - panelW - 16;
        const panelY = 16;

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x1a1f2e, alpha: 0.98 });
        bg.stroke({ color: playerColor, width: 4, alpha: 1 });
        this.heroBoardLayer.addChild(bg);

        // Inner frame
        const innerFrame = new PIXI.Graphics();
        innerFrame.roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 8);
        innerFrame.stroke({ color: playerColor, width: 1, alpha: 0.3 });
        this.heroBoardLayer.addChild(innerFrame);

        // ═══════════════════════════════════════
        // HEADER: Player name + Prestige
        // ═══════════════════════════════════════
        const titleBg = new PIXI.Graphics();
        titleBg.roundRect(panelX + 12, panelY + 10, panelW - 24, 36, 6);
        titleBg.fill({ color: 0x2d3748, alpha: 0.8 });
        titleBg.stroke({ color: playerColor, width: 2, alpha: 0.7 });
        this.heroBoardLayer.addChild(titleBg);

        const title = new PIXI.Text({
            text: `${p.id}`,
            style: new PIXI.TextStyle({
                fontSize: 18,
                fill: playerColor,
                fontWeight: "800",
            }),
        });
        title.position.set(panelX + 20, panelY + 18);
        this.heroBoardLayer.addChild(title);

        // Prestige badge
        const gloryText = new PIXI.Text({
            text: `⭐ ${p.prestige} Prestige`,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0xffd700,
                fontWeight: "700",
            }),
        });
        gloryText.anchor.set(1, 0);
        gloryText.position.set(panelX + panelW - 20, panelY + 19);
        this.heroBoardLayer.addChild(gloryText);

        let yOffset = panelY + 52;

        // ═══════════════════════════════════════
        // ROW 1: HP + Resources (single row)
        // ═══════════════════════════════════════
        this.renderDivider(panelX + 12, yOffset, panelW - 24);
        yOffset += 8;

        // HP hearts (compact)
        this.renderLifeTokensCompact(p, panelX + 16, yOffset);
        
        // Resources on the right side
        const resourceX = panelX + 140;
        const resources = [
            { emoji: "🧬", value: p.biomass, color: 0x00ff88 },
            { emoji: "🧱", value: p.materials, color: 0xd97706 },
            { emoji: "⚙", value: p.alloys, color: 0x708090 },
            { emoji: "🧩", value: p.components, color: 0x9333ea },
        ];
        
        let rx = 0;
        for (const res of resources) {
            const text = new PIXI.Text({
                text: `${res.emoji}${res.value}`,
                style: new PIXI.TextStyle({ fontSize: 14, fill: res.color, fontWeight: "700" }),
            });
            text.position.set(resourceX + rx, yOffset + 2);
            this.heroBoardLayer.addChild(text);
            rx += 55;
        }
        
        yOffset += 35;

        // ═══════════════════════════════════════
        // ROW 2: Base Modules (built at base)
        // ═══════════════════════════════════════
        this.renderDivider(panelX + 12, yOffset, panelW - 24);
        yOffset += 8;
        
        this.renderSectionHeader("🏠 BASE MODULES", panelX + 16, yOffset, 0x60a5fa);
        yOffset += 22;
        this.renderModuleTokensCompact(p, panelX + 16, yOffset, panelW - 32);
        yOffset += 40;

        // ═══════════════════════════════════════
        // ROW 3: Combat Units
        // ═══════════════════════════════════════
        this.renderDivider(panelX + 12, yOffset, panelW - 24);
        yOffset += 8;
        
        this.renderSectionHeader("🤖 COMBAT UNITS", panelX + 16, yOffset, 0x3b82f6);
        yOffset += 22;
        this.renderUnitsCompact(p, panelX + 16, yOffset, panelW - 32);
        yOffset += 45;

        // ═══════════════════════════════════════
        // ROW 4: Equipment (Weapons + Modules + Amulet)
        // ═══════════════════════════════════════
        this.renderDivider(panelX + 12, yOffset, panelW - 24);
        yOffset += 8;
        
        this.renderSectionHeader("⚔ EQUIPMENT", panelX + 16, yOffset, 0xfbbf24);
        yOffset += 22;
        this.renderEquipmentCompact(p, panelX + 16, yOffset, panelW - 32);
        yOffset += 120;
    }
    
    private renderSectionHeader(text: string, x: number, y: number, color: number) {
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
    
    private renderLifeTokensCompact(p: { hp: number; maxHp: number }, x: number, y: number) {
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
    
    private renderModuleTokensCompact(p: { modules: string[] }, x: number, y: number, _width: number) {
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
    
    private renderUnitsCompact(p: import("../entities/Player").Player, x: number, y: number, _width: number) {
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
    
    private renderEquipmentCompact(p: import("../entities/Player").Player, x: number, y: number, _width: number) {
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
    
    private renderDivider(x: number, y: number, width: number) {
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
        this.buildMenuLayer.removeChildren();
        
        // Показываем только в режиме BUILD_MENU
        if (this.game.state.uiMode !== "BUILD_MENU") return;
        
        const p = this.game.state.players[this.game.state.currentPlayerIndex];
        const playerIndex = this.game.state.currentPlayerIndex;
        const playerColor = this.PLAYER_COLORS[playerIndex % this.PLAYER_COLORS.length];
        
        const screenW = this.app.renderer.width;
        const screenH = this.app.renderer.height;
        
        // Затемнение фона (backdrop)
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", () => {
            this.game.state.uiMode = "NONE";
            this.renderAll();
        });
        this.buildMenuLayer.addChild(backdrop);
        
        // Панель меню
        const panelW = 420;
        const panelH = 520;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;
        
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: playerColor, width: 4, alpha: 1 });
        panel.eventMode = "static"; // Блокируем клики на backdrop
        this.buildMenuLayer.addChild(panel);
        
        // Заголовок
        const isBase = this.game.canBuildBase();
        const titleText = isBase ? "🏠 Build Base" : "🏗 Build Modules";
        
        const title = new PIXI.Text({
            text: titleText,
            style: new PIXI.TextStyle({
                fontSize: 24,
                fill: playerColor,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 4, color: 0x000000, distance: 3 },
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        this.buildMenuLayer.addChild(title);
        
        // Ресурсы игрока
        const resourceText = new PIXI.Text({
            text: `Your resources: 🧱${p.materials}  ⚙${p.alloys}  🧬${p.biomass}`,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0, fontWeight: "600" }),
        });
        resourceText.position.set(panelX + 20, panelY + 50);
        this.buildMenuLayer.addChild(resourceText);
        
        // Кнопка закрыть
        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            this.game.state.uiMode = "NONE";
            this.renderAll();
        });
        this.buildMenuLayer.addChild(closeBtn);
        
        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        this.buildMenuLayer.addChild(closeX);
        
        let yOffset = panelY + 80;
        
        if (isBase) {
            // Show Base card
            this.renderBuildingCard(panelX + 16, yOffset, panelW - 32, {
                name: "Base",
                emoji: "🏠",
                cost: "2 🧱",
                effect: "Your base - build modules here",
                canAfford: p.materials >= 2,
                onBuild: () => {
                    this.game.doBuildBase();
                    this.game.state.uiMode = "NONE";
                    this.renderAll();
                },
            });
        } else {
            // Показываем все здания (districts)
            const buildings = [
                { type: "AssaultBay", emoji: "⚔️", name: "Assault Bay", cost: "2🧱 1⚙", effect: "+1 damage on ⚔ roll", costCheck: p.materials >= 2 && p.alloys >= 1 },
                { type: "ShieldArray", emoji: "🛡️", name: "Shield Array", cost: "2🧱 1⚙", effect: "Ignore 1 💀 per combat", costCheck: p.materials >= 2 && p.alloys >= 1 },
                { type: "TacticalUplink", emoji: "📡", name: "Tactical Uplink", cost: "1🧱 2⚙", effect: "1 reroll per combat", costCheck: p.materials >= 1 && p.alloys >= 2 },
                { type: "SupplyDepot", emoji: "📦", name: "Supply Depot", cost: "3🧱", effect: "+1 resource on Gather", costCheck: p.materials >= 3 },
                { type: "RelicVault", emoji: "🔮", name: "Relic Vault", cost: "2🧱 2⚙", effect: "Activates relics", costCheck: p.materials >= 2 && p.alloys >= 2 },
                { type: "BeaconSpire", emoji: "📡", name: "Beacon Spire", cost: "3🧱 3⚙", effect: "Ultimate power", costCheck: p.materials >= 3 && p.alloys >= 3 },
            ];
            
            for (const b of buildings) {
                const alreadyBuilt = p.modules.includes(b.type as any);
                
                this.renderBuildingCard(panelX + 16, yOffset, panelW - 32, {
                    name: b.name,
                    emoji: b.emoji,
                    cost: b.cost,
                    effect: b.effect,
                    canAfford: b.costCheck && !alreadyBuilt,
                    alreadyBuilt,
                    onBuild: () => {
                        this.game.doBuildModules([b.type as any]);
                        this.renderAll(); // Обновляем UI, не закрываем меню
                    },
                });
                
                yOffset += 68;
            }
        }
    }
    
    private renderBuildingCard(
        x: number, 
        y: number, 
        w: number, 
        options: {
            name: string;
            emoji: string;
            cost: string;
            effect: string;
            canAfford: boolean;
            alreadyBuilt?: boolean;
            onBuild: () => void;
        }
    ) {
        const h = 60;
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, w, h, 10);
        
        if (options.alreadyBuilt) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.5 });
            cardBg.stroke({ color: 0x48bb78, width: 2, alpha: 0.8 });
        } else if (options.canAfford) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0xffd700, width: 2, alpha: 0.8 });
        } else {
            cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
            cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
        }
        this.buildMenuLayer.addChild(cardBg);
        
        // Emoji
        const emoji = new PIXI.Text({
            text: options.emoji,
            style: new PIXI.TextStyle({ fontSize: 28 }),
        });
        emoji.position.set(x + 16, y + 14);
        this.buildMenuLayer.addChild(emoji);
        
        // Name
        const name = new PIXI.Text({
            text: options.name,
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: options.alreadyBuilt ? 0x48bb78 : (options.canAfford ? 0xffffff : 0x718096),
                fontWeight: "700",
            }),
        });
        name.position.set(x + 56, y + 10);
        this.buildMenuLayer.addChild(name);
        
        // Effect
        const effect = new PIXI.Text({
            text: options.effect,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xa0aec0, fontWeight: "400" }),
        });
        effect.position.set(x + 56, y + 32);
        this.buildMenuLayer.addChild(effect);
        
        // Cost
        const cost = new PIXI.Text({
            text: options.cost,
            style: new PIXI.TextStyle({ 
                fontSize: 13, 
                fill: options.canAfford ? 0x48bb78 : 0xe53e3e, 
                fontWeight: "600" 
            }),
        });
        cost.anchor.set(1, 0);
        cost.position.set(x + w - 80, y + 12);
        this.buildMenuLayer.addChild(cost);
        
        // Build button
        if (!options.alreadyBuilt) {
            const btnW = 60;
            const btnH = 28;
            const btnX = x + w - btnW - 10;
            const btnY = y + (h - btnH) / 2;
            
            const btn = new PIXI.Graphics();
            btn.roundRect(btnX, btnY, btnW, btnH, 6);
            
            if (options.canAfford) {
                btn.fill({ color: 0x48bb78, alpha: 1 });
                btn.stroke({ color: 0x68d391, width: 2 });
                btn.eventMode = "static";
                btn.cursor = "pointer";
                btn.on("pointerdown", options.onBuild);
            } else {
                btn.fill({ color: 0x4a5568, alpha: 0.5 });
            }
            this.buildMenuLayer.addChild(btn);
            
            const btnText = new PIXI.Text({
                text: "BUILD",
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: options.canAfford ? 0xffffff : 0x718096,
                    fontWeight: "800",
                }),
            });
            btnText.anchor.set(0.5);
            btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
            this.buildMenuLayer.addChild(btnText);
        } else {
            // Already built badge
            const badge = new PIXI.Text({
                text: "✓ BUILT",
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x48bb78, fontWeight: "700" }),
            });
            badge.anchor.set(1, 0.5);
            badge.position.set(x + w - 16, y + h / 2);
            this.buildMenuLayer.addChild(badge);
        }
    }

    // --------------------
    // Craft Menu (v0.5)
    // --------------------
    private renderCraftMenu() {
        this.craftMenuLayer.removeChildren();
        
        // Only show in CRAFT_MENU mode
        if (this.game.state.uiMode !== "CRAFT_MENU") return;
        
        const p = this.game.state.players[this.game.state.currentPlayerIndex];
        const playerIndex = this.game.state.currentPlayerIndex;
        const playerColor = this.PLAYER_COLORS[playerIndex % this.PLAYER_COLORS.length];
        
        const screenW = this.app.renderer.width;
        const screenH = this.app.renderer.height;
        
        // Backdrop
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", () => {
            this.game.state.uiMode = "NONE";
            this.renderAll();
        });
        this.craftMenuLayer.addChild(backdrop);
        
        // Panel
        const panelW = 450;
        const panelH = 550;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;
        
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: playerColor, width: 4, alpha: 1 });
        panel.eventMode = "static";
        this.craftMenuLayer.addChild(panel);
        
        // Title
        const title = new PIXI.Text({
            text: "🔧 Craft Items",
            style: new PIXI.TextStyle({
                fontSize: 24,
                fill: playerColor,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 4, color: 0x000000, distance: 3 },
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        this.craftMenuLayer.addChild(title);
        
        // Resources
        const resourceText = new PIXI.Text({
            text: `Your resources: 🧩${p.components}  ⚙${p.alloys}  🧱${p.materials}  ⭐${p.prestige}`,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0, fontWeight: "600" }),
        });
        resourceText.position.set(panelX + 20, panelY + 50);
        this.craftMenuLayer.addChild(resourceText);
        
        // Close button
        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            this.game.state.uiMode = "NONE";
            this.renderAll();
        });
        this.craftMenuLayer.addChild(closeBtn);
        
        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        this.craftMenuLayer.addChild(closeX);
        
        let yOffset = panelY + 80;
        
        // Get all recipes
        const allRecipes = this.game.getAllCraftRecipes();
        
        for (const recipe of allRecipes) {
            const canCraft = p.components >= recipe.cost.components && 
                             p.alloys >= recipe.cost.alloys &&
                             p.materials >= recipe.cost.materials &&
                             p.prestige >= recipe.cost.prestige;
            
            this.renderCraftCard(panelX + 16, yOffset, panelW - 32, {
                name: recipe.name,
                emoji: recipe.emoji,
                cost: this.formatCraftCost(recipe.cost),
                effect: recipe.description,
                canAfford: canCraft,
                onCraft: () => {
                    this.game.doCraft(recipe.id);
                    this.renderAll();
                },
            });
            
            yOffset += 62;
        }
    }
    
    private formatCraftCost(cost: { components: number; alloys: number; materials: number; prestige: number }): string {
        const parts: string[] = [];
        if (cost.components > 0) parts.push(`${cost.components}🧩`);
        if (cost.alloys > 0) parts.push(`${cost.alloys}⚙`);
        if (cost.materials > 0) parts.push(`${cost.materials}🧱`);
        if (cost.prestige > 0) parts.push(`${cost.prestige}⭐`);
        return parts.join(" ");
    }
    
    private renderCraftCard(
        x: number, 
        y: number, 
        w: number, 
        options: {
            name: string;
            emoji: string;
            cost: string;
            effect: string;
            canAfford: boolean;
            onCraft: () => void;
        }
    ) {
        const h = 55;
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, w, h, 10);
        
        if (options.canAfford) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0x9333ea, width: 2, alpha: 0.8 }); // Purple for crafting
        } else {
            cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
            cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
        }
        this.craftMenuLayer.addChild(cardBg);
        
        // Emoji
        const emoji = new PIXI.Text({
            text: options.emoji,
            style: new PIXI.TextStyle({ fontSize: 24 }),
        });
        emoji.position.set(x + 12, y + 14);
        this.craftMenuLayer.addChild(emoji);
        
        // Name
        const name = new PIXI.Text({
            text: options.name,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: options.canAfford ? 0xffffff : 0x718096,
                fontWeight: "700",
            }),
        });
        name.position.set(x + 48, y + 8);
        this.craftMenuLayer.addChild(name);
        
        // Effect
        const effect = new PIXI.Text({
            text: options.effect,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xa0aec0, fontWeight: "400" }),
        });
        effect.position.set(x + 48, y + 28);
        this.craftMenuLayer.addChild(effect);
        
        // Cost
        const cost = new PIXI.Text({
            text: options.cost,
            style: new PIXI.TextStyle({ 
                fontSize: 12, 
                fill: options.canAfford ? 0x48bb78 : 0xe53e3e, 
                fontWeight: "600" 
            }),
        });
        cost.anchor.set(1, 0);
        cost.position.set(x + w - 80, y + 10);
        this.craftMenuLayer.addChild(cost);
        
        // Craft button
        const btnW = 60;
        const btnH = 26;
        const btnX = x + w - btnW - 10;
        const btnY = y + (h - btnH) / 2;
        
        const btn = new PIXI.Graphics();
        btn.roundRect(btnX, btnY, btnW, btnH, 6);
        
        if (options.canAfford) {
            btn.fill({ color: 0x9333ea, alpha: 1 }); // Purple
            btn.stroke({ color: 0xa855f7, width: 2 });
            btn.eventMode = "static";
            btn.cursor = "pointer";
            btn.on("pointerdown", options.onCraft);
        } else {
            btn.fill({ color: 0x4a5568, alpha: 0.5 });
        }
        this.craftMenuLayer.addChild(btn);
        
        const btnText = new PIXI.Text({
            text: "CRAFT",
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: options.canAfford ? 0xffffff : 0x718096,
                fontWeight: "800",
            }),
        });
        btnText.anchor.set(0.5);
        btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
        this.craftMenuLayer.addChild(btnText);
    }

    // --------------------
    // Hire Unit Menu (v0.5)
    // --------------------
    private showHireUnitMenu(): void {
        // Import unit definitions
        import("../entities/Unit").then(({ UNIT_DEFINITIONS }) => {
            this.craftMenuLayer.removeChildren(); // Reuse craft layer
            
            const p = this.game.state.players[this.game.state.currentPlayerIndex];
            const playerIndex = this.game.state.currentPlayerIndex;
            const playerColor = this.PLAYER_COLORS[playerIndex % this.PLAYER_COLORS.length];
            
            const screenW = this.app.renderer.width;
            const screenH = this.app.renderer.height;
            
            // Backdrop
            const backdrop = new PIXI.Graphics();
            backdrop.rect(0, 0, screenW, screenH);
            backdrop.fill({ color: 0x000000, alpha: 0.6 });
            backdrop.eventMode = "static";
            backdrop.cursor = "pointer";
            backdrop.on("pointerdown", () => {
                this.craftMenuLayer.removeChildren();
                this.renderAll();
            });
            this.craftMenuLayer.addChild(backdrop);
            
            // Panel
            const panelW = 400;
            const panelH = 300;
            const panelX = (screenW - panelW) / 2;
            const panelY = (screenH - panelH) / 2;
            
            const panel = new PIXI.Graphics();
            panel.roundRect(panelX, panelY, panelW, panelH, 16);
            panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
            panel.stroke({ color: playerColor, width: 4, alpha: 1 });
            panel.eventMode = "static";
            this.craftMenuLayer.addChild(panel);
            
            // Title
            const title = new PIXI.Text({
                text: "🤖 Hire Units",
                style: new PIXI.TextStyle({
                    fontSize: 24,
                    fill: playerColor,
                    fontWeight: "800",
                }),
            });
            title.position.set(panelX + 20, panelY + 16);
            this.craftMenuLayer.addChild(title);
            
            // Resources
            const resourceText = new PIXI.Text({
                text: `Your resources: 🧩${p.components}  ⚙${p.alloys}  🧱${p.materials}`,
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0, fontWeight: "600" }),
            });
            resourceText.position.set(panelX + 20, panelY + 50);
            this.craftMenuLayer.addChild(resourceText);
            
            // Close button
            const closeBtn = new PIXI.Graphics();
            closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
            closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
            closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
            closeBtn.eventMode = "static";
            closeBtn.cursor = "pointer";
            closeBtn.on("pointerdown", () => {
                this.craftMenuLayer.removeChildren();
                this.renderAll();
            });
            this.craftMenuLayer.addChild(closeBtn);
            
            const closeX = new PIXI.Text({
                text: "✕",
                style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
            });
            closeX.anchor.set(0.5);
            closeX.position.set(panelX + panelW - 24, panelY + 24);
            this.craftMenuLayer.addChild(closeX);
            
            let yOffset = panelY + 80;
            
            // Unit cards
            const unitTypes = ["assault", "shield", "tactical"] as const;
            for (const unitType of unitTypes) {
                const def = UNIT_DEFINITIONS[unitType];
                const canAfford = p.components >= def.cost.components && 
                                  p.alloys >= def.cost.alloys &&
                                  p.materials >= def.cost.materials;
                const hasSlot = p.units.some(u => u === null);
                
                const cardH = 55;
                const cardBg = new PIXI.Graphics();
                cardBg.roundRect(panelX + 16, yOffset, panelW - 32, cardH, 10);
                
                if (canAfford && hasSlot) {
                    cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
                    cardBg.stroke({ color: 0x3b82f6, width: 2, alpha: 0.8 });
                } else {
                    cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
                    cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
                }
                this.craftMenuLayer.addChild(cardBg);
                
                // Emoji
                const emoji = new PIXI.Text({
                    text: def.emoji,
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                emoji.position.set(panelX + 28, yOffset + 14);
                this.craftMenuLayer.addChild(emoji);
                
                // Name
                const name = new PIXI.Text({
                    text: def.name,
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: canAfford && hasSlot ? 0xffffff : 0x718096,
                        fontWeight: "700",
                    }),
                });
                name.position.set(panelX + 64, yOffset + 8);
                this.craftMenuLayer.addChild(name);
                
                // Effect
                const effect = new PIXI.Text({
                    text: def.description,
                    style: new PIXI.TextStyle({ fontSize: 10, fill: 0xa0aec0 }),
                });
                effect.position.set(panelX + 64, yOffset + 28);
                this.craftMenuLayer.addChild(effect);
                
                // Cost
                const costParts: string[] = [];
                if (def.cost.components > 0) costParts.push(`${def.cost.components}🧩`);
                if (def.cost.alloys > 0) costParts.push(`${def.cost.alloys}⚙`);
                if (def.cost.materials > 0) costParts.push(`${def.cost.materials}🧱`);
                
                const costText = new PIXI.Text({
                    text: costParts.join(" "),
                    style: new PIXI.TextStyle({ 
                        fontSize: 12, 
                        fill: canAfford ? 0x48bb78 : 0xe53e3e, 
                        fontWeight: "600" 
                    }),
                });
                costText.anchor.set(1, 0);
                costText.position.set(panelX + panelW - 90, yOffset + 10);
                this.craftMenuLayer.addChild(costText);
                
                // Hire button
                if (canAfford && hasSlot) {
                    const btnW = 60;
                    const btnH = 26;
                    const btnX = panelX + panelW - btnW - 26;
                    const btnY = yOffset + (cardH - btnH) / 2;
                    
                    const btn = new PIXI.Graphics();
                    btn.roundRect(btnX, btnY, btnW, btnH, 6);
                    btn.fill({ color: 0x3b82f6, alpha: 1 });
                    btn.stroke({ color: 0x60a5fa, width: 2 });
                    btn.eventMode = "static";
                    btn.cursor = "pointer";
                    btn.on("pointerdown", () => {
                        this.game.doHireUnit(unitType);
                        this.craftMenuLayer.removeChildren();
                        this.renderAll();
                    });
                    this.craftMenuLayer.addChild(btn);
                    
                    const btnText = new PIXI.Text({
                        text: "HIRE",
                        style: new PIXI.TextStyle({
                            fontSize: 10,
                            fill: 0xffffff,
                            fontWeight: "800",
                        }),
                    });
                    btnText.anchor.set(0.5);
                    btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
                    this.craftMenuLayer.addChild(btnText);
                }
                
                yOffset += cardH + 8;
            }
        });
    }

    // --------------------
    // Orbital Hangar Menu (v0.5)
    // --------------------
    private showOrbitalHangarMenu(): void {
        this.craftMenuLayer.removeChildren(); // Reuse craft layer
        
        const destinations = this.game.getOrbitalHangarDestinations();
        
        const screenW = this.app.renderer.width;
        const screenH = this.app.renderer.height;
        const playerIndex = this.game.state.currentPlayerIndex;
        const playerColor = this.PLAYER_COLORS[playerIndex % this.PLAYER_COLORS.length];
        
        // Backdrop
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", () => {
            this.craftMenuLayer.removeChildren();
            this.renderAll();
        });
        this.craftMenuLayer.addChild(backdrop);
        
        // Panel
        const panelW = 360;
        const panelH = Math.min(400, 120 + destinations.length * 50);
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;
        
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: playerColor, width: 4, alpha: 1 });
        panel.eventMode = "static";
        this.craftMenuLayer.addChild(panel);
        
        // Title
        const title = new PIXI.Text({
            text: "🚀 Orbital Hangar Teleport",
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: playerColor,
                fontWeight: "800",
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        this.craftMenuLayer.addChild(title);
        
        // Subtitle
        const subtitle = new PIXI.Text({
            text: "Choose destination (safe tiles only, 1 AP)",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xa0aec0 }),
        });
        subtitle.position.set(panelX + 20, panelY + 44);
        this.craftMenuLayer.addChild(subtitle);
        
        // Close button
        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            this.craftMenuLayer.removeChildren();
            this.renderAll();
        });
        this.craftMenuLayer.addChild(closeBtn);
        
        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        this.craftMenuLayer.addChild(closeX);
        
        if (destinations.length === 0) {
            const noDestinations = new PIXI.Text({
                text: "No valid destinations available",
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xe53e3e }),
            });
            noDestinations.position.set(panelX + 20, panelY + 80);
            this.craftMenuLayer.addChild(noDestinations);
            return;
        }
        
        let yOffset = panelY + 70;
        
        for (const dest of destinations) {
            const tile = this.game.state.board.getTile(dest);
            const tileType = tile?.type || "Unknown";
            
            const cardH = 40;
            const cardBg = new PIXI.Graphics();
            cardBg.roundRect(panelX + 16, yOffset, panelW - 32, cardH, 8);
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0x4a90d9, width: 2 });
            cardBg.eventMode = "static";
            cardBg.cursor = "pointer";
            cardBg.on("pointerdown", () => {
                this.game.doOrbitalHangarTeleport(dest);
                this.craftMenuLayer.removeChildren();
                this.renderAll();
            });
            this.craftMenuLayer.addChild(cardBg);
            
            const label = new PIXI.Text({
                text: `📍 ${tileType} (${dest.q}, ${dest.r})`,
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xffffff, fontWeight: "600" }),
            });
            label.position.set(panelX + 32, yOffset + 10);
            this.craftMenuLayer.addChild(label);
            
            yOffset += cardH + 8;
        }
    }

    // --------------------
    // Final Phase Banner (v0.5)
    // --------------------
    private renderFinalPhaseBanner() {
        this.finalPhaseBannerLayer.removeChildren();
        
        // Only show during Final Preparation or Final Trial
        if (!this.game.state.isFinalPreparation && !this.game.state.finalTrialStarted) return;
        
        const screenW = this.app.renderer.width;
        const bannerH = 60;
        const bannerY = 60; // Below the top
        
        // Banner background
        const bg = new PIXI.Graphics();
        bg.rect(0, bannerY, screenW, bannerH);
        
        if (this.game.state.finalTrialStarted) {
            bg.fill({ color: 0x7c2d12, alpha: 0.95 }); // Orange for Trial
        } else {
            bg.fill({ color: 0x1e3a5f, alpha: 0.95 }); // Blue for Preparation
        }
        this.finalPhaseBannerLayer.addChild(bg);
        
        // Title text
        let titleStr = "";
        let subtitleStr = "";
        
        if (this.game.state.finalTrialStarted) {
            titleStr = "🎯 FINAL TRIAL";
            const player = this.game.state.players[this.game.state.currentPlayerIndex];
            if (player.finalTrialScore !== null) {
                subtitleStr = `Score: ${player.finalTrialScore} | Waiting for other players...`;
            } else {
                subtitleStr = "Complete your Final Trial attempt!";
            }
        } else if (this.game.state.isFinalPreparation) {
            titleStr = `🚨 ORBITAL PHASE - ${this.game.state.finalPrepRoundsLeft} Rounds Left`;
            subtitleStr = "Explore DISABLED | Move, Gather, Build, Craft only | Recall to Base available";
        }
        
        const title = new PIXI.Text({
            text: titleStr,
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: 0xffffff,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 3, color: 0x000000, distance: 2 },
            }),
        });
        title.anchor.set(0.5, 0);
        title.position.set(screenW / 2, bannerY + 8);
        this.finalPhaseBannerLayer.addChild(title);
        
        const subtitle = new PIXI.Text({
            text: subtitleStr,
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: 0xd1d5db,
                fontWeight: "500",
            }),
        });
        subtitle.anchor.set(0.5, 0);
        subtitle.position.set(screenW / 2, bannerY + 36);
        this.finalPhaseBannerLayer.addChild(subtitle);
        
        // Recall button (if available)
        if (this.game.canRecallToBase()) {
            const btnW = 140;
            const btnH = 36;
            const btnX = screenW - btnW - 20;
            const btnY = bannerY + (bannerH - btnH) / 2;
            
            const btn = new PIXI.Graphics();
            btn.roundRect(btnX, btnY, btnW, btnH, 8);
            btn.fill({ color: 0x10b981, alpha: 1 });
            btn.stroke({ color: 0x34d399, width: 2 });
            btn.eventMode = "static";
            btn.cursor = "pointer";
            btn.on("pointerdown", () => {
                this.game.doRecallToBase();
                this.renderAll();
            });
            this.finalPhaseBannerLayer.addChild(btn);
            
            const btnText = new PIXI.Text({
                text: "📡 RECALL",
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0xffffff,
                    fontWeight: "800",
                }),
            });
            btnText.anchor.set(0.5);
            btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
            this.finalPhaseBannerLayer.addChild(btnText);
        }
        
        // Final Trial button (if in trial phase and hasn't done trial yet)
        if (this.game.state.finalTrialStarted) {
            const player = this.game.state.players[this.game.state.currentPlayerIndex];
            if (player.finalTrialScore === null && this.isMyTurn) {
                const btnW = 180;
                const btnH = 36;
                const btnX = screenW - btnW - 20;
                const btnY = bannerY + (bannerH - btnH) / 2;
                
                const btn = new PIXI.Graphics();
                btn.roundRect(btnX, btnY, btnW, btnH, 8);
                btn.fill({ color: 0xdc2626, alpha: 1 });
                btn.stroke({ color: 0xef4444, width: 2 });
                btn.eventMode = "static";
                btn.cursor = "pointer";
                btn.on("pointerdown", () => {
                    // For now, do trial with 0 prestige spend
                    // TODO: Add prestige spend UI
                    this.game.doFinalTrial(0);
                    this.renderAll();
                });
                this.finalPhaseBannerLayer.addChild(btn);
                
                const btnText = new PIXI.Text({
                    text: "🎯 DO FINAL TRIAL",
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: 0xffffff,
                        fontWeight: "800",
                    }),
                });
                btnText.anchor.set(0.5);
                btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
                this.finalPhaseBannerLayer.addChild(btnText);
            }
        }
    }

    // --------------------
    // Event Log
    // --------------------
    private renderEventLog() {
        this.eventLogLayer.removeChildren();

        const logW = 350;
        const logH = 180;
        const logX = 16;
        const logY = this.app.renderer.height - logH - 148; // над HUD (новый HUD 130px + отступ)

        // Фон лога
        const bg = new PIXI.Graphics();
        bg.roundRect(logX, logY, logW, logH, 8);
        bg.fill({ color: 0x1a1f2e, alpha: 0.92 });
        bg.stroke({ color: 0x4a5568, width: 2, alpha: 0.6 });
        this.eventLogLayer.addChild(bg);

        // Заголовок
        const title = new PIXI.Text({
            text: "📜 Event Log",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffd700,
                fontWeight: "700",
                dropShadow: {
                    alpha: 0.6,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        title.position.set(logX + 12, logY + 10);
        this.eventLogLayer.addChild(title);

        // События (последние 7)
        const recentEvents = this.game.state.eventLog.slice(-7).reverse();
        let yOffset = logY + 38;

        for (const event of recentEvents) {
            const eventText = new PIXI.Text({
                text: `• ${event}`,
                style: new PIXI.TextStyle({
                    fontSize: 12,
                    fill: 0xdddddd,
                    fontWeight: "400",
                }),
            });
            eventText.position.set(logX + 12, yOffset);
            this.eventLogLayer.addChild(eventText);
            yOffset += 18;
        }

        if (recentEvents.length === 0) {
            const emptyText = new PIXI.Text({
                text: "No events yet...",
                style: new PIXI.TextStyle({
                    fontSize: 12,
                    fill: 0x888888,
                    fontStyle: "italic",
                }),
            });
            emptyText.position.set(logX + 12, yOffset);
            this.eventLogLayer.addChild(emptyText);
        }
    }

    // --------------------
    // Deck Info (UI колоды)
    // --------------------
    private renderDeckInfo() {
        this.deckInfoLayer.removeChildren();

        const deckW = 180;
        const deckH = 120;
        const deckX = 16;
        const deckY = this.app.renderer.height - 148 - 180 - 10 - deckH; // Под Event Log

        // Фон панели
        const bg = new PIXI.Graphics();
        bg.roundRect(deckX, deckY, deckW, deckH, 8);
        bg.fill({ color: 0x1a1f2e, alpha: 0.92 });
        bg.stroke({ color: 0x4a5568, width: 2, alpha: 0.6 });
        this.deckInfoLayer.addChild(bg);

        // Заголовок
        const title = new PIXI.Text({
            text: "🃏 Tile Deck",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffd700,
                fontWeight: "700",
                dropShadow: {
                    alpha: 0.6,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        title.position.set(deckX + 12, deckY + 10);
        this.deckInfoLayer.addChild(title);

        // Информация о колоде
        const tier1Remaining = this.game.state.tileDeck.getTier1Remaining();
        const tier2Remaining = this.game.state.tileDeck.getTier2Remaining();
        const totalRemaining = this.game.state.tileDeck.getRemainingCount();

        const infoLines = [
            `Tier 1: ${tier1Remaining} tiles`,
            `Tier 2: ${tier2Remaining} tiles`,
            ``,
            `Total: ${totalRemaining} / 60`,
        ];

        let yOffset = deckY + 38;
        for (const line of infoLines) {
            const lineText = new PIXI.Text({
                text: line,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: line.startsWith("Total") ? 0xffffff : 0xdddddd,
                    fontWeight: line.startsWith("Total") ? "700" : "400",
                }),
            });
            lineText.position.set(deckX + 12, yOffset);
            this.deckInfoLayer.addChild(lineText);
            yOffset += 18;
        }
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
        
        this.debugToggleButtonContainer.addChild(this.debugToggleButtonBg);
        this.debugToggleButtonContainer.addChild(this.debugToggleButtonIcon);
        this.debugToggleButtonIcon.position.set(20, 13);
        
        this.debugToggleButtonContainer.on("pointerdown", () => {
            this.debugPanelVisible = !this.debugPanelVisible;
            this.renderDebugPanel();
        });
        
        this.hudLayer.addChild(this.debugToggleButtonContainer);
    }

    private renderDebugPanel() {
        // Toggle button (always visible) - top left corner
        this.debugToggleButtonBg.clear();
        this.debugToggleButtonBg.roundRect(10, 10, 40, 30, 6);
        this.debugToggleButtonBg.fill({ color: this.debugPanelVisible ? 0xff6600 : 0x333333, alpha: 0.9 });
        this.debugToggleButtonBg.stroke({ color: 0xffffff, alpha: 0.3, width: 1 });

        // Clear panel
        this.debugPanelLayer.removeChildren();
        
        if (!this.debugPanelVisible) return;

        // Panel background
        const panelW = 200;
        const panelH = 280;
        const panelX = 10;
        const panelY = 50;

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
        this.diceResult = result;
        this.diceCallback = onComplete || null;
        
        this.showDiceReadyToRoll();
    }

    private showDiceReadyToRoll(): void {
        this.diceLayer.removeChildren();
        
        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;
        
        // Panel in bottom-right corner (moved up and left)
        const panelW = 200;
        const panelH = 220;
        const panelX = screenW - panelW - 400;
        const panelY = screenH - panelH - 90;
        
        // Semi-transparent panel background
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 12);
        panel.fill({ color: 0x1a1a2e, alpha: 0.95 });
        panel.stroke({ color: 0x00ffff, width: 2 });
        this.diceLayer.addChild(panel);
        
        // Combat title
        const titleText = new PIXI.Text({
            text: "⚔️ COMBAT!",
            style: new PIXI.TextStyle({
                fontSize: 18,
                fill: 0xff6b6b,
                fontWeight: "bold",
            }),
        });
        titleText.anchor.set(0.5);
        titleText.position.set(panelX + panelW/2, panelY + 25);
        this.diceLayer.addChild(titleText);
        
        // Dice container
        const diceSize = 80;
        const diceX = panelX + panelW/2;
        const diceY = panelY + 90;
        
        // Static dice with "🎲"
        const dice = new PIXI.Graphics();
        dice.roundRect(diceX - diceSize/2, diceY - diceSize/2, diceSize, diceSize, 12);
        dice.fill({ color: 0x2a2a4e });
        dice.stroke({ color: 0x00ffff, width: 3 });
        dice.eventMode = "static";
        dice.cursor = "pointer";
        this.diceLayer.addChild(dice);
        
        // Question mark
        const diceText = new PIXI.Text({
            text: "🎲",
            style: new PIXI.TextStyle({
                fontSize: 36,
            }),
        });
        diceText.anchor.set(0.5);
        diceText.position.set(diceX, diceY);
        this.diceLayer.addChild(diceText);
        
        // "Click to Roll" text
        const rollText = new PIXI.Text({
            text: "🎯 Click to Roll!",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0x00ffff,
                fontWeight: "bold",
            }),
        });
        rollText.anchor.set(0.5);
        rollText.position.set(diceX, panelY + panelH - 30);
        this.diceLayer.addChild(rollText);
        
        // Hover effect on dice
        dice.on("pointerover", () => {
            dice.clear();
            dice.roundRect(diceX - diceSize/2, diceY - diceSize/2, diceSize, diceSize, 12);
            dice.fill({ color: 0x3a3a5e });
            dice.stroke({ color: 0xffd700, width: 4 });
        });
        
        dice.on("pointerout", () => {
            dice.clear();
            dice.roundRect(diceX - diceSize/2, diceY - diceSize/2, diceSize, diceSize, 12);
            dice.fill({ color: 0x2a2a4e });
            dice.stroke({ color: 0x00ffff, width: 3 });
        });
        
        // Click to start rolling
        dice.on("pointerdown", () => {
            this.animateDiceRoll();
        });
    }

    private animateDiceRoll(): void {
        this.diceLayer.removeChildren();
        
        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;
        
        // Panel in bottom-right corner (moved up and left)
        const panelW = 200;
        const panelH = 220;
        const panelX = screenW - panelW - 40;
        const panelY = screenH - panelH - 60;
        
        // Semi-transparent panel background
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 12);
        panel.fill({ color: 0x1a1a2e, alpha: 0.95 });
        panel.stroke({ color: 0xffd700, width: 2 });
        panel.eventMode = "static"; // Make panel interactive
        this.diceLayer.addChild(panel);
        
        // Dice container
        const diceSize = 80;
        const diceX = panelX + panelW/2;
        const diceY = panelY + 90;
        
        // Animation: show random faces quickly, then settle on result
        const DICE_FACES = [
            { emoji: "🗡️🗡️🗡️", color: 0x00ff00 }, // 3 swords
            { emoji: "🗡️🗡️", color: 0x00dd00 },   // 2 swords
            { emoji: "🗡️", color: 0x00bb00 },     // 1 sword
            { emoji: "🗡️💀", color: 0xffaa00 },   // 1 sword + 1 skull
            { emoji: "💀", color: 0xff4444 },     // 1 skull
            { emoji: "💀💀", color: 0xff0000 },   // 2 skulls
        ];
        
        // Get the final face based on result
        let finalFaceIdx = 0;
        if (this.diceResult!.swords === 3) finalFaceIdx = 0;
        else if (this.diceResult!.swords === 2 && this.diceResult!.skulls === 0) finalFaceIdx = 1;
        else if (this.diceResult!.swords === 1 && this.diceResult!.skulls === 0) finalFaceIdx = 2;
        else if (this.diceResult!.swords === 1 && this.diceResult!.skulls === 1) finalFaceIdx = 3;
        else if (this.diceResult!.swords === 0 && this.diceResult!.skulls === 1) finalFaceIdx = 4;
        else if (this.diceResult!.swords === 0 && this.diceResult!.skulls === 2) finalFaceIdx = 5;
        
        const finalFace = DICE_FACES[finalFaceIdx];
        
        // Rolling text
        const rollingText = new PIXI.Text({
            text: "🎲 Rolling...",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffd700,
                fontWeight: "bold",
            }),
        });
        rollingText.anchor.set(0.5);
        rollingText.position.set(diceX, panelY + 25);
        this.diceLayer.addChild(rollingText);
        
        // Animate rolling
        let frame = 0;
        const totalFrames = 20;
        const rollInterval = setInterval(() => {
            frame++;
            
            // Remove old dice elements (keep panel and rolling text)
            for (let i = this.diceLayer.children.length - 1; i > 1; i--) {
                this.diceLayer.removeChildAt(i);
            }
            
            // Random face during animation
            const randomFace = DICE_FACES[Math.floor(Math.random() * 6)];
            const currentFace = frame >= totalFrames ? finalFace : randomFace;
            
            // Draw dice
            const dice = new PIXI.Graphics();
            const wobble = frame < totalFrames ? Math.sin(frame * 0.8) * 5 : 0;
            const scale = frame < totalFrames ? 1 + Math.sin(frame * 0.5) * 0.03 : 1;
            
            const actualSize = diceSize * scale;
            dice.roundRect(diceX - actualSize/2 + wobble, diceY - actualSize/2, actualSize, actualSize, 12);
            dice.fill({ color: 0x2a2a4e });
            dice.stroke({ color: currentFace.color, width: 3 });
            this.diceLayer.addChild(dice);
            
            // Dice emoji
            const diceText = new PIXI.Text({
                text: currentFace.emoji,
                style: new PIXI.TextStyle({
                    fontSize: 28 * scale,
                    fill: 0xffffff,
                }),
            });
            diceText.anchor.set(0.5);
            diceText.position.set(diceX + wobble, diceY);
            this.diceLayer.addChild(diceText);
            
            // Result text (show after settling)
            if (frame >= totalFrames) {
                clearInterval(rollInterval);
                
                // Update rolling text to result
                rollingText.text = this.diceResult!.swords > 0 ? "⚔️ HIT!" : "💀 MISS!";
                rollingText.style.fill = this.diceResult!.swords > 0 ? 0x00ff00 : 0xff4444;
                
                // Result summary
                const resultText = new PIXI.Text({
                    text: `🗡️${this.diceResult!.swords}  💀${this.diceResult!.skulls}`,
                    style: new PIXI.TextStyle({
                        fontSize: 18,
                        fill: 0xffffff,
                        fontWeight: "700",
                    }),
                });
                resultText.anchor.set(0.5);
                resultText.position.set(diceX, panelY + panelH - 55);
                this.diceLayer.addChild(resultText);
                
                // "Click to continue" text
                const continueText = new PIXI.Text({
                    text: "Click to continue...",
                    style: new PIXI.TextStyle({
                        fontSize: 11,
                        fill: 0x888888,
                        fontStyle: "italic",
                    }),
                });
                continueText.anchor.set(0.5);
                continueText.position.set(diceX, panelY + panelH - 25);
                this.diceLayer.addChild(continueText);
                
                // Make dice and panel clickable to dismiss
                dice.eventMode = "static";
                dice.cursor = "pointer";
                panel.cursor = "pointer";
                
                const dismissDice = () => {
                    // Save callback BEFORE hideDiceRoll clears it!
                    const cb = this.diceCallback;
                    this.hideDiceRoll();
                    if (cb) cb();
                };
                
                panel.on("pointerdown", dismissDice);
                dice.on("pointerdown", dismissDice);
            }
        }, 70); // 70ms per frame = ~1.4s total animation
    }

    private hideDiceRoll(): void {
        this.diceLayer.removeChildren();
        this.diceResult = null;
        this.diceCallback = null;
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================

    public showToast(message: string, type: "info" | "success" | "warning" | "error" = "info", duration = 3000): void {
        const colors = {
            info: { bg: 0x2196f3, text: 0xffffff },
            success: { bg: 0x4caf50, text: 0xffffff },
            warning: { bg: 0xff9800, text: 0x000000 },
            error: { bg: 0xf44336, text: 0xffffff },
        };
        const color = colors[type];

        const container = new PIXI.Container();
        const padding = 16;
        const maxWidth = 300;

        // Text
        const text = new PIXI.Text({
            text: message,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: color.text,
                fontWeight: "600",
                wordWrap: true,
                wordWrapWidth: maxWidth - padding * 2,
            }),
        });

        // Background
        const bg = new PIXI.Graphics();
        const width = Math.min(text.width + padding * 2, maxWidth + padding * 2);
        const height = text.height + padding * 2;
        bg.roundRect(0, 0, width, height, 8);
        bg.fill({ color: color.bg, alpha: 0.95 });
        bg.stroke({ color: 0x000000, width: 1, alpha: 0.2 });

        text.position.set(padding, padding);

        container.addChild(bg);
        container.addChild(text);

        // Position: stack from top-center (above the map, clearly visible)
        const offsetY = this.activeToasts.reduce((sum, t) => sum + (t.container.height || 60) + 10, 60);
        container.position.set((this.app.screen.width - width) / 2, offsetY);

        // Fade in animation
        container.alpha = 0;
        
        this.toastLayer.addChild(container);
        this.activeToasts.push({ container, timer: duration });

        // Animate in
        let fadeIn = 0;
        const fadeInInterval = setInterval(() => {
            fadeIn += 0.1;
            container.alpha = Math.min(1, fadeIn);
            if (fadeIn >= 1) clearInterval(fadeInInterval);
        }, 30);

        // Auto dismiss
        setTimeout(() => this.dismissToast(container), duration);
    }

    private dismissToast(container: PIXI.Container): void {
        // Fade out
        let fadeOut = 1;
        const fadeOutInterval = setInterval(() => {
            fadeOut -= 0.1;
            container.alpha = Math.max(0, fadeOut);
            if (fadeOut <= 0) {
                clearInterval(fadeOutInterval);
                this.toastLayer.removeChild(container);
                this.activeToasts = this.activeToasts.filter(t => t.container !== container);
                this.repositionToasts();
            }
        }, 30);
    }

    private repositionToasts(): void {
        let offsetY = 60;
        for (const toast of this.activeToasts) {
            // Center horizontally
            toast.container.x = (this.app.screen.width - toast.container.width) / 2;
            toast.container.y = offsetY;
            offsetY += toast.container.height + 10;
        }
    }

    // ========================================
    // TUTORIAL HINTS
    // ========================================

    private loadShownHints(): Set<string> {
        try {
            const stored = localStorage.getItem(GameRenderer.HINTS_STORAGE_KEY);
            if (stored) {
                return new Set(JSON.parse(stored));
            }
        } catch (e) {
            console.warn("Failed to load hints from localStorage:", e);
        }
        return new Set();
    }

    private saveShownHints(): void {
        try {
            localStorage.setItem(GameRenderer.HINTS_STORAGE_KEY, JSON.stringify([...this.shownHints]));
        } catch (e) {
            console.warn("Failed to save hints to localStorage:", e);
        }
    }

    public showHint(id: string, title: string, message: string, options?: { 
        x?: number; 
        y?: number; 
        anchor?: "center" | "top" | "bottom";
        showOnce?: boolean;
    }): void {
        // Skip if already shown (for showOnce hints)
        if (options?.showOnce !== false && this.shownHints.has(id)) return;
        this.shownHints.add(id);
        this.saveShownHints(); // Persist to localStorage

        // Remove current hint if any
        if (this.currentHint) {
            this.tutorialLayer.removeChild(this.currentHint);
        }

        const container = new PIXI.Container();
        const padding = 20;
        const maxWidth = 320;

        // Title
        const titleText = new PIXI.Text({
            text: title,
            style: new PIXI.TextStyle({
                fontSize: 18,
                fill: 0x4fc3f7,
                fontWeight: "700",
            }),
        });

        // Message
        const messageText = new PIXI.Text({
            text: message,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0xdddddd,
                wordWrap: true,
                wordWrapWidth: maxWidth - padding * 2,
                lineHeight: 20,
            }),
        });

        // Dismiss button
        const dismissBtn = new PIXI.Container();
        const btnBg = new PIXI.Graphics();
        btnBg.roundRect(0, 0, 60, 28, 4);
        btnBg.fill({ color: 0x4fc3f7 });
        
        const btnText = new PIXI.Text({
            text: "OK",
            style: new PIXI.TextStyle({
                fontSize: 13,
                fill: 0x000000,
                fontWeight: "700",
            }),
        });
        btnText.position.set(30 - btnText.width / 2, 14 - btnText.height / 2);
        
        dismissBtn.addChild(btnBg);
        dismissBtn.addChild(btnText);
        dismissBtn.eventMode = "static";
        dismissBtn.cursor = "pointer";
        dismissBtn.on("pointerdown", () => this.hideHint());

        // Layout
        titleText.position.set(padding, padding);
        messageText.position.set(padding, padding + titleText.height + 10);
        dismissBtn.position.set(padding, padding + titleText.height + 10 + messageText.height + 15);

        const width = Math.min(Math.max(titleText.width, messageText.width) + padding * 2, maxWidth + padding * 2);
        const height = padding * 2 + titleText.height + 10 + messageText.height + 15 + 28;

        // Background with border
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, width, height, 12);
        bg.fill({ color: 0x1a1a2e, alpha: 0.98 });
        bg.stroke({ color: 0x4fc3f7, width: 2 });

        // Arrow indicator (pointing to target)
        const arrow = new PIXI.Graphics();
        arrow.moveTo(width / 2 - 10, height);
        arrow.lineTo(width / 2, height + 15);
        arrow.lineTo(width / 2 + 10, height);
        arrow.fill({ color: 0x1a1a2e });

        container.addChild(bg);
        container.addChild(arrow);
        container.addChild(titleText);
        container.addChild(messageText);
        container.addChild(dismissBtn);

        // Position
        const x = options?.x ?? this.app.screen.width / 2;
        const y = options?.y ?? this.app.screen.height / 2;
        
        if (options?.anchor === "top") {
            container.position.set(x - width / 2, y);
        } else if (options?.anchor === "bottom") {
            container.position.set(x - width / 2, y - height - 20);
        } else {
            container.position.set(x - width / 2, y - height / 2);
        }

        // Clamp to screen
        container.x = Math.max(10, Math.min(this.app.screen.width - width - 10, container.x));
        container.y = Math.max(10, Math.min(this.app.screen.height - height - 10, container.y));

        // Fade in
        container.alpha = 0;
        this.tutorialLayer.addChild(container);
        this.currentHint = container;

        let fade = 0;
        const fadeInterval = setInterval(() => {
            fade += 0.15;
            container.alpha = Math.min(1, fade);
            if (fade >= 1) clearInterval(fadeInterval);
        }, 20);
    }

    public hideHint(): void {
        if (!this.currentHint) return;

        const hint = this.currentHint;
        let fade = 1;
        const fadeInterval = setInterval(() => {
            fade -= 0.15;
            hint.alpha = Math.max(0, fade);
            if (fade <= 0) {
                clearInterval(fadeInterval);
                this.tutorialLayer.removeChild(hint);
                if (this.currentHint === hint) {
                    this.currentHint = null;
                }
            }
        }, 20);
    }

    // Check and show tutorial hints based on game state
    public checkTutorialHints(): void {
        const state = this.game.state;
        const player = state.players[this.myPlayerIndex];

        // First turn hint
        if (state.round === 1 && state.actionPoints === 2 && !this.shownHints.has("welcome")) {
            this.showHint(
                "welcome",
                "🚀 Welcome, Explorer!",
                "Click on adjacent tiles to move. Each turn you have 2 action slots.\n\n" +
                "• Move is FREE but commits a slot\n" +
                "• Click explored tiles to see available actions\n" +
                "• Gray tiles with ❓ are unexplored",
                { anchor: "center" }
            );
        }

        // Explore hint (first time seeing fog)
        if (state.round >= 2 && !this.shownHints.has("explore")) {
            this.showHint(
                "explore",
                "🔍 Exploration",
                "Click on a gray ❓ tile to explore it. You'll place a new tile and fight any threat present.\n\n" +
                "Combat ends your turn immediately!",
                { anchor: "center" }
            );
        }

        // Low HP warning
        if (player.hp <= 2 && player.hp > 0 && !this.shownHints.has("low_hp")) {
            this.showToast("⚠️ Low HP! Return to Landing Hub to heal.", "warning", 5000);
            this.shownHints.add("low_hp");
            this.saveShownHints();
        }

        // First resource gathered
        if ((player.biomass > 0 || player.materials > 0 || player.alloys > 0) && !this.shownHints.has("resources")) {
            this.showHint(
                "resources",
                "📦 Resources Collected!",
                "Use resources to build:\n\n" +
                "• 🏠 Base (2 Materials) - your outpost\n" +
                "• 🏗️ Modules - upgrades in your base\n\n" +
                "Build your Base on any cleared tile!",
                { anchor: "center" }
            );
        }

        // Can build base hint
        if (player.materials >= 2 && !player.basePosition && !this.shownHints.has("can_build_base")) {
            this.showToast("💡 You have enough Materials to build a Base!", "info", 4000);
            this.shownHints.add("can_build_base");
            this.saveShownHints();
        }
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
