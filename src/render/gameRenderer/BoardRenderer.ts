import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { HexCoord } from "../../board/Hex";
import { hexKey, neighbors } from "../../board/Hex";
import { TileType } from "../../board/TileTypes";
import { canMoveBetween } from "../../board/BlockedEdges";
import { type EdgeIndex, getEdgeVertices } from "../../board/HexEdges";
import type { Tile } from "../../board/Tile";

export type BoardRendererOptions = {
    app: PIXI.Application;
    game: Game;
    boardLayer: PIXI.Container;
    playersLayer: PIXI.Container;
    labelsLayer: PIXI.Container;
    ghostPreviewLayer: PIXI.Container;
    rotationIndicatorsLayer: PIXI.Container;
    contextMenuLayer: PIXI.Container;
    playerColors: number[];
    isMyTurn: () => boolean;
    onShowContextMenu: (coord: HexCoord) => void;
    onRenderAll: () => void;
};

export class BoardRenderer {
    private HEX_SIZE = 50;
    private HEX_POINTS: number[];

    private tileViews = new Map<string, PIXI.Graphics>();
    private tileLabels = new Map<string, PIXI.Text>();
    private playerViews: PIXI.Graphics[] = [];

    private hoverOverlays = new Map<string, PIXI.Graphics>();
    private hoveredKey: string | null = null;

    private zoom = 1;
    private minZoom = 0.5;
    private maxZoom = 2;
    private panX = 0;
    private panY = 0;
    private isDragging = false;
    private dragStart = { x: 0, y: 0 };

    private playerColors: number[];

    constructor(private options: BoardRendererOptions) {
        this.HEX_POINTS = this.buildHexPoints(this.HEX_SIZE);
        this.playerColors = options.playerColors;
    }

    public getHexSize(): number {
        return this.HEX_SIZE;
    }

    public getViewport(): { panX: number; panY: number; zoom: number } {
        return { panX: this.panX, panY: this.panY, zoom: this.zoom };
    }

    public hexToPixel(c: HexCoord): { x: number; y: number } {
        const x = this.HEX_SIZE * (Math.sqrt(3) * c.q + (Math.sqrt(3) / 2) * c.r);
        const y = this.HEX_SIZE * ((3 / 2) * c.r);
        return { x, y };
    }

    public screenFromHex(c: HexCoord): { x: number; y: number } {
        const { x, y } = this.hexToPixel(c);
        const { panX, panY, zoom } = this.getViewport();
        return {
            x: (x + panX) * zoom + this.options.app.screen.width / 2,
            y: (y + panY) * zoom + this.options.app.screen.height / 2,
        };
    }

    public setupZoomAndPan(): void {
        this.options.app.canvas.addEventListener("wheel", (e: WheelEvent) => {
            e.preventDefault();

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

            this.applyTransform();
            this.options.onRenderAll();
        });

        this.options.app.canvas.addEventListener("mousedown", (e: MouseEvent) => {
            if (e.button === 2) {
                e.preventDefault();
                this.isDragging = true;
                this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
                this.options.app.canvas.style.cursor = "grab";
            }
        });

        this.options.app.canvas.addEventListener("mousemove", (e: MouseEvent) => {
            if (this.isDragging) {
                this.panX = e.clientX - this.dragStart.x;
                this.panY = e.clientY - this.dragStart.y;
                this.applyTransform();
                this.options.app.canvas.style.cursor = "grabbing";
            }
        });

        this.options.app.canvas.addEventListener("mouseup", () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.options.app.canvas.style.cursor = "default";
            }
        });

        this.options.app.canvas.addEventListener("mouseleave", () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.options.app.canvas.style.cursor = "default";
            }
        });

        this.options.app.canvas.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
        });
    }

    public applyTransform(): void {
        const centerX = this.options.app.renderer.width / 2 + this.panX;
        const centerY = this.options.app.renderer.height / 2 + this.panY;

        this.options.boardLayer.scale.set(this.zoom);
        this.options.boardLayer.position.set(centerX, centerY);

        this.options.ghostPreviewLayer.scale.set(this.zoom);
        this.options.ghostPreviewLayer.position.set(centerX, centerY);

        this.options.rotationIndicatorsLayer.scale.set(this.zoom);
        this.options.rotationIndicatorsLayer.position.set(centerX, centerY);

        this.options.playersLayer.scale.set(this.zoom);
        this.options.playersLayer.position.set(
            this.options.app.renderer.width / 2 + this.panX,
            this.options.app.renderer.height / 2 + this.panY
        );
    }

    public forceRebuildViews(): void {
        for (const view of this.tileViews.values()) {
            this.options.boardLayer.removeChild(view);
        }
        this.tileViews.clear();
        this.tileLabels.clear();
        this.options.labelsLayer.removeChildren();
        console.log("[Render] Forced rebuild of all tile views");
    }

    public renderBoard(): void {
        this.applyTransform();
        const allowed = this.getAllowedHexKeys();

        const current = this.options.game.state.players[this.options.game.state.currentPlayerIndex];

        const gatherHere = this.canGatherHere();

        const allTiles = this.options.game.state.board.getAllTiles();
        const currentTileKeys = new Set(allTiles.map(tile => hexKey(tile.coord)));

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

        for (const [key, view] of this.tileViews) {
            if (!currentTileKeys.has(key) && !fogKeys.has(key)) {
                this.options.boardLayer.removeChild(view);
                this.tileViews.delete(key);
            }
        }

        for (const tile of allTiles) {
            const key = hexKey(tile.coord);

            let view = this.tileViews.get(key);

            if (!view) {
                view = new PIXI.Graphics();
                view.hitArea = new PIXI.Polygon(this.HEX_POINTS);
                view.eventMode = "static";
                view.cursor = "pointer";
                this.tileViews.set(key, view);
                this.options.boardLayer.addChildAt(view, 0);
            } else {
                view.removeAllListeners();
            }

            view.eventMode = this.options.isMyTurn() ? "static" : "none";
            view.cursor = this.options.isMyTurn() ? "pointer" : "default";

            view.on("pointerdown", () => {
                if (!this.options.isMyTurn()) return;
                this.options.onShowContextMenu(tile.coord);
            });

            view.on("pointerover", () => {
                if (!this.options.isMyTurn()) return;
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

            view.stroke({ color: 0x0d0d0d, width: 2, alpha: 1 });

            if (tile.discovered) {
                view.stroke({ color: 0x9fd4ff, width: 1, alpha: 0.18 });
            }

            if (allowed.has(key)) {
                view.stroke({ color: 0xffffff, width: 4, alpha: 0.9 });
            }

            if (gatherHere && key === hexKey(current.position)) {
                view.stroke({ color: 0x00ff88, width: 4, alpha: 0.65 });
            }

            if (tile.discovered && tile.blockedEdges && tile.blockedEdges.length > 0) {
                this.drawMountains(view, tile.blockedEdges);
            }

            if (tile.ownerId) {
                this.drawBase(view, tile.ownerId);
            }

            this.drawHoverOverlay(key, x, y, this.hoveredKey === key);
        }

        for (const [key, view] of this.tileViews) {
            const [q, r] = key.split(",").map(Number);
            const tile = this.options.game.state.board.getTile({ q, r });
            if (!tile) {
                view.visible = false;
            }
        }

        this.options.ghostPreviewLayer.removeChildren();

        if (this.options.game.state.uiMode === "TILE_PLACEMENT" && this.options.isMyTurn()) {
            const allPositions = this.getAllPlacementPositions();
            const hasSelectedPosition = this.options.game.state.selectedPlacementPosition !== null;

            for (const { coord, blocked } of allPositions) {
                const targetKey = hexKey(coord);

                const isSelected = this.options.game.state.selectedPlacementPosition
                    && this.options.game.state.selectedPlacementPosition.q === coord.q
                    && this.options.game.state.selectedPlacementPosition.r === coord.r;

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
                    this.options.boardLayer.addChildAt(ghostView, 0);
                }

                ghostView.eventMode = this.options.isMyTurn() ? "static" : "none";
                ghostView.cursor = blocked ? "not-allowed" : "pointer";
                ghostView.removeAllListeners();

                ghostView.on("pointerover", () => {
                    if (!this.options.isMyTurn()) return;
                    this.options.game.selectPlacementPosition(coord);
                    this.options.onRenderAll();
                });

                const { x, y } = this.hexToPixel(coord);
                ghostView.position.set(x, y);
                ghostView.visible = true;

                ghostView.clear();
                ghostView.poly(this.HEX_POINTS);

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

                const nextTile = this.options.game.state.tileDeck.peekNextTile();
                if (nextTile) {
                    if (nextTile.blockedEdges && nextTile.blockedEdges.length > 0) {
                        const rotatedEdges = nextTile.blockedEdges.map(
                            edge => (edge + this.options.game.state.pendingTileRotation) % 6
                        );
                        this.drawMountains(ghostView, rotatedEdges);
                    }

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
                        previewText.position.set(x, y - 10);
                        this.options.ghostPreviewLayer.addChild(previewText);
                    }

                    const tierText = new PIXI.Text({
                        text: `T${nextTile.tier}`,
                        style: new PIXI.TextStyle({
                            fontSize: 12,
                            fill: blocked ? 0xff6666 : 0x00ffff,
                            fontWeight: "600",
                        }),
                    });
                    tierText.anchor.set(0.5);
                    tierText.position.set(x, y + 15);
                    this.options.ghostPreviewLayer.addChild(tierText);

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
                        this.options.ghostPreviewLayer.addChild(blockedText);
                    }
                }

                if (isSelected) {
                    this.renderTilePlacementControls(x, y, blocked);
                }

                ghostView.visible = true;
            }
        }

        if (this.options.game.state.uiMode !== "TILE_PLACEMENT") {
            this.renderFogTilesAroundPlayer();
        }
    }

    public renderFogTilesAroundPlayer(): void {
        if (!this.options.isMyTurn()) return;
        if (this.options.game.state.actionPoints < 1) return;
        if (this.options.game.state.actionUsedInCurrentSlot) return;
        if (this.options.game.state.tileDeck.getRemainingCount() <= 0) return;

        const player = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const playerNeighbors = neighbors(player.position);

        for (const coord of playerNeighbors) {
            const existing = this.options.game.state.board.getTile(coord);
            if (existing) continue;

            const playerTile = this.options.game.state.board.getTile(player.position);
            if (playerTile && !canMoveBetween(playerTile, coord, null)) {
                continue;
            }

            const key = hexKey(coord);
            let fogView = this.tileViews.get(key);

            if (!fogView) {
                fogView = new PIXI.Graphics();
                fogView.hitArea = new PIXI.Polygon(this.HEX_POINTS);
                this.tileViews.set(key, fogView);
                this.options.boardLayer.addChild(fogView);
            }

            fogView.removeAllListeners();
            fogView.eventMode = "static";
            fogView.cursor = "pointer";

            fogView.on("pointerdown", () => {
                if (!this.options.isMyTurn()) return;
                this.options.onShowContextMenu(coord);
            });

            fogView.on("pointerover", () => {
                if (!this.options.isMyTurn()) return;
                this.hoveredKey = key;
                fogView!.clear();
                fogView!.poly(this.HEX_POINTS);
                fogView!.fill({ color: 0x4a90d9, alpha: 0.3 });
                fogView!.stroke({ color: 0x4a90d9, width: 3, alpha: 1 });

                const { x, y } = this.hexToPixel(coord);
                const questionMark = new PIXI.Text({
                    text: "🔭",
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                questionMark.anchor.set(0.5);
                questionMark.position.set(x, y);
                questionMark.name = "fogIcon";
                this.options.ghostPreviewLayer.addChild(questionMark);
            });

            fogView.on("pointerout", () => {
                if (this.hoveredKey === key) this.hoveredKey = null;
                fogView!.clear();
                fogView!.poly(this.HEX_POINTS);
                fogView!.fill({ color: 0x2a2a4a, alpha: 0.4 });
                fogView!.stroke({ color: 0x4a4a6a, width: 2, alpha: 0.6 });

                const icon = this.options.ghostPreviewLayer.getChildByName("fogIcon");
                if (icon) this.options.ghostPreviewLayer.removeChild(icon);
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

    public renderLabels(): void {
        this.options.labelsLayer.removeChildren();
        this.tileLabels.clear();

        const allTiles = this.options.game.state.board.getAllTiles();

        for (const tile of allTiles) {
            const key = hexKey(tile.coord);
            const text = this.getTileLabel(tile);

            if (!text) continue;

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
            this.options.labelsLayer.addChild(label);
        }
    }

    public renderPlayers(): void {
        this.ensurePlayersCreated();

        for (let i = 0; i < this.options.game.state.players.length; i++) {
            const p = this.options.game.state.players[i];
            const v = this.playerViews[i];

            const { x, y } = this.hexToPixel(p.position);
            const offset = this.getPlayerOffset(i);

            v.clear();

            const isCurrent = i === this.options.game.state.currentPlayerIndex;
            const fill = this.playerColors[i % this.playerColors.length];

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

    public renderRotationIndicators(): void {
        this.options.rotationIndicatorsLayer.removeChildren();

        if (this.options.game.state.uiMode !== "TILE_PLACEMENT") return;
        if (!this.options.isMyTurn()) return;
        if (this.options.game.state.selectedPlacementPosition !== null) return;

        const validPositions = this.getValidPlacementPositions();

        const rotation = this.options.game.state.pendingTileRotation;
        const angle = (rotation * 60) * (Math.PI / 180);
        const markerDist = this.HEX_SIZE - 10;
        const markerRadius = 14;

        for (const coord of validPositions) {
            const { x, y } = this.hexToPixel(coord);

            const markerX = Math.cos(angle - Math.PI / 2) * markerDist;
            const markerY = Math.sin(angle - Math.PI / 2) * markerDist;

            const indicator = new PIXI.Graphics();
            indicator.eventMode = "none";
            indicator.position.set(x + markerX, y + markerY);

            indicator.circle(0, 0, markerRadius);
            indicator.fill({ color: 0xff6600, alpha: 1 });
            indicator.stroke({ color: 0xffffff, width: 3, alpha: 1 });

            this.options.rotationIndicatorsLayer.addChild(indicator);
        }
    }

    private ensurePlayersCreated(): void {
        for (let i = 0; i < this.options.game.state.players.length; i++) {
            if (this.playerViews[i]) continue;

            const g = new PIXI.Graphics();
            g.eventMode = "none";
            this.playerViews[i] = g;
            this.options.playersLayer.addChild(g);
        }
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
        if (!discovered) return 0x0f1822;

        switch (type) {
            case TileType.LandingHub:
                return 0x9a7440;
            case TileType.Resource:
                return 0x4a9158;
            case TileType.StartingSector:
                return 0x3a6a8a;
            case TileType.Base:
                return 0x5a5a9a;
            case TileType.Empty:
            default:
                return 0x425262;
        }
    }

    private getAllowedHexKeys(): Set<string> {
        const current = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const allowed = [hexKey(current.position)];

        if (!this.options.game.state.actionUsedInCurrentSlot) {
            const validNeighbors = neighbors(current.position).filter(coord => {
                const tile = this.options.game.state.board.getTile(coord);
                return tile !== undefined;
            });
            allowed.push(...validNeighbors.map(hexKey));
        }

        return new Set<string>(allowed);
    }

    private canGatherHere(): boolean {
        if (this.options.game.state.actionPoints <= 0) return false;

        const p = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const here = this.options.game.state.board.getTile(p.position);

        if (!here) return false;
        if (!here.discovered) return false;
        if (here.type !== TileType.Resource && here.type !== TileType.StartingSector) return false;
        if (here.encounterActive === true) return false;
        if (here.ownerId) return false;

        const hasResources = here.resources && Object.keys(here.resources).length > 0;
        if (!hasResources) return false;

        const cooldown = here.cooldownUntilRoundByPlayer?.[p.id] ?? 0;
        return cooldown <= this.options.game.state.round;
    }

    private drawBase(view: PIXI.Graphics, ownerId: string): void {
        const playerIndex = parseInt(ownerId.replace("P", "")) - 1;
        const color = this.playerColors[playerIndex] || 0xffffff;

        view.poly(this.HEX_POINTS);
        view.stroke({ color, width: 6, alpha: 0.9 });

        view.circle(0, 0, 18);
        view.fill({ color: 0x2d3748, alpha: 0.9 });
        view.circle(0, 0, 18);
        view.stroke({ color, width: 3, alpha: 1 });
    }

    private drawMountains(view: PIXI.Graphics, blockedEdges: number[]): void {
        for (const edge of blockedEdges) {
            const [x1, y1, x2, y2] = getEdgeVertices(edge as EdgeIndex, this.HEX_SIZE);

            view.moveTo(x1, y1);
            view.lineTo(x2, y2);
            view.stroke({ color: 0x2d3748, width: 8, alpha: 1 });

            view.moveTo(x1, y1);
            view.lineTo(x2, y2);
            view.stroke({ color: 0x1a202c, width: 4, alpha: 1 });
        }
    }

    private ensureHoverOverlay(key: string): PIXI.Graphics {
        let ov = this.hoverOverlays.get(key);
        if (!ov) {
            ov = new PIXI.Graphics();
            ov.eventMode = "none";
            this.hoverOverlays.set(key, ov);
            this.options.boardLayer.addChild(ov);
        }
        return ov;
    }

    private drawHoverOverlay(key: string, x: number, y: number, visible: boolean): void {
        const ov = this.ensureHoverOverlay(key);
        ov.position.set(x, y);
        ov.visible = visible;

        if (!visible) return;

        ov.clear();
        ov.poly(this.HEX_POINTS);
        ov.fill({ color: 0xffffff, alpha: 0.12 });
        ov.stroke({ color: 0xffffff, width: 2, alpha: 0.25 });
    }

    private getTileLabel(tile: any): string {
        if (!tile.discovered && tile.tier) {
            return `T${tile.tier}`;
        }

        if (!tile.discovered) return "";

        if (tile.type === TileType.LandingHub) return "🚀 Hub";

        if (tile.type === TileType.StartingSector) {
            const playerId = tile.sectorPlayerId || "?";
            const resourceEmojis: string[] = [];
            if (tile.resources) {
                if (tile.resources.biomass) resourceEmojis.push("🧬".repeat(tile.resources.biomass));
                if (tile.resources.materials) resourceEmojis.push("🧱".repeat(tile.resources.materials));
                if (tile.resources.alloys) resourceEmojis.push("⚙".repeat(tile.resources.alloys));
            }
            if (tile.componentBonus) {
                resourceEmojis.push(`+${tile.componentBonus}🧩`);
            }
            if (tile.encounterActive) {
                const tier = tile.monsterTier ?? 1;
                const player = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
                const hasPrestigePenalty = player.prestige >= 12;
                const required = hasPrestigePenalty ? tier + 1 : tier;

                if (hasPrestigePenalty) {
                    resourceEmojis.push(`👹T${tier}+1=${required}⚔`);
                } else {
                    resourceEmojis.push(`👹T${tier}=${required}⚔`);
                }
            }
            const resourceLabel = resourceEmojis.join(" ");
            return resourceLabel ? `🏠${playerId}\n${resourceLabel}` : `🏠${playerId}`;
        }

        if (tile.type === TileType.Base && tile.ownerId) {
            return `🏰 ${tile.ownerId}`;
        }

        const emojis: string[] = [];

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
        if (tile.componentBonus) {
            emojis.push(`+${tile.componentBonus}🧩`);
        }

        if (tile.encounterActive) {
            const tier = tile.monsterTier ?? 1;
            const player = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
            const hasPrestigePenalty = player.prestige >= 12;
            const required = hasPrestigePenalty ? tier + 1 : tier;

            if (hasPrestigePenalty) {
                emojis.push(`👹T${tier}+1=${required}⚔`);
            } else {
                emojis.push(`👹T${tier}=${required}⚔`);
            }
        }

        return emojis.join(" ");
    }

    private getPlayerOffset(index: number): { x: number; y: number } {
        const radius = 12;
        const angle = (Math.PI * 2 * index) / 4;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }

    private getAllPlacementPositions(): Array<{ coord: HexCoord; blocked: boolean }> {
        const current = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const currentTile = this.options.game.state.board.getTile(current.position);
        const nextTile = this.options.game.state.tileDeck.peekNextTile();

        if (!currentTile || !nextTile) return [];

        const positions: Array<{ coord: HexCoord; blocked: boolean }> = [];

        for (const neighborCoord of neighbors(current.position)) {
            const existing = this.options.game.state.board.getTile(neighborCoord);
            if (existing) continue;

            const rotatedEdges = nextTile.blockedEdges && nextTile.blockedEdges.length > 0
                ? nextTile.blockedEdges.map(edge => (edge + this.options.game.state.pendingTileRotation) % 6)
                : [];

            const tempTile: Tile = {
                coord: neighborCoord,
                discovered: true,
                type: TileType.Resource,
                blockedEdges: rotatedEdges,
            };

            const blocked = !canMoveBetween(currentTile, neighborCoord, tempTile);

            positions.push({ coord: neighborCoord, blocked });
        }

        return positions;
    }

    private getValidPlacementPositions(): HexCoord[] {
        return this.getAllPlacementPositions()
            .filter(p => !p.blocked)
            .map(p => p.coord);
    }

    private renderTilePlacementControls(tileX: number, tileY: number, blocked: boolean = false): void {
        const { panX, panY, zoom } = this.getViewport();
        const screenX = (tileX + panX) * zoom + this.options.app.screen.width / 2;
        const screenY = (tileY + panY) * zoom + this.options.app.screen.height / 2;

        const controlsY = screenY + this.HEX_SIZE * zoom * 0.6;
        const btnW = 50;
        const btnH = 36;
        const gap = 10;

        const controlsContainer = new PIXI.Container();
        controlsContainer.position.set(screenX - (btnW * 2 + gap * 1.5 + 70) / 2, controlsY);

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
            this.options.game.state.pendingTileRotation = (this.options.game.state.pendingTileRotation + 5) % 6;
            this.options.onRenderAll();
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
            this.options.game.state.pendingTileRotation = (this.options.game.state.pendingTileRotation + 1) % 6;
            this.options.onRenderAll();
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

        const placeBtnW = 80;
        const placeBtnX = (btnW + gap) * 2;
        const placeBtn = new PIXI.Graphics();
        placeBtn.roundRect(placeBtnX, 0, placeBtnW, btnH, 8);

        if (blocked) {
            placeBtn.fill({ color: 0x444444 });
            placeBtn.stroke({ color: 0x666666, width: 2 });
            placeBtn.eventMode = "none";
            placeBtn.cursor = "not-allowed";
        } else {
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
                fontWeight: "700",
            }),
        });
        placeLabel.anchor.set(0.5);
        placeLabel.position.set(placeBtnX + placeBtnW / 2, btnH / 2);
        placeLabel.eventMode = "none";

        placeBtn.addChild(placeLabel);

        if (!blocked) {
            placeBtn.on("pointerdown", () => {
                this.options.game.placeTileAtSelected();
                this.options.onRenderAll();
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
            this.options.game.state.uiMode = "NONE";
            this.options.game.state.selectedPlacementPosition = null;
            this.options.game.state.pendingTileRotation = 0;
            this.options.onRenderAll();
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

        this.options.contextMenuLayer.addChild(controlsContainer);
    }
}
