import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { HexCoord } from "../../board/Hex";
import { neighbors } from "../../board/Hex";
import { TileType } from "../../board/TileTypes";
import type { Tile } from "../../board/Tile";
import type { TutorialHintsManager } from "../ui/TutorialHintsManager";

export type ShowHintOptions = {
    x?: number;
    y?: number;
    anchor?: "center" | "top" | "bottom";
    showOnce?: boolean;
    highlightRect?: { x: number; y: number; width: number; height: number };
};

type ActionItem = {
    key: string;
    label: string;
    emoji: string;
    hint: string;
    enabled: boolean;
    action: () => void;
};

export type ContextMenuRendererOptions = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    tutorialHints: TutorialHintsManager;
    isMyTurn: () => boolean;
    onRenderAll: () => void;
    showHint: (id: string, title: string, message: string, options?: ShowHintOptions) => void;
    hexToPixel: (coord: HexCoord) => { x: number; y: number };
    getViewport: () => { panX: number; panY: number; zoom: number };
    getHexSize: () => number;
    onShowHireUnitMenu: () => void;
    onShowOrbitalHangarMenu: () => void;
};

export class ContextMenuRenderer {
    private contextMenuVisible = false;
    private contextMenuTile: HexCoord | null = null;
    private hintContainer: PIXI.Container | null = null;

    private lastClickTime = 0;
    private lastClickCoord: HexCoord | null = null;

    constructor(private options: ContextMenuRendererOptions) {}

    public beginFrame(): void {
        this.options.layer.removeChildren();
    }

    public showContextMenu(coord: HexCoord): void {
        const now = Date.now();
        if (
            this.lastClickCoord
            && this.lastClickCoord.q === coord.q
            && this.lastClickCoord.r === coord.r
            && now - this.lastClickTime < 300
        ) {
            return;
        }
        this.lastClickTime = now;
        this.lastClickCoord = coord;

        const player = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const tile = this.options.game.state.board.getTile(coord);
        const playerPos = player.position;

        const isOnTile = playerPos.q === coord.q && playerPos.r === coord.r;
        const isNeighbor = neighbors(playerPos).some(n => n.q === coord.q && n.r === coord.r);

        if (!isOnTile && isNeighbor && tile && tile.discovered) {
            const prevPlayerIndex = this.options.game.state.currentPlayerIndex;
            const prevPos = { ...player.position };

            this.options.game.handleHexClick(coord);
            this.options.onRenderAll();

            const turnChanged = this.options.game.state.currentPlayerIndex !== prevPlayerIndex;
            if (turnChanged) {
                return;
            }

            const currentPlayer = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
            const newPos = currentPlayer.position;
            const didMove = prevPos.q !== newPos.q || prevPos.r !== newPos.r;

            if (didMove && this.options.game.state.actionPoints > 0 && this.options.isMyTurn()) {
                setTimeout(() => {
                    if (this.options.game.state.actionPoints > 0 && this.options.isMyTurn()) {
                        const newTile = this.options.game.state.board.getTile(newPos);
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

        if (
            this.contextMenuVisible
            && this.contextMenuTile?.q === coord.q
            && this.contextMenuTile?.r === coord.r
        ) {
            this.hideContextMenu();
            return;
        }

        const actions = this.getAvailableActionsForTile(coord, playerPos, tile);

        if (actions.length === 0) {
            this.hideContextMenu();
            return;
        }

        this.contextMenuTile = coord;
        this.contextMenuVisible = true;
        this.renderContextMenu(coord, actions);
    }

    public hideContextMenu(): void {
        this.contextMenuVisible = false;
        this.contextMenuTile = null;
        this.options.layer.removeChildren();
    }

    public clearActionHint(): void {
        this.hideActionHint();
    }

    private getAvailableActionsForTile(
        coord: HexCoord,
        playerPos: HexCoord,
        tile: Tile | undefined
    ): ActionItem[] {
        const actions: ActionItem[] = [];
        const player = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const isOnTile = playerPos.q === coord.q && playerPos.r === coord.r;
        const isNeighbor = neighbors(playerPos).some(n => n.q === coord.q && n.r === coord.r);

        if (!tile || !tile.discovered) {
            const hasRemainingTiles = this.options.game.state.tileDeck.getRemainingCount() > 0;
            if (isNeighbor && this.options.game.state.actionPoints >= 1 && hasRemainingTiles) {
                actions.push({
                    key: "EXPLORE",
                    label: "Explore",
                    emoji: "🔭",
                    hint: "Discover new territory",
                    enabled: true,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.state.uiMode = "TILE_PLACEMENT";
                        this.options.game.state.selectedPlacementPosition = coord;
                        this.options.onRenderAll();
                    },
                });
            }
            return actions;
        }

        if (isOnTile) {
            const hasResources = tile.resources
                && ((tile.resources.biomass ?? 0) > 0
                    || (tile.resources.materials ?? 0) > 0
                    || (tile.resources.alloys ?? 0) > 0);

            if (hasResources && !tile.encounterActive && !tile.ownerId) {
                const mainResource = tile.resources!.biomass
                    ? "Biomass"
                    : tile.resources!.materials
                        ? "Materials"
                        : "Alloys";
                const resourceEmoji = this.getResourceEmoji(mainResource);

                const onCooldown = tile.cooldownUntilRoundByPlayer?.[player.id]
                    ? tile.cooldownUntilRoundByPlayer[player.id] > this.options.game.state.round
                    : false;

                actions.push({
                    key: "GATHER",
                    label: "Gather",
                    emoji: resourceEmoji,
                    hint: onCooldown ? "On cooldown" : `Collect ${mainResource}`,
                    enabled: this.options.game.state.actionPoints >= 1 && !onCooldown,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.doGather();
                        this.options.onRenderAll();
                    },
                });

                actions.push({
                    key: "HEAL",
                    label: "Heal",
                    emoji: "❤️",
                    hint: player.hp < player.maxHp ? "Restore 2 HP (1 AP)" : "Already at full HP",
                    enabled: this.options.game.state.actionPoints >= 1 && player.hp < player.maxHp,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.doHeal();
                        this.options.onRenderAll();
                    },
                });
            }

            if (tile.type === TileType.LandingHub) {
                actions.push({
                    key: "TRADE",
                    label: "Trade",
                    emoji: "🔄",
                    hint: "Exchange 3 of one → 1 of another",
                    enabled: this.options.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.doTrade();
                        this.options.onRenderAll();
                    },
                });
            }

            const canBuildBase = this.options.game.canBuildBase();
            const isInBase = this.options.game.isInOwnBase();

            if (canBuildBase) {
                actions.push({
                    key: "BUILD_BASE",
                    label: "Build Base",
                    emoji: "🏠",
                    hint: "Establish your base here (2 Materials)",
                    enabled: player.materials >= 2 && this.options.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.doBuildBase();
                        this.options.onRenderAll();
                    },
                });
            }

            if (isInBase) {
                actions.push({
                    key: "BUILD_MODULES",
                    label: "Modules",
                    emoji: "🏗",
                    hint: "Build modules in your base",
                    enabled: this.options.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.state.uiMode = "BUILD_MENU";
                        this.options.onRenderAll();
                    },
                });

                actions.push({
                    key: "CRAFT",
                    label: "Craft",
                    emoji: "🔧",
                    hint: "Craft items using Components",
                    enabled: this.options.game.state.actionPoints >= 1 && this.options.game.canCraft(),
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.toggleCraftMenu();
                        this.options.onRenderAll();
                    },
                });

                if (this.options.game.canHireUnit()) {
                    actions.push({
                        key: "HIRE_UNIT",
                        label: "Hire Unit",
                        emoji: "🤖",
                        hint: "Hire combat units",
                        enabled: this.options.game.state.actionPoints >= 1,
                        action: () => {
                            this.hideContextMenu();
                            this.options.onShowHireUnitMenu();
                        },
                    });
                }
            }

            if (this.options.game.canRecallToBase()) {
                actions.push({
                    key: "RECALL",
                    label: "Recall",
                    emoji: "📡",
                    hint: "Teleport to your Base (free)",
                    enabled: true,
                    action: () => {
                        this.hideContextMenu();
                        this.options.game.doRecallToBase();
                        this.options.onRenderAll();
                    },
                });
            }

            if (this.options.game.canUseOrbitalHangar()) {
                actions.push({
                    key: "ORBITAL_TELEPORT",
                    label: "Teleport",
                    emoji: "🚀",
                    hint: "Use Orbital Hangar (1 AP)",
                    enabled: this.options.game.state.actionPoints >= 1,
                    action: () => {
                        this.hideContextMenu();
                        this.options.onShowOrbitalHangarMenu();
                    },
                });
            }
        }

        return actions;
    }

    private getResourceEmoji(kind: string | undefined): string {
        switch (kind) {
            case "Biomass":
                return "🧬";
            case "Materials":
                return "🧱";
            case "Alloys":
                return "⚙";
            default:
                return "📦";
        }
    }

    private renderContextMenu(coord: HexCoord, actions: ActionItem[]): void {
        this.options.layer.removeChildren();

        const { x, y } = this.options.hexToPixel(coord);
        const { panX, panY, zoom } = this.options.getViewport();
        const screenX = (x + panX) * zoom + this.options.app.screen.width / 2;
        const screenY = (y + panY) * zoom + this.options.app.screen.height / 2;

        const btnW = 120;
        const btnH = 36;
        const gap = 6;
        const menuWidth = btnW + 20;
        const menuHeight = actions.length * (btnH + gap) + 20;

        const menuX = screenX - menuWidth / 2;
        const menuY = screenY + this.options.getHexSize() * zoom + 10;

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, menuWidth, menuHeight, 10);
        bg.fill({ color: 0x1a1a2e, alpha: 0.95 });
        bg.stroke({ color: 0x4a90d9, width: 2 });
        bg.position.set(menuX, menuY);
        this.options.layer.addChild(bg);

        if (this.options.tutorialHints.canShowHint("context_menu")) {
            this.options.showHint(
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

        const arrow = new PIXI.Graphics();
        arrow.moveTo(screenX - 8, menuY);
        arrow.lineTo(screenX, menuY - 10);
        arrow.lineTo(screenX + 8, menuY);
        arrow.closePath();
        arrow.fill({ color: 0x1a1a2e });
        arrow.stroke({ color: 0x4a90d9, width: 2 });
        this.options.layer.addChild(arrow);

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

            this.options.layer.addChild(btnContainer);
        });

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

        this.options.layer.addChild(closeBtn);
        this.options.layer.addChild(closeX);
    }

    private showActionHint(text: string, x: number, y: number): void {
        if (!this.options.tutorialHints.isEnabled()) return;
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
        this.options.layer.addChild(this.hintContainer);
    }

    private hideActionHint(): void {
        if (this.hintContainer) {
            this.options.layer.removeChild(this.hintContainer);
            this.hintContainer = null;
        }
    }
}
