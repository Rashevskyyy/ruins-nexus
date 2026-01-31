import * as PIXI from "pixi.js";
import { RACES } from "../../../entities/Race";
import type { HeroBoardAbilitiesContext, HeroBoardAbilitiesData } from "./HeroBoardTypes";

type AbilitiesContext = HeroBoardAbilitiesContext & HeroBoardAbilitiesData;

export class HeroBoardAbilitiesSection {
    getSectionHeight({ panelW, raceId, raceOption }: Omit<AbilitiesContext, "layer" | "panelX" | "leftX" | "y" | "tooltip">): number {
        const content = this.getAbilityContent(raceId, raceOption);
        const passiveStyle = this.getPassiveStyle(panelW - 32);
        const passiveText = new PIXI.Text({ text: content.passive, style: passiveStyle });
        return 38 + passiveText.height + 6;
    }

    render({ layer, panelX, panelW, y, raceId, raceOption, tooltip }: AbilitiesContext): number {
        const content = this.getAbilityContent(raceId, raceOption);
        const sectionHeight = this.getSectionHeight({ panelW, raceId, raceOption });

        // Section container
        const sectionContainer = new PIXI.Container();
        sectionContainer.position.set(panelX, y);

        // Background with green tint
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, panelW, sectionHeight);
        bg.fill({ color: 0x00ff88, alpha: 0.03 });
        sectionContainer.addChild(bg);

        // Bottom border
        const borderLine = new PIXI.Graphics();
        borderLine.rect(0, sectionHeight - 1, panelW, 1);
        borderLine.fill({ color: 0x1a2a3a });
        sectionContainer.addChild(borderLine);

        // Race header
        const headerY = 10;
        
        // Race icon
        const raceIcon = new PIXI.Text({
            text: content.icon,
            style: new PIXI.TextStyle({ fontSize: 18 }),
        });
        raceIcon.position.set(16, headerY);
        sectionContainer.addChild(raceIcon);

        // Race name
        const raceName = new PIXI.Text({
            text: content.title,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0x00ff88, fontWeight: "600" }),
        });
        raceName.position.set(40, headerY + 2);
        sectionContainer.addChild(raceName);

        // Variant badge (right side)
        const variantText = new PIXI.Text({
            text: content.variantLabel,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x666666, fontWeight: "600" }),
        });
        const variantBg = new PIXI.Graphics();
        const variantWidth = variantText.width + 12;
        variantBg.roundRect(panelW - variantWidth - 16, headerY, variantWidth, 18, 4);
        variantBg.fill({ color: 0x00ff88, alpha: 0.1 });
        sectionContainer.addChild(variantBg);
        
        variantText.position.set(panelW - variantText.width - 22, headerY + 2);
        sectionContainer.addChild(variantText);

        // Passive description
        const passiveStyle = this.getPassiveStyle(panelW - 32);
        const passiveText = new PIXI.Text({ text: content.passive, style: passiveStyle });
        passiveText.position.set(16, headerY + 24);
        sectionContainer.addChild(passiveText);

        layer.addChild(sectionContainer);

        // Hover effect
        sectionContainer.eventMode = "static";
        sectionContainer.cursor = "pointer";
        sectionContainer.on("pointerover", () => {
            bg.clear();
            bg.rect(0, 0, panelW, sectionHeight);
            bg.fill({ color: 0x00ff88, alpha: 0.08 });
        });
        sectionContainer.on("pointerout", () => {
            bg.clear();
            bg.rect(0, 0, panelW, sectionHeight);
            bg.fill({ color: 0x00ff88, alpha: 0.03 });
        });

        // Tooltip
        tooltip.attach(sectionContainer, {
            title: content.title,
            description: content.fullDescription,
            stats: content.tooltipStats,
            accentColor: 0x00ff88,
            icon: content.icon,
            itemType: "Race Ability",
        });

        return y + sectionHeight;
    }

    private getAbilityContent(raceId: AbilitiesContext["raceId"], raceOption: AbilitiesContext["raceOption"]) {
        if (!raceId || !raceOption || !RACES[raceId]) {
            return {
                icon: "✨",
                title: "Unknown Hero",
                passive: "Passive: Select a race to see your passive ability.",
                variantLabel: "Option ?",
                fullDescription: "Select a race to see your passive ability.",
                tooltipStats: ["Passive: Unknown"],
            };
        }

        const race = RACES[raceId];
        const option = raceOption === "A" ? race.optionA : race.optionB;

        return {
            icon: race.emoji,
            title: race.name,
            passive: `Passive: ${race.passiveDescription}`,
            variantLabel: `Option ${raceOption}`,
            fullDescription: `${race.name} warriors. ${race.passiveDescription}`,
            tooltipStats: [
                `Passive: ${race.passiveDescription}`,
                `Option ${raceOption}: ${option.name}`,
            ],
        };
    }

    private getPassiveStyle(wrapWidth: number): PIXI.TextStyle {
        return new PIXI.TextStyle({
            fontSize: 12,
            fill: 0x888888,
            wordWrap: true,
            wordWrapWidth: wrapWidth,
            lineHeight: 16,
        });
    }
}
