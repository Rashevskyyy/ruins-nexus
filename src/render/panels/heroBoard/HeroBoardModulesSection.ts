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
        const moduleRowHeight = 44;
        return 28 + moduleRows * moduleRowHeight + 8;
    }

    render({ layer, leftX, rightX, panelW, y, moduleOrder, builtModules }: ModulesContext): void {
        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(leftX - 2, y, panelW - 24, 22, 6);
        headerBg.fill({ color: 0x05080d, alpha: 0.6 });
        headerBg.stroke({ color: 0x1a2a3a, width: 1, alpha: 0.8 });
        layer.addChild(headerBg);

        const modulesLabel = new PIXI.Text({
            text: "🏠 Base Modules",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x94a3b8, letterSpacing: 1, fontWeight: "700" }),
        });
        modulesLabel.position.set(leftX + 6, y + 5);
        layer.addChild(modulesLabel);

        const modulesCountLabel = new PIXI.Text({
            text: `${builtModules.length}/${moduleOrder.length}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x00ddff, fontWeight: "700" }),
        });
        modulesCountLabel.anchor.set(1, 0);
        modulesCountLabel.position.set(rightX - 4, y + 5);
        layer.addChild(modulesCountLabel);

        y += 28;

        if (builtModules.length === 0) {
            const none = new PIXI.Text({
                text: "No modules built yet. Build at your Base.",
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e, fontWeight: "600" }),
            });
            none.position.set(leftX + 6, y + 6);
            layer.addChild(none);
            return;
        }

        const moduleRowHeight = 40;
        for (const type of builtModules) {
            const def = MODULES[type];
            const row = new PIXI.Graphics();
            row.roundRect(leftX, y, panelW - 28, moduleRowHeight, 6);
            row.fill({ color: 0x0b0f14, alpha: 0.6 });
            row.stroke({ color: 0x1a2a3a, width: 1, alpha: 0.6 });
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
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xf8fafc, fontWeight: "700" }),
            });
            name.position.set(leftX + 36, y + 6);
            layer.addChild(name);

            const effect = new PIXI.Text({
                text: def.effect,
                style: new PIXI.TextStyle({
                    fontSize: 10,
                    fill: 0x8b949e,
                    fontWeight: "600",
                    wordWrap: true,
                    wordWrapWidth: panelW - 90,
                }),
            });
            effect.position.set(leftX + 36, y + 22);
            layer.addChild(effect);

            const prestigeText = new PIXI.Text({
                text: `+${def.prestigeGain} ⭐`,
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffd700, fontWeight: "700" }),
            });
            prestigeText.anchor.set(1, 0.5);
            prestigeText.position.set(rightX - 8, y + moduleRowHeight / 2);
            layer.addChild(prestigeText);

            y += moduleRowHeight + 6;
        }
    }
}
