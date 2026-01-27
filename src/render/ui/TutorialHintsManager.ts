import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type ShowHintOptions = {
    x?: number;
    y?: number;
    anchor?: "center" | "top" | "bottom";
    showOnce?: boolean;
    highlightRect?: { x: number; y: number; width: number; height: number };
};

export class TutorialHintsManager {
    private static HINTS_STORAGE_KEY = "cosmic_frontier_hints";
    private static HINTS_ENABLED_STORAGE_KEY = "cosmic_frontier_hints_enabled";
    private shownHints: Set<string>;
    private currentHint: PIXI.Container | null = null;
    private currentHighlight: PIXI.Graphics | null = null;
    private highlightPulseInterval: number | null = null;
    private hintsEnabled: boolean;

    constructor(
        private app: PIXI.Application,
        private layer: PIXI.Container,
        private showToast: (message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void
    ) {
        this.shownHints = this.loadShownHints();
        this.hintsEnabled = this.loadHintsEnabled();
    }

    public isEnabled(): boolean {
        return this.hintsEnabled;
    }

    public setEnabled(enabled: boolean): void {
        this.hintsEnabled = enabled;
        this.saveHintsEnabled();
        if (!enabled) {
            this.hideHint();
        }
    }

    public getShownHints(): Set<string> {
        return this.shownHints;
    }

    public canShowHint(id: string): boolean {
        return this.hintsEnabled && !this.shownHints.has(id);
    }

    public showHint(id: string, title: string, message: string, options?: ShowHintOptions): void {
        if (!this.hintsEnabled) return;
        // Skip if already shown (for showOnce hints)
        if (options?.showOnce !== false && this.shownHints.has(id)) return;
        this.shownHints.add(id);
        this.saveShownHints(); // Persist to localStorage

        // Remove current hint if any
        if (this.currentHint) {
            this.layer.removeChild(this.currentHint);
        }
        if (this.currentHighlight) {
            this.layer.removeChild(this.currentHighlight);
            this.currentHighlight = null;
        }
        if (this.highlightPulseInterval !== null) {
            clearInterval(this.highlightPulseInterval);
            this.highlightPulseInterval = null;
        }

        if (options?.highlightRect) {
            const highlight = new PIXI.Graphics();
            highlight.roundRect(
                options.highlightRect.x - 6,
                options.highlightRect.y - 6,
                options.highlightRect.width + 12,
                options.highlightRect.height + 12,
                12
            );
            highlight.fill({ color: 0x00d4ff, alpha: 0.08 });
            highlight.stroke({ color: 0xffd700, width: 3, alpha: 0.9 });
            this.layer.addChild(highlight);
            this.currentHighlight = highlight;

            let pulse = 0;
            this.highlightPulseInterval = window.setInterval(() => {
                pulse += 0.08;
                const alpha = 0.5 + Math.sin(pulse) * 0.25;
                highlight.alpha = Math.max(0.2, Math.min(0.9, alpha));
            }, 30);
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
        this.layer.addChild(container);
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
                this.layer.removeChild(hint);
                if (this.currentHint === hint) {
                    this.currentHint = null;
                }
                if (this.currentHighlight) {
                    this.layer.removeChild(this.currentHighlight);
                    this.currentHighlight = null;
                }
                if (this.highlightPulseInterval !== null) {
                    clearInterval(this.highlightPulseInterval);
                    this.highlightPulseInterval = null;
                }
            }
        }, 20);
    }

    // Check and show tutorial hints based on game state
    public checkTutorialHints(game: Game, playerIndex: number): void {
        if (!this.hintsEnabled) return;
        const state = game.state;
        const player = state.players[playerIndex];

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
            this.showHintToast("⚠️ Low HP! Return to Landing Hub to heal.", "warning", 5000);
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
            this.showHintToast("💡 You have enough Materials to build a Base!", "info", 4000);
            this.shownHints.add("can_build_base");
            this.saveShownHints();
        }
    }

    private showHintToast(
        message: string,
        type: "info" | "success" | "warning" | "error" = "info",
        duration = 3000
    ): void {
        if (!this.hintsEnabled) return;
        this.showToast(message, type, duration);
    }

    private loadShownHints(): Set<string> {
        try {
            const stored = localStorage.getItem(TutorialHintsManager.HINTS_STORAGE_KEY);
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
            localStorage.setItem(TutorialHintsManager.HINTS_STORAGE_KEY, JSON.stringify([...this.shownHints]));
        } catch (e) {
            console.warn("Failed to save hints to localStorage:", e);
        }
    }

    private loadHintsEnabled(): boolean {
        try {
            const stored = localStorage.getItem(TutorialHintsManager.HINTS_ENABLED_STORAGE_KEY);
            if (stored === null) return true;
            return stored === "true";
        } catch (e) {
            console.warn("Failed to load hints toggle from localStorage:", e);
            return true;
        }
    }

    private saveHintsEnabled(): void {
        try {
            localStorage.setItem(TutorialHintsManager.HINTS_ENABLED_STORAGE_KEY, String(this.hintsEnabled));
        } catch (e) {
            console.warn("Failed to save hints toggle to localStorage:", e);
        }
    }
}
