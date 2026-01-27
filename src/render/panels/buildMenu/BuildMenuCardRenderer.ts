import * as PIXI from "pixi.js";

type BuildCardOptions = {
    name: string;
    emoji: string;
    cost: string;
    effect: string;
    canAfford: boolean;
    alreadyBuilt?: boolean;
    onBuild: () => void;
};

export class BuildMenuCardRenderer {
    render(layer: PIXI.Container, x: number, y: number, w: number, options: BuildCardOptions): void {
        const h = 60;
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, w, h, 10);

        if (options.alreadyBuilt) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.5 });
            cardBg.stroke({ color: 0x48bb78, width: 2, alpha: 0.8 });
        } else if (options.canAfford) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0xffd700, width: 2, alpha: 0.8 });
        } else {
            cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
            cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
        }
        layer.addChild(cardBg);

        const emoji = new PIXI.Text({
            text: options.emoji,
            style: new PIXI.TextStyle({ fontSize: 28 }),
        });
        emoji.position.set(x + 16, y + 14);
        layer.addChild(emoji);

        const name = new PIXI.Text({
            text: options.name,
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: options.alreadyBuilt ? 0x48bb78 : (options.canAfford ? 0xffffff : 0x718096),
                fontWeight: "700",
            }),
        });
        name.position.set(x + 56, y + 10);
        layer.addChild(name);

        const effect = new PIXI.Text({
            text: options.effect,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xa0aec0, fontWeight: "400" }),
        });
        effect.position.set(x + 56, y + 32);
        layer.addChild(effect);

        const cost = new PIXI.Text({
            text: options.cost,
            style: new PIXI.TextStyle({
                fontSize: 13,
                fill: options.canAfford ? 0x48bb78 : 0xe53e3e,
                fontWeight: "600",
            }),
        });
        cost.anchor.set(1, 0);
        cost.position.set(x + w - 80, y + 12);
        layer.addChild(cost);

        if (!options.alreadyBuilt) {
            const btnW = 60;
            const btnH = 28;
            const btnX = x + w - btnW - 10;
            const btnY = y + (h - btnH) / 2;

            const btn = new PIXI.Graphics();
            btn.roundRect(btnX, btnY, btnW, btnH, 6);

            if (options.canAfford) {
                btn.fill({ color: 0x48bb78, alpha: 1 });
                btn.stroke({ color: 0x68d391, width: 2 });
                btn.eventMode = "static";
                btn.cursor = "pointer";
                btn.on("pointerdown", options.onBuild);
            } else {
                btn.fill({ color: 0x4a5568, alpha: 0.5 });
            }
            layer.addChild(btn);

            const btnText = new PIXI.Text({
                text: "BUILD",
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: options.canAfford ? 0xffffff : 0x718096,
                    fontWeight: "800",
                }),
            });
            btnText.anchor.set(0.5);
            btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
            layer.addChild(btnText);
        } else {
            const badge = new PIXI.Text({
                text: "✓ BUILT",
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x48bb78, fontWeight: "700" }),
            });
            badge.anchor.set(1, 0.5);
            badge.position.set(x + w - 16, y + h / 2);
            layer.addChild(badge);
        }
    }
}
