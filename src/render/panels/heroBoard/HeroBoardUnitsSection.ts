import * as PIXI from "pixi.js";
import type { HeroBoardUnitsContext, HeroBoardUnitsData } from "./HeroBoardTypes";

type UnitsContext = HeroBoardUnitsContext & HeroBoardUnitsData;

export class HeroBoardUnitsSection {
    render({ layer, leftX, rightX, panelW, y, units }: UnitsContext): number {
        const unitsCount = units.filter((u) => u !== null).length;

        const unitsLabel = new PIXI.Text({
            text: "🤖 COMBAT UNITS",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x3b82f6, letterSpacing: 1, fontWeight: "600" }),
        });
        unitsLabel.position.set(leftX, y);
        layer.addChild(unitsLabel);

        const permLabel = new PIXI.Text({
            text: unitsCount > 0 ? `+${unitsCount} POWER` : "PERMANENT",
            style: new PIXI.TextStyle({
                fontSize: 11,
                fill: unitsCount > 0 ? 0x00ff88 : 0x484f58,
                fontWeight: "700",
            }),
        });
        permLabel.anchor.set(1, 0);
        permLabel.position.set(rightX, y + 1);
        layer.addChild(permLabel);

        y += 16;

        const columnGap = 8;
        const unitW = (panelW - 28 - columnGap) / 2;

        for (let i = 0; i < 2; i++) {
            const unit = units[i];
            const ux = leftX + i * (unitW + columnGap);
            const filled = unit !== null;

            const unitBox = new PIXI.Graphics();
            unitBox.roundRect(ux, y, unitW, 55, 6);
            unitBox.fill({ color: filled ? 0x1a2a3e : 0x0d1117, alpha: 0 });
            unitBox.stroke({ color: 0x3b82f6, width: filled ? 2 : 1, alpha: filled ? 0.8 : 0.3 });
            layer.addChild(unitBox);

            if (unit) {
                const emoji = new PIXI.Text({ text: unit.emoji, style: new PIXI.TextStyle({ fontSize: 26 }) });
                emoji.anchor.set(0.5);
                emoji.position.set(ux + unitW / 2, y + 20);
                layer.addChild(emoji);

                const name = new PIXI.Text({
                    text: unit.name.split(" ")[0],
                    style: new PIXI.TextStyle({ fontSize: 11, fill: 0x3b82f6, fontWeight: "600" }),
                });
                name.anchor.set(0.5);
                name.position.set(ux + unitW / 2, y + 42);
                layer.addChild(name);
            } else {
                const plus = new PIXI.Text({
                    text: "+",
                    style: new PIXI.TextStyle({ fontSize: 26, fill: 0x3b82f6 }),
                });
                plus.alpha = 0.3;
                plus.anchor.set(0.5);
                plus.position.set(ux + unitW / 2, y + 24);
                layer.addChild(plus);
            }
        }

        return y + 65;
    }
}
