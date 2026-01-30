import * as PIXI from "pixi.js";
import { AssetLoader } from "../../../assets/AssetLoader";
import type { HeroBoardHeaderContext, HeroBoardHeaderData } from "./HeroBoardTypes";

type HeaderContext = HeroBoardHeaderContext & HeroBoardHeaderData;

export class HeroBoardHeaderSection {
    getSectionHeight(): number {
        return 96;
    }

    render({ layer, panelX, panelY, playerColor, playerId, raceId, heroClass, powerValue, tooltip }: HeaderContext): void {
        const portraitX = panelX + 16;
        const portraitY = panelY + 14;
        const portraitSize = 52;
        const portraitBox = new PIXI.Graphics();
        portraitBox.roundRect(portraitX, portraitY, portraitSize, portraitSize, 12);
        portraitBox.fill({ color: 0x0b1220 });
        portraitBox.stroke({ color: playerColor, width: 2, alpha: 0.6 });
        layer.addChild(portraitBox);

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
            portraitSprite.position.set(portraitX + portraitSize / 2, portraitY + portraitSize / 2);

            // Mask must be filled in PIXI v8
            const mask = new PIXI.Graphics();
            mask.roundRect(portraitX, portraitY, portraitSize, portraitSize, 12);
            mask.fill({ color: 0xffffff }); // Fill is required for mask to work
            
            portraitSprite.mask = mask;
            layer.addChild(portraitSprite);
            layer.addChild(mask); // Mask added after sprite
        } else {
            const portraitHint = new PIXI.Text({
                text: "HERO",
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e, fontWeight: "700", letterSpacing: 1 }),
            });
            portraitHint.anchor.set(0.5);
            portraitHint.position.set(portraitX + portraitSize / 2, portraitY + portraitSize / 2);
            layer.addChild(portraitHint);
        }

        const title = new PIXI.Text({
            text: playerId,
            style: new PIXI.TextStyle({ fontSize: 20, fill: 0x00ddff, fontWeight: "900" }),
        });
        title.position.set(panelX + 78, panelY + 16);
        layer.addChild(title);

        const subtitle = new PIXI.Text({
            text: heroClass,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x6b7280, fontWeight: "600" }),
        });
        subtitle.position.set(panelX + 78, panelY + 40);
        layer.addChild(subtitle);

        const powerBox = new PIXI.Graphics();
        powerBox.roundRect(panelX + 206, panelY + 14, 78, 56, 10);
        powerBox.fill({ color: 0x0b0f14, alpha: 0.85 });
        powerBox.stroke({ color: 0x2a4a6a, width: 1 });
        layer.addChild(powerBox);

        const powerLabel = new PIXI.Text({
            text: "POWER",
            style: new PIXI.TextStyle({
                fontSize: 9,
                fill: 0x6b7280,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        powerLabel.anchor.set(0.5, 0);
        powerLabel.position.set(panelX + 245, panelY + 20);
        layer.addChild(powerLabel);

        const powerText = new PIXI.Text({
            text: powerValue,
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: 0xffaa00,
                fontWeight: "900",
            }),
        });
        powerText.anchor.set(0.5, 0);
        powerText.position.set(panelX + 245, panelY + 34);
        layer.addChild(powerText);

        tooltip.attach(portraitBox, {
            title: playerId,
            description: `${heroClass} hero.`,
            stats: ["Hero Die: 0-3", `Power: ${powerValue}`],
            accentColor: playerColor,
        });
    }
}
