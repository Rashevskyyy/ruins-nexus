import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type DeckInfoContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
};

export class DeckInfoPanel {
    render({ app, game, layer }: DeckInfoContext): void {
        layer.removeChildren();

        const deckW = 180;
        const deckH = 120;
        const deckX = 16;
        const deckY = app.renderer.height - 148 - 180 - 10 - deckH; // Под Event Log

        // Фон панели
        const bg = new PIXI.Graphics();
        bg.roundRect(deckX, deckY, deckW, deckH, 8);
        bg.fill({ color: 0x1a1f2e, alpha: 0.92 });
        bg.stroke({ color: 0x4a5568, width: 2, alpha: 0.6 });
        layer.addChild(bg);

        // Заголовок
        const title = new PIXI.Text({
            text: "🃏 Tile Deck",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffd700,
                fontWeight: "700",
                dropShadow: {
                    alpha: 0.6,
                    angle: 90,
                    blur: 2,
                    color: 0x000000,
                    distance: 2,
                },
            }),
        });
        title.position.set(deckX + 12, deckY + 10);
        layer.addChild(title);

        // Информация о колоде
        const tier1Remaining = game.state.tileDeck.getTier1Remaining();
        const tier2Remaining = game.state.tileDeck.getTier2Remaining();
        const totalRemaining = game.state.tileDeck.getRemainingCount();

        const infoLines = [
            `Tier 1: ${tier1Remaining} tiles`,
            `Tier 2: ${tier2Remaining} tiles`,
            ``,
            `Total: ${totalRemaining} / 60`,
        ];

        let yOffset = deckY + 38;
        for (const line of infoLines) {
            const lineText = new PIXI.Text({
                text: line,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: line.startsWith("Total") ? 0xffffff : 0xdddddd,
                    fontWeight: line.startsWith("Total") ? "700" : "400",
                }),
            });
            lineText.position.set(deckX + 12, yOffset);
            layer.addChild(lineText);
            yOffset += 18;
        }
    }
}
