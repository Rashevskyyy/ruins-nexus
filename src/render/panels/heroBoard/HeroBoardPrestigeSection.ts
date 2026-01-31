import * as PIXI from "pixi.js";
import type { HeroBoardPrestigeContext, HeroBoardPrestigeData } from "./HeroBoardTypes";

type PrestigeContext = HeroBoardPrestigeContext & HeroBoardPrestigeData;

export class HeroBoardPrestigeSection {
    getSectionHeight(): number {
        return 50;
    }

    render({ layer, panelX, panelW, y, prestige, tooltip }: PrestigeContext): number {
        const sectionHeight = 50;

        // Section container
        const sectionContainer = new PIXI.Container();
        sectionContainer.position.set(panelX, y);

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, panelW, sectionHeight);
        bg.fill({ color: 0x0a1015 });
        sectionContainer.addChild(bg);

        // Bottom border
        const borderLine = new PIXI.Graphics();
        borderLine.rect(0, sectionHeight - 1, panelW, 1);
        borderLine.fill({ color: 0x1a2a3a });
        sectionContainer.addChild(borderLine);

        // Star icon
        const starIcon = new PIXI.Text({
            text: "⭐",
            style: new PIXI.TextStyle({ fontSize: 20 }),
        });
        starIcon.position.set(16, 14);
        sectionContainer.addChild(starIcon);

        // Prestige label
        const prestigeLabel = new PIXI.Text({
            text: "PRESTIGE",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x666666, fontWeight: "700", letterSpacing: 1 }),
        });
        prestigeLabel.position.set(44, 12);
        sectionContainer.addChild(prestigeLabel);

        // Progress bar
        const barX = 44;
        const barY = 28;
        const barW = panelW - 100;
        const barH = 6;
        const maxPrestige = 15;

        const barBg = new PIXI.Graphics();
        barBg.roundRect(barX, barY, barW, barH, 3);
        barBg.fill({ color: 0x1a1a0a });
        barBg.stroke({ color: 0x2a2a1a, width: 1 });
        sectionContainer.addChild(barBg);

        const fillRatio = Math.min(prestige / maxPrestige, 1);
        const fillW = fillRatio * barW;
        if (fillW > 0) {
            const barFill = new PIXI.Graphics();
            barFill.roundRect(barX, barY, fillW, barH, 3);
            barFill.fill({ color: 0xffd700 });
            sectionContainer.addChild(barFill);
        }

        // Prestige value (large number on right)
        const prestigeValue = new PIXI.Text({
            text: `${prestige}`,
            style: new PIXI.TextStyle({ fontSize: 26, fill: 0xffd700, fontWeight: "700" }),
        });
        prestigeValue.anchor.set(1, 0.5);
        prestigeValue.position.set(panelW - 16, sectionHeight / 2);
        sectionContainer.addChild(prestigeValue);

        layer.addChild(sectionContainer);

        // Hover effect
        sectionContainer.eventMode = "static";
        sectionContainer.cursor = "pointer";
        sectionContainer.on("pointerover", () => {
            bg.clear();
            bg.rect(0, 0, panelW, sectionHeight);
            bg.fill({ color: 0xffd700, alpha: 0.05 });
        });
        sectionContainer.on("pointerout", () => {
            bg.clear();
            bg.rect(0, 0, panelW, sectionHeight);
            bg.fill({ color: 0x0a1015 });
        });

        // Tooltip
        tooltip.attach(sectionContainer, {
            title: "Prestige",
            description: "Victory points. Earn by defeating monsters, completing objectives, and building. Highest prestige wins!",
            stats: [`Current: ${prestige}`, "Goal: ~15 to win", "Sources: Monsters, Objectives, Base"],
            accentColor: 0xffd700,
            icon: "⭐",
            itemType: "Stat",
        });

        return y + sectionHeight;
    }
}
