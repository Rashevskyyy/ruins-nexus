import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type OrbitalHangarMenuContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    renderAll: () => void;
};

export class OrbitalHangarMenuPanel {
    render({ app, game, layer, playerColors, renderAll }: OrbitalHangarMenuContext): void {
        layer.removeChildren(); // Reuse craft layer

        const destinations = game.getOrbitalHangarDestinations();

        const screenW = app.renderer.width;
        const screenH = app.renderer.height;
        const playerIndex = game.state.currentPlayerIndex;
        const playerColor = playerColors[playerIndex % playerColors.length];

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
        const panelW = 360;
        const panelH = Math.min(400, 120 + destinations.length * 50);
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
            text: "🚀 Orbital Hangar Teleport",
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: playerColor,
                fontWeight: "800",
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        layer.addChild(title);

        // Subtitle
        const subtitle = new PIXI.Text({
            text: "Choose destination (safe tiles only, 1 AP)",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xa0aec0 }),
        });
        subtitle.position.set(panelX + 20, panelY + 44);
        layer.addChild(subtitle);

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

        if (destinations.length === 0) {
            const noDestinations = new PIXI.Text({
                text: "No valid destinations available",
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xe53e3e }),
            });
            noDestinations.position.set(panelX + 20, panelY + 80);
            layer.addChild(noDestinations);
            return;
        }

        let yOffset = panelY + 70;

        for (const dest of destinations) {
            const tile = game.state.board.getTile(dest);
            const tileType = tile?.type || "Unknown";

            const cardH = 40;
            const cardBg = new PIXI.Graphics();
            cardBg.roundRect(panelX + 16, yOffset, panelW - 32, cardH, 8);
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0x4a90d9, width: 2 });
            cardBg.eventMode = "static";
            cardBg.cursor = "pointer";
            cardBg.on("pointerdown", () => {
                game.doOrbitalHangarTeleport(dest);
                layer.removeChildren();
                renderAll();
            });
            layer.addChild(cardBg);

            const label = new PIXI.Text({
                text: `📍 ${tileType} (${dest.q}, ${dest.r})`,
                style: new PIXI.TextStyle({ fontSize: 14, fill: 0xffffff, fontWeight: "600" }),
            });
            label.position.set(panelX + 32, yOffset + 10);
            layer.addChild(label);

            yOffset += cardH + 8;
        }
    }
}
