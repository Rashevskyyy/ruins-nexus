import * as PIXI from "pixi.js";
import { RACES } from "../../../entities/Race";
import type { HeroBoardAbilitiesContext, HeroBoardAbilitiesData } from "./HeroBoardTypes";

type AbilitiesContext = HeroBoardAbilitiesContext & HeroBoardAbilitiesData;

export class HeroBoardAbilitiesSection {
    private titleStyle = new PIXI.TextStyle({
        fontSize: 14,
        fill: 0x00ff88,
        fontWeight: "700",
    });

    getSectionHeight({ panelW, raceId, raceOption }: Omit<AbilitiesContext, "layer" | "leftX" | "y">): number {
        const padding = 10;
        const spacing = 4;
        const sectionWidth = panelW - 28;
        const content = this.getAbilityContent(raceId, raceOption);
        const bodyStyle = this.getBodyStyle(sectionWidth);

        const titleText = new PIXI.Text({ text: content.title, style: this.titleStyle });
        const passiveText = new PIXI.Text({ text: content.passive, style: bodyStyle });

        const contentHeight =
            titleText.height + passiveText.height + padding * 2 + spacing;

        return contentHeight + 10;
    }

    render({ layer, leftX, panelW, y, raceId, raceOption, tooltip }: AbilitiesContext): number {
        const sectionWidth = panelW - 28;
        const padding = 10;
        const spacing = 4;
        const content = this.getAbilityContent(raceId, raceOption);
        const bodyStyle = this.getBodyStyle(sectionWidth);

        const titleText = new PIXI.Text({ text: content.title, style: this.titleStyle });
        const passiveText = new PIXI.Text({ text: content.passive, style: bodyStyle });
        const boxHeight = titleText.height + passiveText.height + padding * 2 + spacing;
        const box = new PIXI.Graphics();
        box.roundRect(leftX, y, sectionWidth, boxHeight, 8);
        box.fill({ color: 0x0f172a, alpha: 0.35 });
        box.stroke({ color: 0x1a2a3a, width: 1 });
        layer.addChild(box);

        const iconText = new PIXI.Text({ text: content.icon, style: new PIXI.TextStyle({ fontSize: 17 }) });
        iconText.anchor.set(0.5, 0);
        iconText.position.set(leftX + 18, y + 8);
        layer.addChild(iconText);

        titleText.position.set(leftX + 36, y + 8);
        layer.addChild(titleText);

        const variantText = new PIXI.Text({
            text: content.variantLabel,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x6b7280, fontWeight: "700" }),
        });
        variantText.anchor.set(1, 0);
        variantText.position.set(leftX + sectionWidth - 8, y + 10);
        layer.addChild(variantText);

        passiveText.position.set(leftX + 18, y + 26);
        layer.addChild(passiveText);

        tooltip.attach(box, {
            title: content.title,
            description: content.passive,
            stats: [content.variantLabel],
            accentColor: 0x00ff88,
            icon: content.icon,
        });

        return y + boxHeight + 10;
    }

    private getAbilityContent(raceId: AbilitiesContext["raceId"], raceOption: AbilitiesContext["raceOption"]) {
        if (!raceId || !raceOption || !RACES[raceId]) {
            return {
                icon: "✨",
                title: "Unknown Hero",
                passive: "Passive: Select a race to see your passive ability.",
                variantLabel: "Option ?",
            };
        }

        const race = RACES[raceId];
        const option = raceOption === "A" ? race.optionA : race.optionB;

        return {
            icon: race.emoji,
            title: race.name,
            passive: `Passive: ${race.passiveDescription}`,
            variantLabel: `Option ${raceOption}: ${option.name}`,
        };
    }

    private getBodyStyle(sectionWidth: number): PIXI.TextStyle {
        return new PIXI.TextStyle({
            fontSize: 11,
            fill: 0x94a3b8,
            wordWrap: true,
            wordWrapWidth: sectionWidth - 24,
            lineHeight: 14,
        });
    }
}
