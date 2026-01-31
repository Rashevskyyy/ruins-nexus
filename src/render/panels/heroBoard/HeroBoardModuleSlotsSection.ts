import * as PIXI from "pixi.js";
import type { HeroBoardModuleSlotsContext, HeroBoardModuleSlotsData } from "./HeroBoardTypes";

type ModuleSlotsContext = HeroBoardModuleSlotsContext & HeroBoardModuleSlotsData;

type ModuleStyle = {
    type: "passive" | "active" | "consumable" | "empty";
    border: number;
    hoverBorder: number;
    fill: number;
    badge?: { text: string; bg: number; textColor: number };
};

export class HeroBoardModuleSlotsSection {
    getSectionHeight(_slotCount: number): number {
        return 100; // Header (26) + content with 4 slots in a row + padding
    }

    render({ layer, panelX, panelW, y, inventory, tooltip }: ModuleSlotsContext): number {
        const slotCount = 4;
        const filledCount = inventory.spells.filter(Boolean).length;

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

        const label = new PIXI.Text({
            text: "🔧 MODULES",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x888888, letterSpacing: 1, fontWeight: "700" }),
        });
        label.position.set(panelX + 16, y + 6);
        layer.addChild(label);

        const slotsText = new PIXI.Text({
            text: `${filledCount}/${slotCount}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x555555, fontWeight: "700" }),
        });
        slotsText.anchor.set(1, 0);
        slotsText.position.set(panelX + panelW - 16, y + 7);
        layer.addChild(slotsText);

        y += headerHeight;

        // Content area
        const contentHeight = 74;
        const contentBg = new PIXI.Graphics();
        contentBg.rect(panelX, y, panelW, contentHeight);
        contentBg.fill({ color: 0x0a1015 });
        layer.addChild(contentBg);

        const bottomBorder = new PIXI.Graphics();
        bottomBorder.rect(panelX, y + contentHeight - 1, panelW, 1);
        bottomBorder.fill({ color: 0x1a2a3a });
        layer.addChild(bottomBorder);

        // Grid layout for modules
        const padding = 16;
        const gap = 8;
        const availableWidth = panelW - padding * 2;
        const slotSize = (availableWidth - gap * 3) / 4;

        const slotItems = [...inventory.spells];
        while (slotItems.length < slotCount) slotItems.push(null);

        slotItems.slice(0, slotCount).forEach((item, index) => {
            const slotX = panelX + padding + index * (slotSize + gap);
            const slotY = y + 12;

            const slotContainer = new PIXI.Container();
            slotContainer.position.set(slotX, slotY);

            const style = this.getModuleStyle(item?.effectId ?? null);
            const slot = new PIXI.Graphics();
            
            if (item) {
                slot.roundRect(0, 0, slotSize, slotSize, 10);
                slot.fill({ color: style.fill, alpha: 0.15 });
                slot.stroke({ color: style.border, width: 2 });
            } else {
                slot.roundRect(0, 0, slotSize, slotSize, 10);
                slot.fill({ color: 0x000000, alpha: 0.3 });
                slot.stroke({ color: 0x2a3a4a, width: 2 });
            }
            slotContainer.addChild(slot);

            // Icon
            const icon = new PIXI.Text({
                text: item ? item.emoji : "+",
                style: new PIXI.TextStyle({ fontSize: item ? 20 : 18, fill: item ? 0xffffff : 0x333333 }),
            });
            icon.anchor.set(0.5);
            icon.position.set(slotSize / 2, slotSize / 2);
            slotContainer.addChild(icon);

            // Status badge
            if (style.badge) {
                const badgeSize = 16;
                const badgeBg = new PIXI.Graphics();
                badgeBg.circle(slotSize - 5, 5, badgeSize / 2);
                badgeBg.fill({ color: style.badge.bg });
                slotContainer.addChild(badgeBg);

                const badgeText = new PIXI.Text({
                    text: style.badge.text,
                    style: new PIXI.TextStyle({ fontSize: 9, fill: style.badge.textColor, fontWeight: "700" }),
                });
                badgeText.anchor.set(0.5);
                badgeText.position.set(slotSize - 5, 5);
                slotContainer.addChild(badgeText);
            }

            layer.addChild(slotContainer);

            // Hover effect
            slotContainer.eventMode = "static";
            slotContainer.cursor = "pointer";
            const originalY = slotContainer.position.y;

            slotContainer.on("pointerover", () => {
                slotContainer.position.y = originalY - 2;
                slot.clear();
                if (item) {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: style.fill, alpha: 0.25 });
                    slot.stroke({ color: style.hoverBorder, width: 2 });
                } else {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: 0x00aaff, alpha: 0.1 });
                    slot.stroke({ color: 0x00aaff, width: 2 });
                }
            });
            slotContainer.on("pointerout", () => {
                slotContainer.position.y = originalY;
                slot.clear();
                if (item) {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: style.fill, alpha: 0.15 });
                    slot.stroke({ color: style.border, width: 2 });
                } else {
                    slot.roundRect(0, 0, slotSize, slotSize, 10);
                    slot.fill({ color: 0x000000, alpha: 0.3 });
                    slot.stroke({ color: 0x2a3a4a, width: 2 });
                }
            });

            // Tooltip
            const moduleType = this.getModuleTypeName(item?.effectId ?? null);
            tooltip.attach(slotContainer, {
                title: item ? item.name : "Empty Module Slot",
                description: item?.effectId 
                    ? this.getModuleDesc(item.effectId) 
                    : "Craft modules at the Hub to fill this slot. Modules provide powerful passive or active abilities.",
                stats: item?.effectId ? this.getModuleStats(item.effectId) : undefined,
                accentColor: style.border,
                icon: item?.emoji ?? "🔧",
                itemType: moduleType,
            });
        });

        return y + contentHeight;
    }

    private getModuleStyle(effectId: string | null): ModuleStyle {
        switch (effectId) {
            case "reroll_module":
                return { 
                    type: "passive", 
                    border: 0x00aaff, 
                    hoverBorder: 0x00ccff,
                    fill: 0x00aaff, 
                    badge: { text: "✓", bg: 0x00ff88, textColor: 0x000000 } 
                };
            case "shield_matrix":
                return { 
                    type: "passive", 
                    border: 0x00aaff, 
                    hoverBorder: 0x00ccff,
                    fill: 0x00aaff, 
                    badge: { text: "✓", bg: 0x00ff88, textColor: 0x000000 } 
                };
            case "overdrive":
                return { 
                    type: "active", 
                    border: 0xffaa00, 
                    hoverBorder: 0xffcc00,
                    fill: 0xffaa00, 
                    badge: { text: "1", bg: 0xff4444, textColor: 0xffffff } 
                };
            case "emergency_repair":
                return { 
                    type: "consumable", 
                    border: 0x00ff88, 
                    hoverBorder: 0x00ffaa,
                    fill: 0x00ff88, 
                    badge: { text: "1", bg: 0x333333, textColor: 0x00ff88 } 
                };
            case "escape_pod":
                return { 
                    type: "consumable", 
                    border: 0x00ff88, 
                    hoverBorder: 0x00ffaa,
                    fill: 0x00ff88, 
                    badge: { text: "1", bg: 0x333333, textColor: 0x00ff88 } 
                };
            default:
                return { 
                    type: "empty", 
                    border: 0x2a3a4a, 
                    hoverBorder: 0x00aaff,
                    fill: 0x0b0f14 
                };
        }
    }

    private getModuleTypeName(effectId: string | null): string {
        switch (effectId) {
            case "reroll_module":
            case "shield_matrix":
                return "Passive";
            case "overdrive":
                return "Active";
            case "emergency_repair":
            case "escape_pod":
                return "Consumable";
            default:
                return "";
        }
    }

    private getModuleDesc(effectId: string): string {
        switch (effectId) {
            case "reroll_module": return "Quantum probability manipulator. Get a second chance when you roll poorly.";
            case "shield_matrix": return "Defensive energy barrier. Reduces incoming damage.";
            case "overdrive": return "Weapon power amplifier. Double your weapon damage for one fight.";
            case "emergency_repair": return "Emergency nanobots. Instant heal when you need it most.";
            case "escape_pod": return "Emergency escape system. Flee combat safely when outmatched.";
            default: return "Module ability.";
        }
    }

    private getModuleStats(effectId: string): string[] {
        switch (effectId) {
            case "reroll_module":
                return ["1 reroll per combat", "Triggers on 0⚔ roll", "Always active"];
            case "shield_matrix":
                return ["-1 💀 damage taken", "Always active"];
            case "overdrive":
                return ["Double weapon ⚔", "This combat only", "1 use per round"];
            case "emergency_repair":
                return ["+2 HP instantly", "1 use per game"];
            case "escape_pod":
                return ["Flee combat safely", "1 use per game"];
            default:
                return [];
        }
    }
}
