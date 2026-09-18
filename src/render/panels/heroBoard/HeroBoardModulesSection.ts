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
        RelicVault: "💎",
        BeaconSpire: "🗼",
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

    getSectionHeight(_builtCount: number): number {
        // Header (26) + 2 rows of grid slots + padding
        return 26 + 12 + 50 + 8 + 50 + 12; // 158px for 2 rows
    }

    render({ layer, panelX, panelW, y, builtModules, tooltip }: ModulesContext): number {
        const totalSlots = 8; // 2 rows x 4 columns

        // Section Header
        const headerHeight = 26;
        const headerBg = new PIXI.Graphics();
        headerBg.rect(panelX, y, panelW, headerHeight);
        headerBg.fill({ color: 0x000000, alpha: 0.2 });
        layer.addChild(headerBg);

        const headerBorder = new PIXI.Graphics();
        headerBorder.rect(panelX, y + headerHeight - 1, panelW, 1);
        headerBorder.fill({ color: 0x1a2a3a });
        layer.addChild(headerBorder);

        const modulesLabel = new PIXI.Text({
            text: "🏠 BASE MODULES",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x888888, letterSpacing: 1, fontWeight: "700" }),
        });
        modulesLabel.position.set(panelX + 16, y + 6);
        layer.addChild(modulesLabel);

        const modulesCountLabel = new PIXI.Text({
            text: `${builtModules.length}/${totalSlots}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x555555, fontWeight: "700" }),
        });
        modulesCountLabel.anchor.set(1, 0);
        modulesCountLabel.position.set(panelX + panelW - 16, y + 7);
        layer.addChild(modulesCountLabel);

        y += headerHeight;

        // Content area
        const contentHeight = this.getSectionHeight(builtModules.length) - headerHeight;
        const contentBg = new PIXI.Graphics();
        contentBg.rect(panelX, y, panelW, contentHeight);
        contentBg.fill({ color: 0x0a1015 });
        layer.addChild(contentBg);

        const bottomBorder = new PIXI.Graphics();
        bottomBorder.rect(panelX, y + contentHeight - 1, panelW, 1);
        bottomBorder.fill({ color: 0x1a2a3a });
        layer.addChild(bottomBorder);

        // Grid layout - 4 columns x 2 rows
        const padding = 16;
        const gap = 8;
        const columns = 4;
        const availableWidth = panelW - padding * 2;
        const slotSize = (availableWidth - gap * (columns - 1)) / columns;

        // Create slots array: built modules first, then empty slots
        const slots: (ModuleType | null)[] = [...builtModules];
        while (slots.length < totalSlots) {
            slots.push(null);
        }

        slots.forEach((moduleType, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const slotX = panelX + padding + col * (slotSize + gap);
            const slotY = y + 12 + row * (slotSize + gap);

            const slotContainer = new PIXI.Container();
            slotContainer.position.set(slotX, slotY);

            const slot = new PIXI.Graphics();
            if (moduleType) {
                // Filled slot
                slot.roundRect(0, 0, slotSize, slotSize, 10);
                slot.fill({ color: 0x4ade80, alpha: 0.15 });
                slot.stroke({ color: 0x4ade80, width: 2 });
            } else {
                // Empty slot
                slot.roundRect(0, 0, slotSize, slotSize, 10);
                slot.fill({ color: 0x000000, alpha: 0.3 });
                slot.stroke({ color: 0x2a3a4a, width: 2 });
            }
            slotContainer.addChild(slot);

            // Icon
            const icon = new PIXI.Text({
                text: moduleType ? (this.moduleIcons[moduleType] ?? "🏠") : "+",
                style: new PIXI.TextStyle({ 
                    fontSize: moduleType ? 20 : 18, 
                    fill: moduleType ? 0xffffff : 0x333333 
                }),
            });
            icon.anchor.set(0.5);
            icon.position.set(slotSize / 2, slotSize / 2);
            slotContainer.addChild(icon);

            // Prestige badge for filled slots
            if (moduleType) {
                const def = MODULES[moduleType];
                const prestigeValue = def.prestigeGain;
                const badgeText = `+${prestigeValue}⭐`;
                
                const badge = new PIXI.Text({
                    text: badgeText,
                    style: new PIXI.TextStyle({ fontSize: 9, fill: 0xffd700, fontWeight: "700" }),
                });
                const badgeWidth = badge.width + 10;
                const badgeBg = new PIXI.Graphics();
                badgeBg.roundRect(slotSize - badgeWidth + 6, -6, badgeWidth, 16, 4);
                badgeBg.fill({ color: 0x1a1a0a });
                badgeBg.stroke({ color: 0xffd700, width: 1 });
                slotContainer.addChild(badgeBg);
                badge.anchor.set(0.5);
                badge.position.set(slotSize - badgeWidth / 2 + 6, 2);
                slotContainer.addChild(badge);
            }

            layer.addChild(slotContainer);

            // Hover effect
            slotContainer.eventMode = "static";
            slotContainer.cursor = "pointer";
            const originalY = slotContainer.position.y;

            slotContainer.on("pointerover", () => {
                slotContainer.position.y = originalY - 2;
                slot.clear();
                if (moduleType) {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: 0x4ade80, alpha: 0.25 });
                    slot.stroke({ color: 0x6afe90, width: 2 });
                } else {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: 0x4ade80, alpha: 0.1 });
                    slot.stroke({ color: 0x4ade80, width: 2 });
                }
            });
            slotContainer.on("pointerout", () => {
                slotContainer.position.y = originalY;
                slot.clear();
                if (moduleType) {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: 0x4ade80, alpha: 0.15 });
                    slot.stroke({ color: 0x4ade80, width: 2 });
                } else {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: 0x000000, alpha: 0.3 });
                    slot.stroke({ color: 0x2a3a4a, width: 2 });
                }
            });

            // Tooltip
            if (moduleType) {
                const def = MODULES[moduleType];
                tooltip.attach(slotContainer, {
                    title: def.description,
                    description: def.effect,
                    stats: [this.getShortEffect(moduleType), `Prestige: +${def.prestigeGain}`],
                    accentColor: 0x4ade80,
                    icon: this.moduleIcons[moduleType] ?? "🏠",
                    itemType: "Base Module",
                });
            } else {
                tooltip.attach(slotContainer, {
                    title: "Empty Base Slot",
                    description: "Build base modules at your Base tile. Each module provides unique bonuses and Prestige.",
                    accentColor: 0x4ade80,
                    icon: "🏠",
                });
            }
        });

        return y + contentHeight;
    }

    private getShortEffect(type: ModuleType): string {
        switch (type) {
            case "AssaultBay": return "+1 ⚔ when roll ≥2⚔";
            case "ShieldArray": return "-1 💀, heal if 0💀";
            case "TacticalUplink": return "+1 move per turn";
            case "SupplyDepot": return "+1 resource per gather";
            case "RelicVault": return "Store extra items";
            case "BeaconSpire": return "See distant tiles";
            case "OrbitalHangar": return "Call orbital support";
            default: return "Base module effect";
        }
    }
}
