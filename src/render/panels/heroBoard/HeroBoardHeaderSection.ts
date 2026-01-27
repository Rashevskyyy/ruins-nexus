import * as PIXI from "pixi.js";
import type { HeroBoardHeaderContext, HeroBoardHeaderData } from "./HeroBoardTypes";

type HeaderContext = HeroBoardHeaderContext & HeroBoardHeaderData;

export class HeroBoardHeaderSection {
    render({ layer, panelX, panelY, panelW, headerHeight, playerColor, playerId }: HeaderContext): void {
        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(panelX + 12, panelY + 10, panelW - 24, headerHeight - 16, 10);
        headerBg.fill({ color: 0x111827, alpha: 0 });
        headerBg.stroke({ color: playerColor, width: 1, alpha: 0.25 });
        layer.addChild(headerBg);

        const portraitBox = new PIXI.Graphics();
        portraitBox.roundRect(panelX + 22, panelY + 26, 60, 60, 12);
        portraitBox.fill({ color: 0x0b1220 });
        portraitBox.stroke({ color: playerColor, width: 2, alpha: 0.6 });
        layer.addChild(portraitBox);

        const portraitHint = new PIXI.Text({
            text: "HERO",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e, fontWeight: "700", letterSpacing: 1 }),
        });
        portraitHint.anchor.set(0.5);
        portraitHint.position.set(panelX + 52, panelY + 56);
        layer.addChild(portraitHint);

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
