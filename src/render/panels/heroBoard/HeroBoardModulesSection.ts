import * as PIXI from "pixi.js";
import { MODULES, type ModuleType } from "../../../entities/BuildingType";
import type { HeroBoardModulesContext, HeroBoardModulesData } from "./HeroBoardTypes";

type ModulesContext = HeroBoardModulesContext & HeroBoardModulesData;

export class HeroBoardModulesSection {
    private readonly moduleIcons: Record<ModuleType, string> = {
        AssaultBay: "⚔️",
        ShieldArray: "🛡️",
        TacticalUplink: "📡",
        SupplyDepot: "📦",
        RelicVault: "🔮",
        BeaconSpire: "🛰️",
        OrbitalHangar: "🚀",
    };

    getModuleState(playerModules: ModuleType[]): { moduleOrder: ModuleType[]; builtModules: ModuleType[] } {
        const moduleOrder: ModuleType[] = [
            "AssaultBay",
            "ShieldArray",
            "TacticalUplink",
            "SupplyDepot",
            "RelicVault",
            "BeaconSpire",
            "OrbitalHangar",
        ];
        const builtModules = moduleOrder.filter((type) => playerModules.includes(type));
        return { moduleOrder, builtModules };
    }

    getSectionHeight(builtCount: number): number {
        const moduleRows = Math.max(1, builtCount);
        const moduleRowHeight = 42;
        return 22 + moduleRows * moduleRowHeight + 6;
    }

    render({ layer, leftX, rightX, panelW, y, moduleOrder, builtModules }: ModulesContext): void {
        const modulesLabel = new PIXI.Text({
            text: "🏠 BASE MODULES",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffaa00, letterSpacing: 1, fontWeight: "600" }),
        });
        modulesLabel.position.set(leftX, y);
        layer.addChild(modulesLabel);

        const modulesCountLabel = new PIXI.Text({
            text: `${builtModules.length}/${moduleOrder.length} BUILT`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e, fontWeight: "700" }),
        });
        modulesCountLabel.anchor.set(1, 0);
        modulesCountLabel.position.set(rightX, y + 1);
        layer.addChild(modulesCountLabel);

        y += 18;

        if (builtModules.length === 0) {
            const none = new PIXI.Text({
                text: "No modules built yet. Build at your Base.",
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e, fontWeight: "600" }),
            });
            none.position.set(leftX + 6, y + 6);
            layer.addChild(none);
            return;
        }

        const moduleRowHeight = 36;
        for (const type of builtModules) {
            const def = MODULES[type];
            const row = new PIXI.Graphics();
            row.roundRect(leftX, y, panelW - 28, moduleRowHeight, 6);
            row.fill({ color: 0x111827, alpha: 0 });
            row.stroke({ color: 0xffaa00, width: 1, alpha: 0.35 });
            layer.addChild(row);

            const icon = new PIXI.Text({
                text: this.moduleIcons[type] ?? "🏠",
                style: new PIXI.TextStyle({ fontSize: 20 }),
            });
            icon.anchor.set(0.5);
            icon.position.set(leftX + 16, y + moduleRowHeight / 2);
            layer.addChild(icon);

            const name = new PIXI.Text({
                text: def.description,
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffe8b0, fontWeight: "700" }),
            });
            name.position.set(leftX + 32, y + 4);
            layer.addChild(name);

            const effect = new PIXI.Text({
                text: def.effect,
                style: new PIXI.TextStyle({
                    fontSize: 10,
                    fill: 0x8b949e,
                    fontWeight: "600",
                    wordWrap: true,
                    wordWrapWidth: panelW - 70,
                }),
            });
            effect.position.set(leftX + 32, y + 18);
            layer.addChild(effect);

            y += moduleRowHeight + 4;
        }
    }
}
