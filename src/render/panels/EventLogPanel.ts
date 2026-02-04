import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import { GAME_MODIFIERS } from "../../core/GameModifiers";

type EventLogContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
};

export class EventLogPanel {
    render({ app: _app, game, layer }: EventLogContext): void {
        layer.removeChildren();

        const logW = 360;
        const logH = 200;
        const logX = 16;
        // Position below Public Objectives (approx y=72 + ~220 for 3 objectives)
        const logY = 300;

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(logX, logY, logW, logH, 10);
        bg.fill({ color: 0x0d1117, alpha: 0.94 });
        bg.stroke({ color: 0x30363d, width: 2 });
        layer.addChild(bg);

        // Header
        const title = new PIXI.Text({
            text: "📜 Event Log",
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffd700, fontWeight: "700" }),
        });
        title.position.set(logX + 12, logY + 8);
        layer.addChild(title);

        // Find and highlight modifier event
        const modifierEvent = game.state.eventLog.find((event) => event.includes("Modifier:"));

        let modifierTooltip: PIXI.Container | null = null;
        if (modifierEvent) {
            // Prominent modifier display at top
            const modName = modifierEvent.replace("🎛️ Modifier: ", "").replace("Modifier: ", "");
            const modifier = GAME_MODIFIERS[game.state.modifierId];

            const modBg = new PIXI.Graphics();
            modBg.roundRect(logX + 10, logY + 32, logW - 20, 40, 6);
            modBg.fill({ color: 0x1a2535 });
            modBg.stroke({ color: 0x9333ea, width: 2 });
            modBg.eventMode = "static";
            modBg.cursor = "pointer";
            layer.addChild(modBg);

            const modLabel = new PIXI.Text({
                text: "⚙ GAME MODIFIER",
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x9333ea, letterSpacing: 1 }),
            });
            modLabel.position.set(logX + 18, logY + 36);
            layer.addChild(modLabel);

            const modText = new PIXI.Text({
                text: modName,
                style: new PIXI.TextStyle({ fontSize: 17, fill: 0xffffff, fontWeight: "700" }),
            });
            modText.position.set(logX + 18, logY + 50);
            layer.addChild(modText);

            const tooltipContainer = new PIXI.Container();
            const tooltipText = new PIXI.Text({
                text: modifier?.description ?? "No modifier effects.",
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: 0xe2e8f0,
                    wordWrap: true,
                    wordWrapWidth: logW - 56,
                }),
            });

            const tooltipX = logX + 14;
            const tooltipY = logY + 78;
            tooltipText.position.set(tooltipX + 10, tooltipY + 6);

            const tooltipBg = new PIXI.Graphics();
            tooltipBg.roundRect(
                tooltipX,
                tooltipY,
                tooltipText.width + 20,
                tooltipText.height + 12,
                6,
            );
            tooltipBg.fill({ color: 0x0b1220, alpha: 0.95 });
            tooltipBg.stroke({ color: 0x9333ea, width: 1, alpha: 0.8 });

            tooltipContainer.addChild(tooltipBg);
            tooltipContainer.addChild(tooltipText);
            tooltipContainer.visible = false;
            modifierTooltip = tooltipContainer;

            const showTooltip = (): void => {
                if (!modifierTooltip) return;
                modifierTooltip.visible = true;
                layer.addChild(modifierTooltip);
            };
            const hideTooltip = (): void => {
                if (!modifierTooltip) return;
                modifierTooltip.visible = false;
            };

            modBg.on("pointerover", showTooltip);
            modBg.on("pointerout", hideTooltip);
            modText.eventMode = "static";
            modText.cursor = "pointer";
            modText.on("pointerover", showTooltip);
            modText.on("pointerout", hideTooltip);
        }

        // Recent events (exclude modifier) - show more
        const recentEvents = game.state.eventLog
            .filter((event) => !event.includes("Modifier:"))
            .slice(-7)
            .reverse();

        let yOffset = logY + (modifierEvent ? 80 : 35);

        for (const event of recentEvents) {
            // Determine icon and color based on event type
            let icon = "•";
            let color = 0xaaaaaa;

            if (event.includes("vs") || event.includes("WON") || event.includes("LOST") || event.includes("defeated")) {
                icon = "⚔";
                color = event.includes("WON") || event.includes("defeated") ? 0x00ff88 : 0xff6b6b;
            } else if (event.includes("Prestige") || event.includes("🧩") || event.includes("Component")) {
                icon = "🏆";
                color = 0xffd700;
            } else if (event.includes("PUSHBACK") || event.includes("damage") || event.includes("💀")) {
                icon = "⚠";
                color = 0xffaa00;
            } else if (event.includes("placed tile") || event.includes("explored")) {
                icon = "🗺";
                color = 0x60a5fa;
            } else if (event.includes("crafted") || event.includes("built")) {
                icon = "🔧";
                color = 0x9333ea;
            }

            const eventText = new PIXI.Text({
                text: `${icon} ${event}`,
                style: new PIXI.TextStyle({ fontSize: 13, fill: color }),
            });
            eventText.position.set(logX + 12, yOffset);
            layer.addChild(eventText);
            yOffset += 18;
        }

        if (recentEvents.length === 0 && !modifierEvent) {
            const emptyText = new PIXI.Text({
                text: "No events yet...",
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x666666, fontStyle: "italic" }),
            });
            emptyText.position.set(logX + 12, yOffset);
            layer.addChild(emptyText);
        }

        if (modifierTooltip) {
            layer.addChild(modifierTooltip);
        }
    }
}
