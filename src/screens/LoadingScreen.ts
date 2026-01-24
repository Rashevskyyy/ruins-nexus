/**
 * Loading Screen - Shows during asset loading
 */

import * as PIXI from "pixi.js";
import { GAME_VERSION } from "../assets/AssetLoader";

export class LoadingScreen {
    private container: PIXI.Container;
    private progressBar: PIXI.Graphics;
    private progressText: PIXI.Text;
    private versionText: PIXI.Text;
    private titleText: PIXI.Text;
    private visible = false;
    
    constructor(private app: PIXI.Application) {
        this.container = new PIXI.Container();
        this.container.zIndex = 1000;
        
        // Title
        this.titleText = new PIXI.Text({
            text: "🚀 COSMIC FRONTIER",
            style: new PIXI.TextStyle({
                fontSize: 48,
                fontWeight: "700",
                fill: 0x00d4ff,
                dropShadow: {
                    blur: 4,
                    color: 0x00d4ff,
                    distance: 0,
                    alpha: 0.5,
                },
            }),
        });
        this.titleText.anchor.set(0.5);
        
        // Progress bar background
        this.progressBar = new PIXI.Graphics();
        
        // Progress text
        this.progressText = new PIXI.Text({
            text: "Loading... 0%",
            style: new PIXI.TextStyle({
                fontSize: 18,
                fill: 0xaaaaaa,
            }),
        });
        this.progressText.anchor.set(0.5);
        
        // Version text (bottom left)
        this.versionText = new PIXI.Text({
            text: GAME_VERSION,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0x666666,
            }),
        });
        
        this.container.addChild(this.titleText);
        this.container.addChild(this.progressBar);
        this.container.addChild(this.progressText);
        this.container.addChild(this.versionText);
    }
    
    show(): void {
        if (this.visible) return;
        this.visible = true;
        this.app.stage.addChild(this.container);
        this.updateLayout();
    }
    
    hide(): void {
        if (!this.visible) return;
        this.visible = false;
        this.app.stage.removeChild(this.container);
    }
    
    updateProgress(progress: number): void {
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        
        const barWidth = 300;
        const barHeight = 8;
        const barX = (w - barWidth) / 2;
        const barY = h / 2 + 20;
        
        this.progressBar.clear();
        
        // Background
        this.progressBar.roundRect(barX, barY, barWidth, barHeight, 4);
        this.progressBar.fill({ color: 0x333333 });
        
        // Progress fill
        const fillWidth = (barWidth - 4) * (progress / 100);
        if (fillWidth > 0) {
            this.progressBar.roundRect(barX + 2, barY + 2, fillWidth, barHeight - 4, 2);
            this.progressBar.fill({ color: 0x00d4ff });
        }
        
        this.progressText.text = progress >= 100 ? "Ready!" : `Loading... ${progress}%`;
    }
    
    private updateLayout(): void {
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        
        this.titleText.position.set(w / 2, h / 2 - 40);
        this.progressText.position.set(w / 2, h / 2 + 50);
        this.versionText.position.set(15, h - 25);
        
        this.updateProgress(0);
    }
}
