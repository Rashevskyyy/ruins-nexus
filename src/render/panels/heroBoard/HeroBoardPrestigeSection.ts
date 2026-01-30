import * as PIXI from "pixi.js";
import type { HeroBoardPrestigeContext, HeroBoardPrestigeData } from "./HeroBoardTypes";

type PrestigeContext = HeroBoardPrestigeContext & HeroBoardPrestigeData;

export class HeroBoardPrestigeSection {
    getSectionHeight(): number {
        return 64;
    }

    render({ layer, leftX, rightX, panelW, y, prestige }: PrestigeContext): number {
        const prestigeBorderColor = prestige >= 15 ? 0xff4444 : (prestige >= 12 ? 0xffaa00 : 0xffd700);

        const prestigeBox = new PIXI.Graphics();
        prestigeBox.roundRect(leftX, y, panelW - 28, 56, 8);
        prestigeBox.fill({ color: 0x0b0f14, alpha: 0.6 });
        prestigeBox.stroke({ color: 0x1a2a3a, width: 1 });
        layer.addChild(prestigeBox);

        const starIcon = new PIXI.Text({ text: "⭐", style: new PIXI.TextStyle({ fontSize: 18 }) });
        starIcon.position.set(leftX + 10, y + 12);
        layer.addChild(starIcon);

        const prestigeLabel = new PIXI.Text({
            text: "Prestige",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x6b7280, fontWeight: "700", letterSpacing: 1 }),
        });
        prestigeLabel.position.set(leftX + 36, y + 14);
        layer.addChild(prestigeLabel);

        const barW = panelW - 82;
        const barH = 6;
        const barX = leftX + 36;
        const barY = y + 30;
        const maxPrestige = 20;

        const prestigeBarBg = new PIXI.Graphics();
        prestigeBarBg.roundRect(barX, barY, barW, barH, 3);
        prestigeBarBg.fill({ color: 0x1a1a0a, alpha: 1 });
        layer.addChild(prestigeBarBg);

        const fillW = Math.min(prestige / maxPrestige, 1) * barW;
        if (fillW > 0) {
            const prestigeBarFill = new PIXI.Graphics();
            prestigeBarFill.roundRect(barX, barY, fillW, barH, 3);
            prestigeBarFill.fill({ color: prestigeBorderColor });
            layer.addChild(prestigeBarFill);
        }

        const prestigeValue = new PIXI.Text({
            text: `${prestige}`,
            style: new PIXI.TextStyle({
                fontSize: 26,
                fill: 0xffd700,
                fontWeight: "900",
            }),
        });
        prestigeValue.anchor.set(1, 0.5);
        prestigeValue.position.set(rightX - 10, y + 26);
        layer.addChild(prestigeValue);

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

        return y + 64;
    }
}
