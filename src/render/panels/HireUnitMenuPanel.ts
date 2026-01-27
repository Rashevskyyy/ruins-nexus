import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type HireUnitMenuContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    renderAll: () => void;
};

export class HireUnitMenuPanel {
    render({ app, game, layer, playerColors, renderAll }: HireUnitMenuContext): void {
        // Import unit definitions
        import("../../entities/Unit").then(({ UNIT_DEFINITIONS }) => {
            layer.removeChildren(); // Reuse craft layer

            const p = game.state.players[game.state.currentPlayerIndex];
            const playerIndex = game.state.currentPlayerIndex;
            const playerColor = playerColors[playerIndex % playerColors.length];

            const screenW = app.renderer.width;
            const screenH = app.renderer.height;

            // Backdrop
            const backdrop = new PIXI.Graphics();
            backdrop.rect(0, 0, screenW, screenH);
            backdrop.fill({ color: 0x000000, alpha: 0.6 });
            backdrop.eventMode = "static";
            backdrop.cursor = "pointer";
            backdrop.on("pointerdown", () => {
                layer.removeChildren();
                renderAll();
            });
            layer.addChild(backdrop);

            // Panel
            const panelW = 400;
            const panelH = 300;
            const panelX = (screenW - panelW) / 2;
            const panelY = (screenH - panelH) / 2;

            const panel = new PIXI.Graphics();
            panel.roundRect(panelX, panelY, panelW, panelH, 16);
            panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
            panel.stroke({ color: playerColor, width: 4, alpha: 1 });
            panel.eventMode = "static";
            layer.addChild(panel);

            // Title
            const title = new PIXI.Text({
                text: "🤖 Hire Units",
                style: new PIXI.TextStyle({
                    fontSize: 24,
                    fill: playerColor,
                    fontWeight: "800",
                }),
            });
            title.position.set(panelX + 20, panelY + 16);
            layer.addChild(title);

            // Resources
            const resourceText = new PIXI.Text({
                text: `Your resources: 🧩${p.components}  ⚙${p.alloys}  🧱${p.materials}`,
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0, fontWeight: "600" }),
            });
            resourceText.position.set(panelX + 20, panelY + 50);
            layer.addChild(resourceText);

            // Close button
            const closeBtn = new PIXI.Graphics();
            closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
            closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
            closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
            closeBtn.eventMode = "static";
            closeBtn.cursor = "pointer";
            closeBtn.on("pointerdown", () => {
                layer.removeChildren();
                renderAll();
            });
            layer.addChild(closeBtn);

            const closeX = new PIXI.Text({
                text: "✕",
                style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
            });
            closeX.anchor.set(0.5);
            closeX.position.set(panelX + panelW - 24, panelY + 24);
            layer.addChild(closeX);

            let yOffset = panelY + 80;

            // Unit cards
            const unitTypes = ["assault", "shield", "tactical"] as const;
            for (const unitType of unitTypes) {
                const def = UNIT_DEFINITIONS[unitType];
                const canAfford =
                    p.components >= def.cost.components &&
                    p.alloys >= def.cost.alloys &&
                    p.materials >= def.cost.materials;
                const hasSlot = p.units.some(u => u === null);

                const cardH = 55;
                const cardBg = new PIXI.Graphics();
                cardBg.roundRect(panelX + 16, yOffset, panelW - 32, cardH, 10);

                if (canAfford && hasSlot) {
                    cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
                    cardBg.stroke({ color: 0x3b82f6, width: 2, alpha: 0.8 });
                } else {
                    cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
                    cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
                }
                layer.addChild(cardBg);

                // Emoji
                const emoji = new PIXI.Text({
                    text: def.emoji,
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                emoji.position.set(panelX + 28, yOffset + 14);
                layer.addChild(emoji);

                // Name
                const name = new PIXI.Text({
                    text: def.name,
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: canAfford && hasSlot ? 0xffffff : 0x718096,
                        fontWeight: "700",
                    }),
                });
                name.position.set(panelX + 64, yOffset + 8);
                layer.addChild(name);

                // Effect
                const effect = new PIXI.Text({
                    text: def.description,
                    style: new PIXI.TextStyle({ fontSize: 10, fill: 0xa0aec0 }),
                });
                effect.position.set(panelX + 64, yOffset + 28);
                layer.addChild(effect);

                // Cost
                const costParts: string[] = [];
                if (def.cost.components > 0) costParts.push(`${def.cost.components}🧩`);
                if (def.cost.alloys > 0) costParts.push(`${def.cost.alloys}⚙`);
                if (def.cost.materials > 0) costParts.push(`${def.cost.materials}🧱`);

                const costText = new PIXI.Text({
                    text: costParts.join(" "),
                    style: new PIXI.TextStyle({
                        fontSize: 12,
                        fill: canAfford ? 0x48bb78 : 0xe53e3e,
                        fontWeight: "600",
                    }),
                });
                costText.anchor.set(1, 0);
                costText.position.set(panelX + panelW - 90, yOffset + 10);
                layer.addChild(costText);

                // Hire button
                if (canAfford && hasSlot) {
                    const btnW = 60;
                    const btnH = 26;
                    const btnX = panelX + panelW - btnW - 26;
                    const btnY = yOffset + (cardH - btnH) / 2;

                    const btn = new PIXI.Graphics();
                    btn.roundRect(btnX, btnY, btnW, btnH, 6);
                    btn.fill({ color: 0x3b82f6, alpha: 1 });
                    btn.stroke({ color: 0x60a5fa, width: 2 });
                    btn.eventMode = "static";
                    btn.cursor = "pointer";
                    btn.on("pointerdown", () => {
                        game.doHireUnit(unitType);
                        layer.removeChildren();
                        renderAll();
                    });
                    layer.addChild(btn);

                    const btnText = new PIXI.Text({
                        text: "HIRE",
                        style: new PIXI.TextStyle({
                            fontSize: 10,
                            fill: 0xffffff,
                            fontWeight: "800",
                        }),
                    });
                    btnText.anchor.set(0.5);
                    btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
                    layer.addChild(btnText);
                }

                yOffset += cardH + 8;
            }
        });
    }
}
