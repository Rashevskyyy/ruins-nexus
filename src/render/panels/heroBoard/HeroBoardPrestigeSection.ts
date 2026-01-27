import * as PIXI from "pixi.js";
import type { HeroBoardPrestigeContext, HeroBoardPrestigeData } from "./HeroBoardTypes";

type PrestigeContext = HeroBoardPrestigeContext & HeroBoardPrestigeData;

export class HeroBoardPrestigeSection {
    render({ layer, leftX, rightX, panelW, y, prestige }: PrestigeContext): number {
        const prestigeBgColor = prestige >= 15 ? 0x3d1a1a : (prestige >= 12 ? 0x3d2a1a : 0x161b2e);
        const prestigeBorderColor = prestige >= 15 ? 0xff4444 : (prestige >= 12 ? 0xffaa00 : 0xffd700);

        const prestigeBox = new PIXI.Graphics();
        prestigeBox.roundRect(leftX, y, panelW - 28, 56, 8);
        prestigeBox.fill({ color: prestigeBgColor, alpha: 0 });
        prestigeBox.stroke({ color: prestigeBorderColor, width: 2 });
        layer.addChild(prestigeBox);

        const prestigeHeader = new PIXI.Text({
            text: "⭐ PRESTIGE",
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0xffd700, fontWeight: "700", letterSpacing: 1 }),
        });
        prestigeHeader.position.set(leftX + 10, y + 6);
        layer.addChild(prestigeHeader);

        const prestigeValue = new PIXI.Text({
            text: `${prestige}`,
            style: new PIXI.TextStyle({
                fontSize: 38,
                fill: 0xffd700,
                fontWeight: "900",
                dropShadow: { color: 0xffd700, blur: 8, alpha: 0.5, distance: 0 },
            }),
        });
        prestigeValue.anchor.set(1, 0);
        prestigeValue.position.set(rightX - 10, y + 14);
        layer.addChild(prestigeValue);

        const barW = panelW - 50;
        const barH = 8;
        const barX = leftX + 10;
        const barY = y + 40;
        const maxPrestige = 20;

        const prestigeBarBg = new PIXI.Graphics();
        prestigeBarBg.roundRect(barX, barY, barW, barH, 3);
        prestigeBarBg.fill({ color: 0x0d1117, alpha: 0 });
        layer.addChild(prestigeBarBg);

        const fillW = Math.min(prestige / maxPrestige, 1) * barW;
        if (fillW > 0) {
            const prestigeBarFill = new PIXI.Graphics();
            prestigeBarFill.roundRect(barX, barY, fillW, barH, 3);
            prestigeBarFill.fill({ color: prestigeBorderColor });
            layer.addChild(prestigeBarFill);
        }

        const marker12X = barX + (12 / maxPrestige) * barW;
        const marker15X = barX + (15 / maxPrestige) * barW;

        const m12 = new PIXI.Graphics();
        m12.rect(marker12X, barY, 1, barH);
        m12.fill({ color: 0xffffff, alpha: 0.5 });
        layer.addChild(m12);

        const m15 = new PIXI.Graphics();
        m15.rect(marker15X, barY, 1, barH);
        m15.fill({ color: 0xffffff, alpha: 0.5 });
        layer.addChild(m15);

        if (prestige >= 12) {
            const warnText = prestige >= 15 ? "🚫 No Rerolls" : "⚠️ +1 Difficulty";
            const warn = new PIXI.Text({
                text: warnText,
                style: new PIXI.TextStyle({ fontSize: 11, fill: prestigeBorderColor, fontWeight: "600" }),
            });
            warn.position.set(leftX + 10, y + 22);
            layer.addChild(warn);
        }

        return y + 64;
    }
}
