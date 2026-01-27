import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

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

export class DebugPanelRenderer {
    private debugPanelVisible = false;

    private debugToggleButtonContainer = new PIXI.Container();
    private debugToggleButtonBg = new PIXI.Graphics();
    private debugToggleButtonIcon = new PIXI.Text({
        text: "🐛",
        style: new PIXI.TextStyle({ fontSize: 16 }),
    });

    constructor(private options: DebugPanelRendererOptions) {}

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

        const panelW = 200;
        const panelH = 280;
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

        const buttons = [
            { label: "💰 +10 Resources", callback: () => this.options.getOnDebugAddResources()?.() },
            { label: "❤️ Full Heal", callback: () => this.options.getOnDebugHeal()?.() },
            { label: "⏭️ Skip Turn", callback: () => this.options.getOnDebugSkipTurn()?.() },
            { label: "🔄 Reset Game", callback: () => this.options.getOnDebugReset()?.() },
            { label: "🚪 Leave Game", callback: () => this.options.getOnDebugLeaveGame()?.() },
        ];

        const btnW = panelW - 20;
        const btnH = 35;

        buttons.forEach((btn, index) => {
            const btnY = panelY + 40 + index * 42;
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
                this.options.onRenderAll();
            });

            this.options.debugPanelLayer.addChild(btnContainer);
        });

        const myPlayer = this.options.game.state.players[this.options.getMyPlayerIndex()];
        if (myPlayer) {
            const info = new PIXI.Text({
                text: `Player: ${myPlayer.id}\n🧬${myPlayer.biomass} 🧱${myPlayer.materials} ⚙${myPlayer.alloys}`,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: 0x888888,
                }),
            });
            info.position.set(panelX + 15, panelY + panelH - 45);
            this.options.debugPanelLayer.addChild(info);
        }
    }
}
