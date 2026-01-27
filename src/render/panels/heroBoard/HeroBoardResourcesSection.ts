import * as PIXI from "pixi.js";
import type { HeroBoardResourcesContext, HeroBoardResourcesData } from "./HeroBoardTypes";

type ResourcesContext = HeroBoardResourcesContext & HeroBoardResourcesData;

export class HeroBoardResourcesSection {
    render({ layer, leftX, panelW, y, player }: ResourcesContext): number {
        const columnGap = 8;
        const statsW = (panelW - 28 - columnGap * 4) / 5;
        const stats = [
            { emoji: "❤️", value: `${player.hp}`, color: 0xff6b6b },
            { emoji: "🧬", value: player.biomass, color: 0x00ff88 },
            { emoji: "🧱", value: player.materials, color: 0xd97706 },
            { emoji: "⚙", value: player.alloys, color: 0x708090 },
            { emoji: "🧩", value: player.components, color: 0x9333ea },
        ];

        for (let i = 0; i < 5; i++) {
            const stat = stats[i];
            const sx = leftX + i * (statsW + columnGap);

            const statBox = new PIXI.Graphics();
            statBox.roundRect(sx, y, statsW, 44, 10);
            statBox.fill({ color: 0x0f172a });
            statBox.stroke({ color: stat.color, width: 1, alpha: 0.4 });
            layer.addChild(statBox);

            const emoji = new PIXI.Text({ text: stat.emoji, style: new PIXI.TextStyle({ fontSize: 16 }) });
            emoji.anchor.set(0.5);
            emoji.position.set(sx + statsW / 2, y + 12);
            layer.addChild(emoji);

            const val = new PIXI.Text({
                text: `${stat.value}`,
                style: new PIXI.TextStyle({ fontSize: 18, fill: stat.color, fontWeight: "800" }),
            });
            val.anchor.set(0.5);
            val.position.set(sx + statsW / 2, y + 31);
            layer.addChild(val);
        }

        return y + 54;
    }
}
