import * as PIXI from "pixi.js";
import { AssetLoader } from "../../../assets/AssetLoader";
import type { HeroBoardHeaderContext, HeroBoardHeaderData } from "./HeroBoardTypes";

type HeaderContext = HeroBoardHeaderContext & HeroBoardHeaderData;

export class HeroBoardHeaderSection {
    render({ layer, panelX, panelY, playerColor, playerId, raceId }: HeaderContext): void {
        const portraitX = panelX + 22;
        const portraitY = panelY + 26;
        const portraitSize = 60;
        const portraitBox = new PIXI.Graphics();
        portraitBox.roundRect(portraitX, portraitY, portraitSize, portraitSize, 12);
        portraitBox.fill({ color: 0x0b1220 });
        portraitBox.stroke({ color: playerColor, width: 2, alpha: 0.6 });
        layer.addChild(portraitBox);

        const portraitTexture = raceId ? AssetLoader.getTexture(`hero-${raceId}`) : null;
        if (portraitTexture) {
            const heroSettings: Record<string, { scale: number; anchorY: number }> = {
                "bioform":  { scale: 1.0, anchorY: 0.30 },
                "chrono":   { scale: 2.5, anchorY: 0.15 },
                "forge":    { scale: 1.3, anchorY: 0.20 },
                "nomad":    { scale: 1.0, anchorY: 0.25 },
                "void":     { scale: 1.0, anchorY: 0.30 },
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
            style: new PIXI.TextStyle({ fontSize: 24, fill: playerColor, fontWeight: "900" }),
        });
        title.position.set(panelX + 92, panelY + 30);
        layer.addChild(title);

        const subtitle = new PIXI.Text({
            text: "Commander",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x8b949e, fontWeight: "600", letterSpacing: 1 }),
        });
        subtitle.position.set(panelX + 92, panelY + 54);
        layer.addChild(subtitle);
    }
}
