import * as PIXI from "pixi.js";
import type { TutorialHintsManager } from "../ui/TutorialHintsManager";

export type SettingsRendererOptions = {
    app: PIXI.Application;
    layer: PIXI.Container;
    tutorialHints: TutorialHintsManager;
    onRenderAll: () => void;
    onToggleHints: (enabled: boolean) => void;
};

export class SettingsRenderer {
    private settingsVisible = false;

    constructor(private options: SettingsRendererOptions) {}

    public toggleSettings(): void {
        this.settingsVisible = !this.settingsVisible;
        this.options.onRenderAll();
    }

    public renderSettingsMenu(): void {
        this.options.layer.removeChildren();
        if (!this.settingsVisible) return;

        const screenW = this.options.app.renderer.width;
        const screenH = this.options.app.renderer.height;

        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", () => {
            this.settingsVisible = false;
            this.options.onRenderAll();
        });
        this.options.layer.addChild(backdrop);

        const panelW = 420;
        const panelH = 260;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;

        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: 0x4a90d9, width: 3 });
        panel.eventMode = "static";
        this.options.layer.addChild(panel);

        const title = new PIXI.Text({
            text: "⚙️ Settings",
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: 0xffffff,
                fontWeight: "800",
            }),
        });
        title.position.set(panelX + 20, panelY + 18);
        this.options.layer.addChild(title);

        const hintLabel = new PIXI.Text({
            text: "Tutorial & helper hints",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0 }),
        });
        hintLabel.position.set(panelX + 20, panelY + 80);
        this.options.layer.addChild(hintLabel);

        const hintDescription = new PIXI.Text({
            text: "Highlights menus and explains costs for actions.",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x6b7280 }),
        });
        hintDescription.position.set(panelX + 20, panelY + 104);
        this.options.layer.addChild(hintDescription);

        const toggle = new PIXI.Container();
        const toggleBg = new PIXI.Graphics();
        toggleBg.roundRect(0, 0, 80, 32, 16);
        const hintsEnabled = this.options.tutorialHints.isEnabled();
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

        this.options.layer.addChild(toggle);

        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            this.settingsVisible = false;
            this.options.onRenderAll();
        });
        this.options.layer.addChild(closeBtn);

        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        this.options.layer.addChild(closeX);
    }

    private setHintsEnabled(enabled: boolean): void {
        this.options.onToggleHints(enabled);
        this.options.onRenderAll();
    }
}
