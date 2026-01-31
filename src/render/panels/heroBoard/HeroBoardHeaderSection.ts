import * as PIXI from "pixi.js";
import { AssetLoader } from "../../../assets/AssetLoader";
import type { HeroBoardHeaderContext, HeroBoardHeaderData } from "./HeroBoardTypes";

type HeaderContext = HeroBoardHeaderContext & HeroBoardHeaderData;

export class HeroBoardHeaderSection {
    getSectionHeight(): number {
        return 80;
    }

    render({ layer, panelX, panelY, panelW, playerColor, playerId, raceId, heroClass, powerValue, tooltip }: HeaderContext): void {
        // Header background with gradient effect (left side tinted with player color)
        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(panelX, panelY, panelW, 80, 12);
        headerBg.fill({ color: 0x121a24 });
        layer.addChild(headerBg);

        // Gradient overlay for left side accent
        const gradientOverlay = new PIXI.Graphics();
        gradientOverlay.roundRect(panelX, panelY, panelW * 0.6, 80, 12);
        gradientOverlay.fill({ color: 0x00aaff, alpha: 0.1 });
        layer.addChild(gradientOverlay);

        // Bottom border
        const borderLine = new PIXI.Graphics();
        borderLine.rect(panelX, panelY + 79, panelW, 1);
        borderLine.fill({ color: 0x1a2a3a });
        layer.addChild(borderLine);

        // Portrait container
        const portraitX = panelX + 14;
        const portraitY = panelY + 14;
        const portraitSize = 52;

        const portraitContainer = new PIXI.Container();
        portraitContainer.position.set(portraitX, portraitY);

        const portraitBox = new PIXI.Graphics();
        portraitBox.roundRect(0, 0, portraitSize, portraitSize, 10);
        portraitBox.fill({ color: 0x2a3a4a });
        portraitBox.stroke({ color: 0x00aaff, width: 2 });
        portraitContainer.addChild(portraitBox);

        const portraitTexture = raceId ? AssetLoader.getTexture(`hero-${raceId}`) : null;
        if (portraitTexture) {
            const heroSettings: Record<string, { scale: number; anchorY: number }> = {
                "bioform": { scale: 1.0, anchorY: 0.30 },
                "chrono": { scale: 2.5, anchorY: 0.15 },
                "forge": { scale: 1.3, anchorY: 0.20 },
                "nomad": { scale: 1.0, anchorY: 0.25 },
                "void": { scale: 1.0, anchorY: 0.30 },
                "warbound": { scale: 1.5, anchorY: 0.25 },
            };
            const raceKey = raceId ?? "default";
            const settings = heroSettings[raceKey] || { scale: 1.0, anchorY: 0.35 };
            
            const portraitSprite = new PIXI.Sprite(portraitTexture);
            const baseScale = Math.max(portraitSize / portraitTexture.width, portraitSize / portraitTexture.height);
            portraitSprite.scale.set(baseScale * settings.scale);
            portraitSprite.anchor.set(0.5, settings.anchorY);
            portraitSprite.position.set(portraitSize / 2, portraitSize / 2);

            const mask = new PIXI.Graphics();
            mask.roundRect(0, 0, portraitSize, portraitSize, 10);
            mask.fill({ color: 0xffffff });
            
            portraitSprite.mask = mask;
            portraitContainer.addChild(portraitSprite);
            portraitContainer.addChild(mask);
        } else {
            const portraitHint = new PIXI.Text({
                text: "👨‍🚀",
                style: new PIXI.TextStyle({ fontSize: 28 }),
            });
            portraitHint.anchor.set(0.5);
            portraitHint.position.set(portraitSize / 2, portraitSize / 2);
            portraitContainer.addChild(portraitHint);
        }

        layer.addChild(portraitContainer);

        // Portrait hover effect
        portraitContainer.eventMode = "static";
        portraitContainer.cursor = "pointer";
        portraitContainer.on("pointerover", () => {
            portraitBox.clear();
            portraitBox.roundRect(0, 0, portraitSize, portraitSize, 10);
            portraitBox.fill({ color: 0x2a3a4a });
            portraitBox.stroke({ color: 0x00ddff, width: 2 });
            portraitContainer.scale.set(1.05);
        });
        portraitContainer.on("pointerout", () => {
            portraitBox.clear();
            portraitBox.roundRect(0, 0, portraitSize, portraitSize, 10);
            portraitBox.fill({ color: 0x2a3a4a });
            portraitBox.stroke({ color: 0x00aaff, width: 2 });
            portraitContainer.scale.set(1);
        });

        // Hero info section
        const heroName = new PIXI.Text({
            text: playerId,
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0x00ddff, fontWeight: "700" }),
        });
        heroName.position.set(panelX + 78, panelY + 20);
        layer.addChild(heroName);

        // Hero class badge
        const classBadgeBg = new PIXI.Graphics();
        const classBadgeText = new PIXI.Text({
            text: heroClass,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x666666, fontWeight: "600" }),
        });
        const classBadgeWidth = classBadgeText.width + 12;
        classBadgeBg.roundRect(panelX + 78 + heroName.width + 8, panelY + 22, classBadgeWidth, 18, 4);
        classBadgeBg.fill({ color: 0xffffff, alpha: 0.05 });
        layer.addChild(classBadgeBg);

        classBadgeText.position.set(panelX + 78 + heroName.width + 14, panelY + 24);
        layer.addChild(classBadgeText);

        // Power box (right side)
        const powerBoxWidth = 58;
        const powerBoxHeight = 50;
        const powerBoxX = panelX + panelW - powerBoxWidth - 14;
        const powerBoxY = panelY + 15;

        const powerContainer = new PIXI.Container();
        powerContainer.position.set(powerBoxX, powerBoxY);

        const powerBox = new PIXI.Graphics();
        powerBox.roundRect(0, 0, powerBoxWidth, powerBoxHeight, 8);
        powerBox.fill({ color: 0x000000, alpha: 0.3 });
        powerBox.stroke({ color: 0x2a4a6a, width: 1 });
        powerContainer.addChild(powerBox);

        const powerLabel = new PIXI.Text({
            text: "POWER",
            style: new PIXI.TextStyle({ fontSize: 9, fill: 0x666666, fontWeight: "700", letterSpacing: 1 }),
        });
        powerLabel.anchor.set(0.5, 0);
        powerLabel.position.set(powerBoxWidth / 2, 6);
        powerContainer.addChild(powerLabel);

        const powerValueText = new PIXI.Text({
            text: powerValue,
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffaa00, fontWeight: "700" }),
        });
        powerValueText.anchor.set(0.5, 0);
        powerValueText.position.set(powerBoxWidth / 2, 22);
        powerContainer.addChild(powerValueText);

        layer.addChild(powerContainer);

        // Power box hover effect
        powerContainer.eventMode = "static";
        powerContainer.cursor = "pointer";
        powerContainer.on("pointerover", () => {
            powerBox.clear();
            powerBox.roundRect(0, 0, powerBoxWidth, powerBoxHeight, 8);
            powerBox.fill({ color: 0xffaa00, alpha: 0.1 });
            powerBox.stroke({ color: 0xffaa00, width: 1 });
        });
        powerContainer.on("pointerout", () => {
            powerBox.clear();
            powerBox.roundRect(0, 0, powerBoxWidth, powerBoxHeight, 8);
            powerBox.fill({ color: 0x000000, alpha: 0.3 });
            powerBox.stroke({ color: 0x2a4a6a, width: 1 });
        });

        // Tooltips
        tooltip.attach(portraitContainer, {
            title: `${playerId} - ${heroClass}`,
            description: "Your hero character. Commanders have balanced stats and can adapt to any strategy.",
            stats: [`Hero Die: 0-3`, `Gear Bonus: +${parseInt(powerValue.split("-")[0]) || 0}`, `Total Power: ${powerValue}`],
            accentColor: playerColor,
            icon: "👨‍🚀",
        });

        tooltip.attach(powerContainer, {
            title: "Combat Power",
            description: "Your total attack range in combat. Roll dice and add your power to determine damage dealt.",
            stats: [`Base Die: 0-3`, `Total: ${powerValue}`],
            accentColor: 0xffaa00,
            icon: "⚔️",
            itemType: "Stat",
        });
    }
}
