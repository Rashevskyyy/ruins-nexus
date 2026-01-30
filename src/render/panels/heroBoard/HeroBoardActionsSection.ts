import * as PIXI from "pixi.js";
import type { HeroBoardActionsContext, HeroBoardActionsData } from "./HeroBoardTypes";

type ActionsContext = HeroBoardActionsContext & HeroBoardActionsData;

export class HeroBoardActionsSection {
    getSectionHeight(): number {
        return 48;
    }

    render({ layer, leftX, panelW, y, canCraft, canBuild }: ActionsContext): void {
        const buttonW = (panelW - 28 - 8) / 2;
        const buttonH = 32;

        const craft = new PIXI.Graphics();
        craft.roundRect(leftX, y, buttonW, buttonH, 8);
        craft.fill({ color: canCraft ? 0x1a3a5a : 0x0f172a, alpha: 0.8 });
        craft.stroke({ color: 0x00aaff, width: 1, alpha: canCraft ? 0.8 : 0.3 });
        layer.addChild(craft);

        const craftText = new PIXI.Text({
            text: "⚒️ Craft",
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: canCraft ? 0x00ddff : 0x4b5563,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        craftText.anchor.set(0.5);
        craftText.position.set(leftX + buttonW / 2, y + buttonH / 2 + 1);
        layer.addChild(craftText);

        const buildX = leftX + buttonW + 8;
        const build = new PIXI.Graphics();
        build.roundRect(buildX, y, buttonW, buttonH, 8);
        build.fill({ color: canBuild ? 0x1a3a2a : 0x0f172a, alpha: 0.8 });
        build.stroke({ color: 0x4ade80, width: 1, alpha: canBuild ? 0.8 : 0.3 });
        layer.addChild(build);

        const buildText = new PIXI.Text({
            text: "🏗️ Build",
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: canBuild ? 0x4ade80 : 0x4b5563,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        buildText.anchor.set(0.5);
        buildText.position.set(buildX + buttonW / 2, y + buttonH / 2 + 1);
        layer.addChild(buildText);
    }
}
