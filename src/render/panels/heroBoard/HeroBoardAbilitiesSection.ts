import * as PIXI from "pixi.js";
import { RACES } from "../../../entities/Race";
import type { HeroBoardAbilitiesContext, HeroBoardAbilitiesData } from "./HeroBoardTypes";

type AbilitiesContext = HeroBoardAbilitiesContext & HeroBoardAbilitiesData;

export class HeroBoardAbilitiesSection {
    private labelStyle = new PIXI.TextStyle({
        fontSize: 12,
        fill: 0x9ca3af,
        letterSpacing: 1,
        fontWeight: "700",
    });
    private titleStyle = new PIXI.TextStyle({
        fontSize: 13,
        fill: 0xf8fafc,
        fontWeight: "700",
    });

    getSectionHeight({ panelW, raceId, raceOption }: Omit<AbilitiesContext, "layer" | "leftX" | "y">): number {
        const labelHeight = 18;
        const padding = 10;
        const spacing = 6;
        const sectionWidth = panelW - 28;
        const content = this.getAbilityContent(raceId, raceOption);
        const bodyStyle = this.getBodyStyle(sectionWidth);

        const titleText = new PIXI.Text({ text: content.title, style: this.titleStyle });
        const passiveText = new PIXI.Text({ text: content.passive, style: bodyStyle });
        const optionText = new PIXI.Text({ text: content.option, style: bodyStyle });

        const contentHeight =
            titleText.height + passiveText.height + optionText.height + padding * 2 + spacing * 2;

        return labelHeight + contentHeight + 8;
    }

    render({ layer, leftX, panelW, y, raceId, raceOption }: AbilitiesContext): number {
        const label = new PIXI.Text({ text: "✨ ABILITIES", style: this.labelStyle });
        label.position.set(leftX, y);
        layer.addChild(label);
        y += 18;

        const sectionWidth = panelW - 28;
        const padding = 10;
        const spacing = 6;
        const content = this.getAbilityContent(raceId, raceOption);
        const bodyStyle = this.getBodyStyle(sectionWidth);

        const titleText = new PIXI.Text({ text: content.title, style: this.titleStyle });
        const passiveText = new PIXI.Text({ text: content.passive, style: bodyStyle });
        const optionText = new PIXI.Text({ text: content.option, style: bodyStyle });

        const contentHeight =
            titleText.height + passiveText.height + optionText.height + padding * 2 + spacing * 2;



        let textY = y + padding;
        titleText.position.set(leftX + padding, textY);
        layer.addChild(titleText);
        textY += titleText.height + spacing;

        passiveText.position.set(leftX + padding, textY);
        layer.addChild(passiveText);
        textY += passiveText.height + spacing;

        optionText.position.set(leftX + padding, textY);
        layer.addChild(optionText);

        return y + contentHeight + 8;
    }

    private getAbilityContent(raceId: AbilitiesContext["raceId"], raceOption: AbilitiesContext["raceOption"]) {
        if (!raceId || !raceOption || !RACES[raceId]) {
            return {
                title: "Unknown Hero",
                passive: "Select a race in the lobby to see your passive ability.",
                option: "Choose an option to unlock your hero specialization.",
            };
        }

        const race = RACES[raceId];
        const option = raceOption === "A" ? race.optionA : race.optionB;

        return {
            title: `${race.emoji} ${race.name}`,
            passive: `Passive: ${race.passiveDescription}`,
            option: `Option ${raceOption} — ${option.name}: ${option.description}`,
        };
    }

    private getBodyStyle(sectionWidth: number): PIXI.TextStyle {
        return new PIXI.TextStyle({
            fontSize: 11,
            fill: 0x9ca3af,
            wordWrap: true,
            wordWrapWidth: sectionWidth - 20,
            lineHeight: 14,
        });
    }
}
