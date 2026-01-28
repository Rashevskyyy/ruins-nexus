import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import { Logger } from "../../core/Logger";
import { validateGameState } from "../../core/StateValidator";

export type DebugPanelRendererOptions = {
    app: PIXI.Application;
    game: Game;
    hudLayer: PIXI.Container;
    debugPanelLayer: PIXI.Container;
    onRenderAll: () => void;
    getOnDebugReset: () => (() => void) | null;
    getOnDebugAddResources: () => (() => void) | null;
    getOnDebugSkipTurn: () => (() => void) | null;
    getOnDebugHeal: () => (() => void) | null;
    getOnDebugLeaveGame: () => (() => void) | null;
    getMyPlayerIndex: () => number;
};

type DebugTab = "actions" | "logs" | "state";

export class DebugPanelRenderer {
    private debugPanelVisible = false;
    private currentTab: DebugTab = "actions";
    private logScrollOffset = 0;
    private maxLogLines = 15;

    private debugToggleButtonContainer = new PIXI.Container();
    private debugToggleButtonBg = new PIXI.Graphics();
    private debugToggleButtonIcon = new PIXI.Text({
        text: "🐛",
        style: new PIXI.TextStyle({ fontSize: 16 }),
    });

    constructor(private options: DebugPanelRendererOptions) {
        // Enable logger for UI
        Logger.configure({ enabled: true, minLevel: "debug", consoleOutput: false });
    }

    public createToggleButton(): void {
        this.debugToggleButtonContainer.eventMode = "static";
        this.debugToggleButtonContainer.cursor = "pointer";
        this.debugToggleButtonContainer.hitArea = new PIXI.Rectangle(0, 0, 40, 30);

        this.debugToggleButtonContainer.addChild(this.debugToggleButtonBg);
        this.debugToggleButtonContainer.addChild(this.debugToggleButtonIcon);
        this.debugToggleButtonIcon.anchor.set(0.5);
        this.debugToggleButtonIcon.position.set(20, 15);

        this.debugToggleButtonContainer.on("pointerdown", () => {
            this.debugPanelVisible = !this.debugPanelVisible;
            this.renderDebugPanel();
        });

        this.options.hudLayer.addChild(this.debugToggleButtonContainer);
    }

    public renderDebugPanel(): void {
        const h = this.options.app.renderer.height;

        this.debugToggleButtonContainer.position.set(10, h - 45);

        this.debugToggleButtonBg.clear();
        this.debugToggleButtonBg.roundRect(0, 0, 40, 30, 6);
        this.debugToggleButtonBg.fill({ color: this.debugPanelVisible ? 0xff6600 : 0x333333, alpha: 0.9 });
        this.debugToggleButtonBg.stroke({ color: 0xffffff, alpha: 0.3, width: 1 });

        this.options.debugPanelLayer.removeChildren();

        if (!this.debugPanelVisible) return;

        const panelW = 320;
        const panelH = 400;
        const panelX = 10;
        const panelY = h - panelH - 55;

        const panelBg = new PIXI.Graphics();
        panelBg.roundRect(panelX, panelY, panelW, panelH, 10);
        panelBg.fill({ color: 0x1a1a2e, alpha: 0.95 });
        panelBg.stroke({ color: 0xff6600, width: 2, alpha: 0.8 });
        this.options.debugPanelLayer.addChild(panelBg);

        const title = new PIXI.Text({
            text: "🐛 DEBUG PANEL",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0xff6600,
                fontWeight: "700",
            }),
        });
        title.position.set(panelX + 15, panelY + 10);
        this.options.debugPanelLayer.addChild(title);

        // Tabs
        this.renderTabs(panelX, panelY, panelW);

        // Tab content
        switch (this.currentTab) {
            case "actions":
                this.renderActionsTab(panelX, panelY, panelW, panelH);
                break;
            case "logs":
                this.renderLogsTab(panelX, panelY, panelW, panelH);
                break;
            case "state":
                this.renderStateTab(panelX, panelY, panelW, panelH);
                break;
        }
    }

    private renderTabs(panelX: number, panelY: number, panelW: number): void {
        const tabs: { id: DebugTab; label: string }[] = [
            { id: "actions", label: "⚡ Actions" },
            { id: "logs", label: "📜 Logs" },
            { id: "state", label: "🔍 State" },
        ];

        const tabW = (panelW - 20) / tabs.length;
        const tabH = 28;
        const tabY = panelY + 35;

        tabs.forEach((tab, index) => {
            const tabX = panelX + 10 + index * tabW;
            const isActive = this.currentTab === tab.id;

            const tabContainer = new PIXI.Container();
            tabContainer.position.set(tabX, tabY);
            tabContainer.eventMode = "static";
            tabContainer.cursor = "pointer";
            tabContainer.hitArea = new PIXI.Rectangle(0, 0, tabW, tabH);

            const tabBg = new PIXI.Graphics();
            tabBg.roundRect(0, 0, tabW - 2, tabH, 4);
            tabBg.fill({ color: isActive ? 0xff6600 : 0x2d3748 });

            const label = new PIXI.Text({
                text: tab.label,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: isActive ? 0xffffff : 0x888888,
                }),
            });
            label.anchor.set(0.5);
            label.position.set((tabW - 2) / 2, tabH / 2);
            label.eventMode = "none";

            tabContainer.addChild(tabBg);
            tabContainer.addChild(label);

            tabContainer.on("pointerdown", () => {
                this.currentTab = tab.id;
                this.renderDebugPanel();
            });

            this.options.debugPanelLayer.addChild(tabContainer);
        });
    }

    private renderActionsTab(panelX: number, panelY: number, panelW: number, panelH: number): void {
        const buttons = [
            { label: "💰 +10 Resources", callback: () => this.options.getOnDebugAddResources()?.() },
            { label: "❤️ Full Heal", callback: () => this.options.getOnDebugHeal()?.() },
            { label: "⏭️ Skip Turn", callback: () => this.options.getOnDebugSkipTurn()?.() },
            { label: "🔄 Reset Game", callback: () => this.options.getOnDebugReset()?.() },
            { label: "🚪 Leave Game", callback: () => this.options.getOnDebugLeaveGame()?.() },
        ];

        const btnW = panelW - 20;
        const btnH = 32;
        const startY = panelY + 75;

        buttons.forEach((btn, index) => {
            const btnY = startY + index * 38;
            const btnX = panelX + 10;

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
                    fontSize: 12,
                    fill: 0xffffff,
                }),
            });
            label.position.set(10, 8);
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
                Logger.ui.debug(`Debug button: ${btn.label}`);
                btn.callback();
                this.options.onRenderAll();
            });

            this.options.debugPanelLayer.addChild(btnContainer);
        });

        // Player info at bottom
        const myPlayer = this.options.game.state.players[this.options.getMyPlayerIndex()];
        if (myPlayer) {
            const info = new PIXI.Text({
                text: `Player: ${myPlayer.id} | HP: ${myPlayer.hp}/${myPlayer.maxHp}\n🧬${myPlayer.biomass} 🧱${myPlayer.materials} ⚙${myPlayer.alloys} 🧩${myPlayer.components}`,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: 0x888888,
                }),
            });
            info.position.set(panelX + 15, panelY + panelH - 50);
            this.options.debugPanelLayer.addChild(info);
        }
    }

    private renderLogsTab(panelX: number, panelY: number, panelW: number, panelH: number): void {
        const logs = Logger.getLogs();
        const startY = panelY + 75;
        const logAreaH = panelH - 130;

        // Log area background
        const logBg = new PIXI.Graphics();
        logBg.roundRect(panelX + 10, startY, panelW - 20, logAreaH, 4);
        logBg.fill({ color: 0x0d1117, alpha: 0.9 });
        this.options.debugPanelLayer.addChild(logBg);

        // Get visible logs
        const visibleLogs = logs.slice(-this.maxLogLines - this.logScrollOffset, logs.length - this.logScrollOffset || undefined);

        visibleLogs.forEach((log, index) => {
            const levelColor = {
                debug: 0x666666,
                info: 0x58a6ff,
                warn: 0xd29922,
                error: 0xf85149,
            }[log.level];

            const time = new Date(log.timestamp).toLocaleTimeString("en-US", { 
                hour12: false, 
                hour: "2-digit", 
                minute: "2-digit", 
                second: "2-digit" 
            });

            const logText = new PIXI.Text({
                text: `${time} [${log.namespace}] ${log.message}`.slice(0, 45),
                style: new PIXI.TextStyle({
                    fontSize: 9,
                    fill: levelColor,
                    fontFamily: "monospace",
                }),
            });
            logText.position.set(panelX + 15, startY + 5 + index * 14);
            this.options.debugPanelLayer.addChild(logText);
        });

        // Scroll buttons
        this.renderButton(panelX + 10, panelY + panelH - 50, 60, 25, "▲ Up", () => {
            if (this.logScrollOffset < logs.length - this.maxLogLines) {
                this.logScrollOffset += 5;
                this.renderDebugPanel();
            }
        });

        this.renderButton(panelX + 80, panelY + panelH - 50, 60, 25, "▼ Down", () => {
            if (this.logScrollOffset > 0) {
                this.logScrollOffset -= 5;
                this.renderDebugPanel();
            }
        });

        this.renderButton(panelX + 150, panelY + panelH - 50, 70, 25, "📥 Export", () => {
            Logger.downloadLogs();
        });

        this.renderButton(panelX + 230, panelY + panelH - 50, 70, 25, "🗑️ Clear", () => {
            Logger.clear();
            this.logScrollOffset = 0;
            this.renderDebugPanel();
        });

        // Log count
        const countText = new PIXI.Text({
            text: `${logs.length} logs`,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x666666 }),
        });
        countText.position.set(panelX + panelW - 60, startY - 15);
        this.options.debugPanelLayer.addChild(countText);
    }

    private renderStateTab(panelX: number, panelY: number, panelW: number, panelH: number): void {
        const state = this.options.game.state;
        const validation = validateGameState(state);
        const startY = panelY + 75;

        // State info
        const stateLines = [
            `Phase: ${state.phase}`,
            `Round: ${state.round}`,
            `Current Player: ${state.players[state.currentPlayerIndex]?.id || "N/A"}`,
            `Tiles: ${state.board.getAllTiles().length}`,
            `Deck Remaining: ${state.tileDeck?.getRemainingCount() ?? "N/A"}`,
            `Final Prep: ${state.isFinalPreparation ? "Yes" : "No"}`,
            `Orbital CD: ${state.orbitalCountdown ?? "N/A"}`,
            "",
            `--- PLAYERS ---`,
        ];

        for (const player of state.players) {
            stateLines.push(`${player.id}: HP=${player.hp}/${player.maxHp} AP=${player.actionPoints} P=${player.prestige}`);
        }

        stateLines.push("");
        stateLines.push(`--- VALIDATION ---`);
        stateLines.push(validation.valid ? "✅ State OK" : `❌ ${validation.errors.length} errors`);

        if (!validation.valid) {
            for (const err of validation.errors.slice(0, 3)) {
                stateLines.push(`  • ${err.slice(0, 40)}`);
            }
        }

        if (validation.warnings.length > 0) {
            stateLines.push(`⚠️ ${validation.warnings.length} warnings`);
        }

        stateLines.forEach((line, index) => {
            const isHeader = line.startsWith("---");
            const isError = line.startsWith("❌") || line.startsWith("  •");
            const isOk = line.startsWith("✅");

            const text = new PIXI.Text({
                text: line,
                style: new PIXI.TextStyle({
                    fontSize: 10,
                    fill: isHeader ? 0xff6600 : isError ? 0xf85149 : isOk ? 0x3fb950 : 0xcccccc,
                    fontFamily: "monospace",
                    fontWeight: isHeader ? "700" : "400",
                }),
            });
            text.position.set(panelX + 15, startY + index * 14);
            this.options.debugPanelLayer.addChild(text);
        });

        // Validate button
        this.renderButton(panelX + 10, panelY + panelH - 50, 100, 25, "🔍 Validate Now", () => {
            const result = validateGameState(this.options.game.state);
            if (result.valid) {
                Logger.state.info("State validation passed");
            } else {
                Logger.state.error("State validation failed", { errors: result.errors });
            }
            this.renderDebugPanel();
        });

        // Export state button
        this.renderButton(panelX + 120, panelY + panelH - 50, 100, 25, "📤 Export State", () => {
            const stateJson = JSON.stringify(this.options.game.state, (key, value) => {
                // Skip circular references and functions
                if (typeof value === "function") return undefined;
                if (key === "tileDeck") return { remaining: value?.getRemainingCount?.() ?? 0 };
                return value;
            }, 2);
            
            const blob = new Blob([stateJson], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `gamestate-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            Logger.state.info("Game state exported");
        });
    }

    private renderButton(x: number, y: number, w: number, h: number, label: string, onClick: () => void): void {
        const btnContainer = new PIXI.Container();
        btnContainer.position.set(x, y);
        btnContainer.eventMode = "static";
        btnContainer.cursor = "pointer";
        btnContainer.hitArea = new PIXI.Rectangle(0, 0, w, h);

        const btnBg = new PIXI.Graphics();
        btnBg.roundRect(0, 0, w, h, 4);
        btnBg.fill({ color: 0x2d3748 });
        btnBg.stroke({ color: 0x4a5568, width: 1 });

        const text = new PIXI.Text({
            text: label,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffffff }),
        });
        text.anchor.set(0.5);
        text.position.set(w / 2, h / 2);
        text.eventMode = "none";

        btnContainer.addChild(btnBg);
        btnContainer.addChild(text);

        btnContainer.on("pointerover", () => {
            btnBg.clear();
            btnBg.roundRect(0, 0, w, h, 4);
            btnBg.fill({ color: 0x4a5568 });
            btnBg.stroke({ color: 0xff6600, width: 1 });
        });

        btnContainer.on("pointerout", () => {
            btnBg.clear();
            btnBg.roundRect(0, 0, w, h, 4);
            btnBg.fill({ color: 0x2d3748 });
            btnBg.stroke({ color: 0x4a5568, width: 1 });
        });

        btnContainer.on("pointerdown", onClick);

        this.options.debugPanelLayer.addChild(btnContainer);
    }
}
