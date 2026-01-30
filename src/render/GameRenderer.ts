import * as PIXI from "pixi.js";
import type { Game } from "../core/Game";
import { GAME_VERSION } from "../assets/AssetLoader";
import { BuildMenuPanel } from "./panels/BuildMenuPanel";
import { CraftMenuPanel } from "./panels/CraftMenuPanel";
import { HeroBoardPanel } from "./panels/HeroBoardPanel";
import { HireUnitMenuPanel } from "./panels/HireUnitMenuPanel";
import { OrbitalHangarMenuPanel } from "./panels/OrbitalHangarMenuPanel";
import { PreCombatPanel } from "./panels/PreCombatPanel";
import { FinalPhaseBanner } from "./panels/FinalPhaseBanner";
import { EventLogPanel } from "./panels/EventLogPanel";
import { DeckInfoPanel } from "./panels/DeckInfoPanel";
import { PublicObjectivesPanel } from "./panels/PublicObjectivesPanel";
import { DiceRollUI } from "./ui/DiceRollUI";
import { TutorialHintsManager } from "./ui/TutorialHintsManager";
import { ToastManager } from "./ui/ToastManager";
import { BoardRenderer } from "./gameRenderer/BoardRenderer";
import { ContextMenuRenderer, type ShowHintOptions } from "./gameRenderer/ContextMenuRenderer";
import { HudRenderer } from "./gameRenderer/HudRenderer";
import { DebugPanelRenderer } from "./gameRenderer/DebugPanelRenderer";
import { SettingsRenderer } from "./gameRenderer/SettingsRenderer";
import { RewardRenderer } from "./gameRenderer/RewardRenderer";
import { HeroBoardLegacyRenderer } from "./gameRenderer/HeroBoardLegacyRenderer";

export class GameRenderer {
    private boardLayer = new PIXI.Container();
    private playersLayer = new PIXI.Container();
    private hudLayer = new PIXI.Container();
    private labelsLayer = new PIXI.Container();
    private heroBoardLayer = new PIXI.Container();
    private rotationIndicatorsLayer = new PIXI.Container();
    private buildMenuLayer = new PIXI.Container();
    private craftMenuLayer = new PIXI.Container();
    private preCombatLayer = new PIXI.Container();
    private finalPhaseBannerLayer = new PIXI.Container();
    private eventLogLayer = new PIXI.Container();
    private deckInfoLayer = new PIXI.Container();
    private publicObjectivesLayer = new PIXI.Container();
    private ghostPreviewLayer = new PIXI.Container();
    private debugPanelLayer = new PIXI.Container();
    private diceLayer = new PIXI.Container();
    private contextMenuLayer = new PIXI.Container();
    private toastLayer = new PIXI.Container();
    private tutorialLayer = new PIXI.Container();
    private settingsLayer = new PIXI.Container();
    private tokenRewardLayer = new PIXI.Container();

    private hudBg = new PIXI.Graphics();
    private hudText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
            fontSize: 16,
            fill: 0xffffff,
            fontWeight: "600",
        }),
    });

    private topStatusLayer = new PIXI.Container();
    private combatSummaryLayer = new PIXI.Container();
    private contextHintLayer = new PIXI.Container();

    private heroBoardPanel = new HeroBoardPanel();
    private buildMenuPanel = new BuildMenuPanel();
    private craftMenuPanel = new CraftMenuPanel();
    private preCombatPanel = new PreCombatPanel();
    private hireUnitMenuPanel = new HireUnitMenuPanel();
    private orbitalHangarMenuPanel = new OrbitalHangarMenuPanel();
    private finalPhaseBanner = new FinalPhaseBanner();
    private eventLogPanel = new EventLogPanel();
    private deckInfoPanel = new DeckInfoPanel();
    private publicObjectivesPanel = new PublicObjectivesPanel();

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

    private diceRollUI: DiceRollUI;
    private toastManager: ToastManager;
    private tutorialHints: TutorialHintsManager;

    private boardRenderer: BoardRenderer;
    private contextMenuRenderer: ContextMenuRenderer;
    private hudRenderer: HudRenderer;
    private debugPanelRenderer: DebugPanelRenderer;
    private settingsRenderer: SettingsRenderer;
    private rewardRenderer: RewardRenderer;
    private legacyHeroBoardRenderer: HeroBoardLegacyRenderer;

    private PLAYER_COLORS = [0x4aa3ff, 0xff5c5c, 0x5cff8f, 0xffd24a];

    public isMyTurnFn: (() => boolean) | null = null;
    public myPlayerId: string | null = null;

    public onDebugReset: (() => void) | null = null;
    public onDebugAddResources: (() => void) | null = null;
    public onDebugSkipTurn: (() => void) | null = null;
    public onDebugHeal: (() => void) | null = null;
    public onDebugLeaveGame: (() => void) | null = null;

    private get isMyTurn(): boolean {
        return this.isMyTurnFn ? this.isMyTurnFn() : true;
    }

    private get myPlayerIndex(): number {
        if (!this.myPlayerId) return this.game.state.currentPlayerIndex;
        const idx = this.game.state.players.findIndex(p => p.id === this.myPlayerId);
        return idx >= 0 ? idx : 0;
    }

    constructor(private app: PIXI.Application, private game: Game) {
        this.app.stage.addChild(this.boardLayer);
        this.boardLayer.sortableChildren = true;
        this.boardLayer.addChild(this.labelsLayer);
        this.labelsLayer.zIndex = 100;

        this.app.stage.addChild(this.ghostPreviewLayer);
        this.ghostPreviewLayer.eventMode = "none";

        this.app.stage.addChild(this.rotationIndicatorsLayer);
        this.rotationIndicatorsLayer.eventMode = "none";

        this.app.stage.addChild(this.playersLayer);

        this.app.stage.addChild(this.heroBoardLayer);
        this.heroBoardLayer.zIndex = 100;

        this.app.stage.addChild(this.buildMenuLayer);
        this.buildMenuLayer.zIndex = 200;

        this.app.stage.addChild(this.craftMenuLayer);
        this.craftMenuLayer.zIndex = 210;

        this.app.stage.addChild(this.preCombatLayer);
        this.preCombatLayer.zIndex = 320;

        this.app.stage.addChild(this.finalPhaseBannerLayer);
        this.finalPhaseBannerLayer.zIndex = 50;

        this.app.stage.addChild(this.hudLayer);
        this.hudLayer.addChild(this.hudBg);
        this.hudLayer.addChild(this.hudText);

        this.app.stage.addChild(this.topStatusLayer);
        this.topStatusLayer.zIndex = 180;

        this.app.stage.addChild(this.combatSummaryLayer);
        this.combatSummaryLayer.zIndex = 180;

        this.app.stage.addChild(this.contextHintLayer);
        this.contextHintLayer.zIndex = 185;

        this.app.stage.addChild(this.eventLogLayer);
        this.eventLogLayer.zIndex = 200;

        this.app.stage.addChild(this.deckInfoLayer);
        this.deckInfoLayer.zIndex = 200;

        this.app.stage.addChild(this.publicObjectivesLayer);
        this.publicObjectivesLayer.zIndex = 190;

        this.app.stage.addChild(this.debugPanelLayer);
        this.debugPanelLayer.zIndex = 300;

        this.app.stage.addChild(this.contextMenuLayer);
        this.contextMenuLayer.zIndex = 150;

        this.app.stage.addChild(this.diceLayer);
        this.diceLayer.zIndex = 400;

        this.app.stage.addChild(this.toastLayer);
        this.toastLayer.zIndex = 450;

        this.app.stage.addChild(this.tokenRewardLayer);
        this.tokenRewardLayer.zIndex = 480;

        this.app.stage.addChild(this.tutorialLayer);
        this.tutorialLayer.zIndex = 500;

        this.app.stage.addChild(this.settingsLayer);
        this.settingsLayer.zIndex = 470;

        this.diceRollUI = new DiceRollUI(this.app, this.diceLayer);
        this.toastManager = new ToastManager(this.app, this.toastLayer);
        this.tutorialHints = new TutorialHintsManager(this.app, this.tutorialLayer, this.showToast.bind(this));

        this.boardRenderer = new BoardRenderer({
            app: this.app,
            game: this.game,
            boardLayer: this.boardLayer,
            playersLayer: this.playersLayer,
            labelsLayer: this.labelsLayer,
            ghostPreviewLayer: this.ghostPreviewLayer,
            rotationIndicatorsLayer: this.rotationIndicatorsLayer,
            contextMenuLayer: this.contextMenuLayer,
            playerColors: this.PLAYER_COLORS,
            isMyTurn: () => this.isMyTurn,
            onShowContextMenu: (coord) => this.contextMenuRenderer.showContextMenu(coord),
            onRenderAll: () => this.renderAll(),
        });

        this.contextMenuRenderer = new ContextMenuRenderer({
            app: this.app,
            game: this.game,
            layer: this.contextMenuLayer,
            tutorialHints: this.tutorialHints,
            isMyTurn: () => this.isMyTurn,
            onRenderAll: () => this.renderAll(),
            showHint: this.showHint.bind(this),
            hexToPixel: (coord) => this.boardRenderer.hexToPixel(coord),
            getViewport: () => this.boardRenderer.getViewport(),
            getHexSize: () => this.boardRenderer.getHexSize(),
            onShowHireUnitMenu: () => this.showHireUnitMenu(),
            onShowOrbitalHangarMenu: () => this.showOrbitalHangarMenu(),
        });

        this.hudRenderer = new HudRenderer({
            app: this.app,
            game: this.game,
            hudLayer: this.hudLayer,
            hudBg: this.hudBg,
            hudText: this.hudText,
            rotateButton: this.rotateButton,
            placeTileButton: this.placeTileButton,
            topStatusLayer: this.topStatusLayer,
            combatSummaryLayer: this.combatSummaryLayer,
            contextHintLayer: this.contextHintLayer,
            playerColors: this.PLAYER_COLORS,
            isMyTurn: () => this.isMyTurn,
            getMyPlayerIndex: () => this.myPlayerIndex,
            tutorialHints: this.tutorialHints,
            onToggleSettings: () => this.settingsRenderer.toggleSettings(),
            onRenderAll: () => this.renderAll(),
        });

        this.debugPanelRenderer = new DebugPanelRenderer({
            app: this.app,
            game: this.game,
            hudLayer: this.hudLayer,
            debugPanelLayer: this.debugPanelLayer,
            onRenderAll: () => this.renderAll(),
            getOnDebugReset: () => this.onDebugReset,
            getOnDebugAddResources: () => this.onDebugAddResources,
            getOnDebugSkipTurn: () => this.onDebugSkipTurn,
            getOnDebugHeal: () => this.onDebugHeal,
            getOnDebugLeaveGame: () => this.onDebugLeaveGame,
            getMyPlayerIndex: () => this.myPlayerIndex,
        });

        this.settingsRenderer = new SettingsRenderer({
            app: this.app,
            layer: this.settingsLayer,
            tutorialHints: this.tutorialHints,
            onRenderAll: () => this.renderAll(),
            onToggleHints: (enabled) => this.setHintsEnabled(enabled),
        });

        this.rewardRenderer = new RewardRenderer({
            app: this.app,
            game: this.game,
            tokenRewardLayer: this.tokenRewardLayer,
            hudLayer: this.hudLayer,
            isMyTurn: () => this.isMyTurn,
            getMyPlayerIndex: () => this.myPlayerIndex,
            onRenderAll: () => this.renderAll(),
            showToast: (message, type, duration) => this.showToast(message, type, duration),
        });

        this.legacyHeroBoardRenderer = new HeroBoardLegacyRenderer({
            game: this.game,
            heroBoardLayer: this.heroBoardLayer,
        });

        this.hudRenderer.createRotateButton();
        this.hudRenderer.createPlaceTileButton();
        this.debugPanelRenderer.createToggleButton();
        this.createVersionLabel();
        this.boardRenderer.setupZoomAndPan();

        this.hudLayer.zIndex = 999;
        this.hudLayer.sortableChildren = true;
    }

    forceRebuildViews(): void {
        this.boardRenderer.forceRebuildViews();
    }

    renderAll(): void {
        this.contextMenuRenderer.beginFrame();

        this.boardRenderer.renderBoard();
        this.boardRenderer.renderLabels();
        this.boardRenderer.renderRotationIndicators();
        this.boardRenderer.renderPlayers();
        this.renderHeroBoard();
        this.renderEventLog();
        this.renderDeckInfo();
        this.renderPublicObjectives();
        this.hudRenderer.renderHUD();

        this.hudRenderer.renderTopStatusBar();
        this.hudRenderer.renderCombatSummary();
        this.hudRenderer.renderContextHints();

        this.renderBuildMenu();
        this.renderCraftMenu();
        this.renderPreCombat();
        this.renderFinalPhaseBanner();
        this.debugPanelRenderer.renderDebugPanel();
        this.rewardRenderer.checkPendingTokenRewards();
        this.settingsRenderer.renderSettingsMenu();

        this.checkTutorialHints();
    }

    private createVersionLabel(): void {
        const h = this.app.renderer.height;
        const versionText = new PIXI.Text({
            text: GAME_VERSION,
            style: new PIXI.TextStyle({
                fontSize: 11,
                fill: 0x484f58,
                fontFamily: "monospace",
            }),
        });
        versionText.position.set(60, h - 38);
        this.hudLayer.addChild(versionText);
    }

    private renderHeroBoard(): void {
        this.heroBoardPanel.render({
            app: this.app,
            game: this.game,
            layer: this.heroBoardLayer,
            playerColors: this.PLAYER_COLORS,
            playerIndex: this.myPlayerIndex,
        });
    }

    public renderEquipmentSummaryCompact(p: import("../entities/Player").Player, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderEquipmentSummaryCompact(p, x, y, width);
    }

    public renderEquipmentSummary(p: import("../entities/Player").Player, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderEquipmentSummary(p, x, y, width);
    }

    public renderSectionHeader(text: string, x: number, y: number, color: number): void {
        this.legacyHeroBoardRenderer.renderSectionHeader(text, x, y, color);
    }

    public renderLifeTokensCompact(p: { hp: number; maxHp: number }, x: number, y: number): void {
        this.legacyHeroBoardRenderer.renderLifeTokensCompact(p, x, y);
    }

    public renderPrestigeBarModern(p: { prestige: number }, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderPrestigeBarModern(p, x, y, width);
    }

    public renderPrestigeBar(p: { prestige: number }, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderPrestigeBar(p, x, y, width);
    }

    public renderModuleTokensCompact(p: { modules: string[] }, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderModuleTokensCompact(p, x, y, width);
    }

    public renderUnitsCompact(p: import("../entities/Player").Player, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderUnitsCompact(p, x, y, width);
    }

    public renderEquipmentCompact(p: import("../entities/Player").Player, x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderEquipmentCompact(p, x, y, width);
    }

    public renderDivider(x: number, y: number, width: number): void {
        this.legacyHeroBoardRenderer.renderDivider(x, y, width);
    }

    private renderBuildMenu(): void {
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

    private renderCraftMenu(): void {
        this.craftMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.craftMenuLayer,
            canShowHint: (id) => this.tutorialHints.canShowHint(id),
            showHint: this.showHint.bind(this),
            renderAll: this.renderAll.bind(this),
        });
    }

    private renderPreCombat(): void {
        this.preCombatPanel.render({
            app: this.app,
            game: this.game,
            layer: this.preCombatLayer,
            playerColors: this.PLAYER_COLORS,
            renderAll: this.renderAll.bind(this),
        });
    }

    private showHireUnitMenu(): void {
        this.hireUnitMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.craftMenuLayer,
            playerColors: this.PLAYER_COLORS,
            renderAll: this.renderAll.bind(this),
        });
    }

    private showOrbitalHangarMenu(): void {
        this.orbitalHangarMenuPanel.render({
            app: this.app,
            game: this.game,
            layer: this.craftMenuLayer,
            playerColors: this.PLAYER_COLORS,
            renderAll: this.renderAll.bind(this),
        });
    }

    private renderFinalPhaseBanner(): void {
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

    private renderEventLog(): void {
        this.eventLogPanel.render({
            app: this.app,
            game: this.game,
            layer: this.eventLogLayer,
        });
    }

    private renderDeckInfo(): void {
        this.deckInfoPanel.render({
            app: this.app,
            game: this.game,
            layer: this.deckInfoLayer,
        });
    }

    private renderPublicObjectives(): void {
        this.publicObjectivesPanel.render({
            app: this.app,
            game: this.game,
            layer: this.publicObjectivesLayer,
        });
    }

    public addCombatLine(label: string, value: string, color: number, panelX: number, y: number): void {
        this.hudRenderer.addCombatLine(label, value, color, panelX, y);
    }

    public showDiceRoll(result: { swords: number; skulls: number }, onComplete?: () => void): void {
        this.diceRollUI.showDiceRoll(result, onComplete);
    }

    public showToast(message: string, type: "info" | "success" | "warning" | "error" = "info", duration = 3000): void {
        this.toastManager.showToast(message, type, duration);
    }

    private setHintsEnabled(enabled: boolean): void {
        this.tutorialHints.setEnabled(enabled);
        if (!enabled) {
            this.contextMenuRenderer.clearActionHint();
        }
    }

    public showHint(id: string, title: string, message: string, options?: ShowHintOptions): void {
        this.tutorialHints.showHint(id, title, message, options);
    }

    public hideHint(): void {
        this.tutorialHints.hideHint();
    }

    public checkTutorialHints(): void {
        this.tutorialHints.checkTutorialHints(this.game, this.myPlayerIndex);
    }
}
