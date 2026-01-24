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
        this.HEX_POINTS = this.buildHexPoints(this.HEX_SIZE - 2);

        this.app.stage.addChild(this.boardLayer);
        this.boardLayer.addChild(this.labelsLayer);

        this.app.stage.addChild(this.ghostPreviewLayer); // Тексты на ghost hexes
        this.ghostPreviewLayer.eventMode = "none"; // НЕ кликабельный!

        this.app.stage.addChild(this.rotationIndicatorsLayer); // Поверх board
        this.rotationIndicatorsLayer.eventMode = "none"; // НЕ кликабельный!

        this.app.stage.addChild(this.playersLayer);

        this.app.stage.addChild(this.heroBoardLayer); // Hero Board panel
        this.heroBoardLayer.zIndex = 100;

        this.app.stage.addChild(this.buildMenuLayer); // Build Menu (modal)
        this.buildMenuLayer.zIndex = 200;

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
        this.renderDebugPanel(); // Debug Panel
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
            const [x1, y1, x2, y2] = getEdgeVertices(edge as EdgeIndex, this.HEX_SIZE - 2);
            
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
            for (const targetKey of placementTargets) {
                // Парсим координаты из ключа "q,r"
                const [q, r] = targetKey.split(",").map(Number);
                const coord = { q, r };

                let ghostView = this.tileViews.get(targetKey);
                if (!ghostView) {
                    ghostView = new PIXI.Graphics();
                    ghostView.hitArea = new PIXI.Polygon(this.HEX_POINTS);
                    this.tileViews.set(targetKey, ghostView);
                    this.boardLayer.addChildAt(ghostView, 0);
                }
                
                // Multiplayer: только если мой ход
                ghostView.eventMode = this.isMyTurn ? "static" : "none";
                ghostView.cursor = this.isMyTurn ? "pointer" : "default";
                ghostView.removeAllListeners();

                // NEW: Hover вместо клика для выбора позиции
                ghostView.on("pointerover", () => {
                    if (!this.isMyTurn) return;
                    this.game.selectPlacementPosition(coord);
                    this.renderAll();
                });

                ghostView.on("pointerout", () => {
                    // Не сбрасываем сразу, только при выходе за все ghost hexes
                    // Это позволяет держать выбор при переходе между hexes
                });

                const { x, y } = this.hexToPixel(coord);
                ghostView.position.set(x, y);
                ghostView.visible = true; // Делаем видимым (был скрыт выше)

                // Проверяем выбрана ли эта позиция
                const isSelected = this.game.state.selectedPlacementPosition 
                    && this.game.state.selectedPlacementPosition.q === coord.q 
                    && this.game.state.selectedPlacementPosition.r === coord.r;

                ghostView.clear();
                ghostView.poly(this.HEX_POINTS);
                ghostView.fill({ color: isSelected ? 0x00ff00 : 0x00ffff, alpha: isSelected ? 0.25 : 0.15 });
                ghostView.stroke({ color: isSelected ? 0x00ff00 : 0x00ffff, width: isSelected ? 6 : 4, alpha: 1 });

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
                            fill: 0x00ffff,
                            fontWeight: "600",
                        }),
                    });
                    tierText.anchor.set(0.5);
                    tierText.position.set(x, y + 15); // Абсолютные координаты
                    this.ghostPreviewLayer.addChild(tierText);
                }

                // Show rotate/place controls below selected ghost tile
                if (isSelected) {
                    this.renderTilePlacementControls(x, y);
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

        // Resource: показываем эмодзи для ресурсов
        if (tile.type === TileType.Resource) {
            // если монстр жив — показываем HP врага
            if (tile.encounterActive) {
                return `⚔️${tile.enemyHp || "?"}`;
            }

            // NEW: Множественные ресурсы
            if (tile.resources) {
                const emojis: string[] = [];
                if (tile.resources.biomass) emojis.push("🧬".repeat(tile.resources.biomass));
                if (tile.resources.materials) emojis.push("🧱".repeat(tile.resources.materials));
                if (tile.resources.alloys) emojis.push("⚙".repeat(tile.resources.alloys));
                return emojis.join("");
            }

            // OLD: Обратная совместимость
            const kind = tile.resource?.kind;
            const emoji = kind === "Biomass" ? "🧬" : kind === "Materials" ? "🧱" : kind === "Alloys" ? "⚙" : "📦";
            return emoji;
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
     * Получить валидные позиции для размещения тайла
     * Учитывает blocked edges с учетом текущего rotation
     */
    private getValidPlacementPositions(): HexCoord[] {
        const current = this.game.state.players[this.game.state.currentPlayerIndex];
        const currentTile = this.game.state.board.getTile(current.position);
        const nextTile = this.game.state.tileDeck.peekNextTile();
        
        if (!currentTile || !nextTile) return [];
        
        const validPositions: HexCoord[] = [];
        
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
            if (!canMoveBetween(currentTile, neighborCoord, tempTile)) {
                continue; // Заблокировано горами
            }
            
            validPositions.push(neighborCoord);
        }
        
        return validPositions;
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
    // Hero Board
    // --------------------
    private renderHeroBoard() {
        // Show MY player's Hero Board (not the current turn player)
        const playerIndex = this.myPlayerIndex;
        const p = this.game.state.players[playerIndex];
        if (!p) return; // Safety check
        
        const playerColor = this.PLAYER_COLORS[playerIndex % this.PLAYER_COLORS.length];
        
        this.heroBoardLayer.removeChildren(); // очищаем перед перерисовкой

        const panelW = 300;
        const panelH = 500;
        const panelX = this.app.renderer.width - panelW - 16;
        const panelY = 16;

        // Фон панели (градиент эффект через несколько слоёв)
        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x1a1f2e, alpha: 0.98 });
        bg.stroke({ color: playerColor, width: 4, alpha: 1 }); // Цвет игрока!
        this.heroBoardLayer.addChild(bg);

        // Внутренняя рамка для depth
        const innerFrame = new PIXI.Graphics();
        innerFrame.roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 8);
        innerFrame.stroke({ color: playerColor, width: 1, alpha: 0.3 }); // Тоже цвет игрока
        this.heroBoardLayer.addChild(innerFrame);

        // Заголовок Hero Board с фоном
        const titleBg = new PIXI.Graphics();
        titleBg.roundRect(panelX + 12, panelY + 10, panelW - 24, 40, 6);
        titleBg.fill({ color: 0x2d3748, alpha: 0.8 });
        titleBg.stroke({ color: playerColor, width: 2, alpha: 0.7 }); // Цвет игрока!
        this.heroBoardLayer.addChild(titleBg);

        const title = new PIXI.Text({
            text: `${p.id} - Hero Board`,
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: playerColor, // Цвет игрока!
                fontWeight: "800",
                dropShadow: {
                    alpha: 0.8,
                    angle: 90,
                    blur: 3,
                    color: 0x000000,
                    distance: 3,
                },
            }),
        });
        title.position.set(panelX + 20, panelY + 20);
        title.anchor.set(0, 0);
        this.heroBoardLayer.addChild(title);

        // Glory Level badge справа в заголовке
        const gloryBadge = new PIXI.Graphics();
        gloryBadge.roundRect(0, 0, 60, 24, 4);
        gloryBadge.fill({ color: 0xffd700, alpha: 0.2 });
        gloryBadge.stroke({ color: 0xffd700, width: 2, alpha: 0.8 });
        gloryBadge.position.set(panelX + panelW - 72, panelY + 18);
        this.heroBoardLayer.addChild(gloryBadge);

        const gloryText = new PIXI.Text({
            text: `⭐${p.prestige}`,
            style: new PIXI.TextStyle({
                fontSize: 14,
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
        gloryText.anchor.set(0.5);
        gloryText.position.set(panelX + panelW - 42, panelY + 30);
        this.heroBoardLayer.addChild(gloryText);

        let yOffset = panelY + 56;

        // Разделитель
        this.renderDivider(panelX + 16, yOffset, panelW - 32);
        yOffset += 12;

        // Life Tokens (сердечки)
        this.renderLifeTokens(p, panelX + 16, yOffset);
        yOffset += 45;

        // Resources (цветовая кодировка)
        const resourceContainer = new PIXI.Container();
        resourceContainer.position.set(panelX + 16, yOffset);

        const resources = [
            { label: "🧬", value: p.biomass, color: 0x00ff88 },    // green
            { label: "🧱", value: p.materials, color: 0xd97706 },  // orange
            { label: "⚙", value: p.alloys, color: 0x708090 },      // grey
        ];

        let xOffset = 0;
        resources.forEach((res) => {
            const text = new PIXI.Text({
                text: `${res.label} ${res.value}`,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: res.color,
                    fontWeight: "700",
                    dropShadow: {
                        alpha: 0.6,
                        angle: 90,
                        blur: 2,
                        color: 0x000000,
                        distance: 1,
                    },
                }),
            });
            text.position.set(xOffset, 0);
            resourceContainer.addChild(text);
            xOffset += 70;
        });

        this.heroBoardLayer.addChild(resourceContainer);
        yOffset += 35;

        // Разделитель
        this.renderDivider(panelX + 16, yOffset, panelW - 32);
        yOffset += 12;

        // Module Tokens
        this.renderModuleTokens(p, panelX + 16, yOffset);
        yOffset += 60;

        // Разделитель
        this.renderDivider(panelX + 16, yOffset, panelW - 32);
        yOffset += 12;

        // Inventory Slots
        this.renderInventory(p, panelX + 16, yOffset);
    }

    private renderDivider(x: number, y: number, width: number) {
        const divider = new PIXI.Graphics();
        divider.moveTo(x, y);
        divider.lineTo(x + width, y);
        divider.stroke({ color: 0x4a5568, width: 1, alpha: 0.4 });
        this.heroBoardLayer.addChild(divider);
    }

    private renderLifeTokens(p: { hp: number; maxHp: number }, x: number, y: number) {
        const heartSize = 18;
        const gap = 8;

        for (let i = 0; i < p.maxHp; i++) {
            const heart = new PIXI.Graphics();
            const filled = i < p.hp;

            // Настоящее сердечко (path)
            const s = heartSize / 20; // scale
            heart.moveTo(0, 6 * s);
            // Левая половина
            heart.bezierCurveTo(-5 * s, -3 * s, -12 * s, -3 * s, -12 * s, 2 * s);
            heart.bezierCurveTo(-12 * s, 7 * s, -8 * s, 12 * s, 0, 16 * s);
            // Правая половина
            heart.bezierCurveTo(8 * s, 12 * s, 12 * s, 7 * s, 12 * s, 2 * s);
            heart.bezierCurveTo(12 * s, -3 * s, 5 * s, -3 * s, 0, 6 * s);

            if (filled) {
                heart.fill({ color: 0xff3b4a, alpha: 1 });
                heart.stroke({ color: 0xcc0000, width: 1.5 });
            } else {
                heart.fill({ color: 0x2d3748, alpha: 0.6 });
                heart.stroke({ color: 0x4a5568, width: 1 });
            }

            heart.position.set(x + i * (heartSize + gap) + heartSize / 2, y + heartSize / 2);
            this.heroBoardLayer.addChild(heart);
        }

        const label = new PIXI.Text({
            text: `HP: ${p.hp}/${p.maxHp}`,
            style: new PIXI.TextStyle({ 
                fontSize: 13, 
                fill: 0xffffff, 
                fontWeight: "600",
                dropShadow: {
                    alpha: 0.5,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        label.position.set(x + p.maxHp * (heartSize + gap) + 12, y - 4);
        this.heroBoardLayer.addChild(label);
    }

    private renderModuleTokens(p: { modules: string[] }, x: number, y: number) {
        const label = new PIXI.Text({
            text: "Modules:",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xffffff, fontWeight: "600" }),
        });
        label.position.set(x, y);
        this.heroBoardLayer.addChild(label);

        if (p.modules.length === 0) {
            const none = new PIXI.Text({
                text: "None",
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x888888 }),
            });
            none.position.set(x + 90, y + 2);
            this.heroBoardLayer.addChild(none);
            return;
        }

        const tokenSize = 30;
        const gap = 8;
        for (let i = 0; i < p.modules.length; i++) {
            const token = new PIXI.Graphics();
            token.rect(0, 0, tokenSize, tokenSize);
            token.fill({ color: 0x4a5568, alpha: 1 });
            token.stroke({ color: 0x00ffff, width: 2 });

            const moduleLabel = new PIXI.Text({
                text: p.modules[i][0], // first letter of name
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xffffff, fontWeight: "700" }),
            });
            moduleLabel.anchor.set(0.5);
            moduleLabel.position.set(tokenSize / 2, tokenSize / 2);
            token.addChild(moduleLabel);

            token.position.set(x + 90 + i * (tokenSize + gap), y - 2);
            this.heroBoardLayer.addChild(token);
        }
    }

    private renderInventory(p: { inventory: { weapons: any[]; spells: any[]; amulet: any } }, x: number, y: number) {
        const slotSize = 44;
        const gap = 10;

        // Weapons
        const weaponsLabel = new PIXI.Text({
            text: "⚔️ Weapons:",
            style: new PIXI.TextStyle({ 
                fontSize: 15, 
                fill: 0xffd700, 
                fontWeight: "700",
                dropShadow: {
                    alpha: 0.5,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        weaponsLabel.position.set(x, y);
        this.heroBoardLayer.addChild(weaponsLabel);

        for (let i = 0; i < 4; i++) {
            const slot = this.renderInventorySlot(p.inventory.weapons[i], slotSize, "weapon");
            slot.position.set(x + i * (slotSize + gap), y + 28);
            this.heroBoardLayer.addChild(slot);
        }

        y += 90;

        // Spells
        const spellsLabel = new PIXI.Text({
            text: "✨ Spells:",
            style: new PIXI.TextStyle({ 
                fontSize: 15, 
                fill: 0x9b59b6, 
                fontWeight: "700",
                dropShadow: {
                    alpha: 0.5,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        spellsLabel.position.set(x, y);
        this.heroBoardLayer.addChild(spellsLabel);

        for (let i = 0; i < 4; i++) {
            const slot = this.renderInventorySlot(p.inventory.spells[i], slotSize, "spell");
            slot.position.set(x + i * (slotSize + gap), y + 28);
            this.heroBoardLayer.addChild(slot);
        }

        y += 90;

        // Amulet
        const amuletLabel = new PIXI.Text({
            text: "📿 Amulet:",
            style: new PIXI.TextStyle({ 
                fontSize: 15, 
                fill: 0x3498db, 
                fontWeight: "700",
                dropShadow: {
                    alpha: 0.5,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        amuletLabel.position.set(x, y);
        this.heroBoardLayer.addChild(amuletLabel);

        const amuletSlot = this.renderInventorySlot(p.inventory.amulet, slotSize * 1.2, "amulet");
        amuletSlot.position.set(x, y + 28);
        this.heroBoardLayer.addChild(amuletSlot);
    }

    private renderInventorySlot(item: any | null, size: number, type: "weapon" | "spell" | "amulet"): PIXI.Container {
        const container = new PIXI.Container();

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, size, size, 8);
        
        if (item) {
            // Градиент для заполненного слота
            bg.fill({ color: 0x4a5568, alpha: 1 });
            bg.stroke({ color: 0xffd700, width: 2.5 });

            const itemText = new PIXI.Text({
                text: item.name?.[0] || "?",
                style: new PIXI.TextStyle({ 
                    fontSize: 20, 
                    fill: 0xffffff, 
                    fontWeight: "700",
                    dropShadow: {
                        alpha: 0.8,
                        angle: 90,
                        blur: 2,
                        color: 0x000000,
                        distance: 2,
                    },
                }),
            });
            itemText.anchor.set(0.5);
            itemText.position.set(size / 2, size / 2);
            container.addChild(itemText);
        } else {
            // Пустой слот с subtle inner shadow эффектом
            bg.fill({ color: 0x1a1f2e, alpha: 0.8 });
            bg.stroke({ color: 0x2d3748, width: 2 });

            // Subtle icon для типа слота
            const iconMap = { weapon: "⚔", spell: "✨", amulet: "📿" };
            const icon = new PIXI.Text({
                text: iconMap[type],
                style: new PIXI.TextStyle({ 
                    fontSize: size * 0.4, 
                    fill: 0x4a5568, 
                    fontWeight: "400",
                }),
            });
            icon.anchor.set(0.5);
            icon.position.set(size / 2, size / 2);
            icon.alpha = 0.3;
            container.addChild(icon);
        }

        container.addChild(bg);
        return container;
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

    private showContextMenu(coord: HexCoord): void {
        const player = this.game.state.players[this.game.state.currentPlayerIndex];
        const tile = this.game.state.board.getTile(coord);
        const playerPos = player.position;
        
        // Calculate what actions are available for this tile
        const actions = this.getAvailableActionsForTile(coord, playerPos, tile);
        
        if (actions.length === 0) {
            // If clicking same tile as context menu, close it
            if (this.contextMenuVisible && 
                this.contextMenuTile?.q === coord.q && 
                this.contextMenuTile?.r === coord.r) {
                this.hideContextMenu();
                return;
            }
            
            // Try to move to this tile instead
            if (tile && tile.discovered) {
                this.game.handleHexClick(coord);
                this.renderAll();
            }
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
            // Fog tile - can explore if neighbor
            if (isNeighbor && this.game.state.actionPoints >= 1) {
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
            // GATHER - if has resource and no monster
            const hasResources = tile.resources && 
                ((tile.resources.biomass ?? 0) > 0 || 
                 (tile.resources.materials ?? 0) > 0 || 
                 (tile.resources.alloys ?? 0) > 0);
            
            if (hasResources && !tile.encounterActive) {
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
            }
        } else if (isNeighbor) {
            // Can move to this tile
            actions.push({
                key: "MOVE",
                label: "Move",
                emoji: "👣",
                hint: "Move to this tile",
                enabled: true,
                action: () => {
                    this.hideContextMenu();
                    this.game.handleHexClick(coord);
                    this.renderAll();
                }
            });
        }
        
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
    private renderTilePlacementControls(tileX: number, tileY: number): void {
        // Transform to screen coordinates
        const screenX = (tileX + this.panX) * this.zoom + this.app.screen.width / 2;
        const screenY = (tileY + this.panY) * this.zoom + this.app.screen.height / 2;
        
        const controlsY = screenY + this.HEX_SIZE * this.zoom + 15;
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
        
        // Place button (✓ PLACE)
        const placeBtnW = 80;
        const placeBtnX = (btnW + gap) * 2;
        const placeBtn = new PIXI.Graphics();
        placeBtn.roundRect(placeBtnX, 0, placeBtnW, btnH, 8);
        placeBtn.fill({ color: 0x2d6a4d });
        placeBtn.stroke({ color: 0x4ade80, width: 2 });
        placeBtn.eventMode = "static";
        placeBtn.cursor = "pointer";
        placeBtn.hitArea = new PIXI.Rectangle(placeBtnX, 0, placeBtnW, btnH);
        
        const placeLabel = new PIXI.Text({
            text: "✓ PLACE",
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0xffffff, fontWeight: "700" }),
        });
        placeLabel.anchor.set(0.5);
        placeLabel.position.set(placeBtnX + placeBtnW / 2, btnH / 2);
        placeLabel.eventMode = "none";
        
        placeBtn.addChild(placeLabel);
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
        
        controlsContainer.addChild(placeBtn);
        
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
     * Show animated dice roll
     * @param result The dice result to show
     * @param onComplete Callback when animation completes
     */
    public showDiceRoll(result: { swords: number; skulls: number }, onComplete?: () => void): void {
        this.diceResult = result;
        this.diceCallback = onComplete || null;
        
        this.animateDiceRoll();
    }

    private animateDiceRoll(): void {
        this.diceLayer.removeChildren();
        
        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;
        
        // Backdrop
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        this.diceLayer.addChild(backdrop);
        
        // Dice container (centered)
        const diceSize = 120;
        const diceX = screenW / 2;
        const diceY = screenH / 2 - 40;
        
        // Animation: show random faces quickly, then settle on result
        const DICE_FACES = [
            { emoji: "⚔️⚔️⚔️", color: 0x00ff00 }, // 3 swords
            { emoji: "⚔️⚔️", color: 0x00dd00 },   // 2 swords
            { emoji: "⚔️", color: 0x00bb00 },     // 1 sword
            { emoji: "⚔️💀", color: 0xffaa00 },   // 1 sword + 1 skull
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
        
        // Animate rolling
        let frame = 0;
        const totalFrames = 15;
        const rollInterval = setInterval(() => {
            frame++;
            
            // Remove old dice
            for (let i = this.diceLayer.children.length - 1; i > 0; i--) {
                this.diceLayer.removeChildAt(i);
            }
            
            // Random face during animation
            const randomFace = DICE_FACES[Math.floor(Math.random() * 6)];
            const currentFace = frame >= totalFrames ? finalFace : randomFace;
            
            // Draw dice
            const dice = new PIXI.Graphics();
            const wobble = frame < totalFrames ? Math.sin(frame * 0.8) * 10 : 0;
            
            dice.roundRect(diceX - diceSize/2 + wobble, diceY - diceSize/2, diceSize, diceSize, 16);
            dice.fill({ color: 0x1a1a2e });
            dice.stroke({ color: currentFace.color, width: 4 });
            this.diceLayer.addChild(dice);
            
            // Dice emoji
            const diceText = new PIXI.Text({
                text: currentFace.emoji,
                style: new PIXI.TextStyle({
                    fontSize: 40,
                    fill: 0xffffff,
                }),
            });
            diceText.anchor.set(0.5);
            diceText.position.set(diceX + wobble, diceY);
            this.diceLayer.addChild(diceText);
            
            // Result text (show after settling)
            if (frame >= totalFrames) {
                clearInterval(rollInterval);
                
                // Result summary
                const resultText = new PIXI.Text({
                    text: `⚔️ ${this.diceResult!.swords} damage   💀 ${this.diceResult!.skulls} wounds`,
                    style: new PIXI.TextStyle({
                        fontSize: 24,
                        fill: 0xffffff,
                        fontWeight: "700",
                    }),
                });
                resultText.anchor.set(0.5);
                resultText.position.set(diceX, diceY + diceSize/2 + 30);
                this.diceLayer.addChild(resultText);
                
                // "Click to continue" text
                const continueText = new PIXI.Text({
                    text: "Click to continue...",
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: 0x888888,
                        fontStyle: "italic",
                    }),
                });
                continueText.anchor.set(0.5);
                continueText.position.set(diceX, diceY + diceSize/2 + 70);
                this.diceLayer.addChild(continueText);
                
                // Make backdrop clickable to dismiss
                backdrop.eventMode = "static";
                backdrop.cursor = "pointer";
                backdrop.on("pointerdown", () => {
                    this.hideDiceRoll();
                    if (this.diceCallback) {
                        this.diceCallback();
                    }
                });
            }
        }, 80); // 80ms per frame = ~1.2s total animation
    }

    private hideDiceRoll(): void {
        this.diceLayer.removeChildren();
        this.diceResult = null;
        this.diceCallback = null;
    }
}
