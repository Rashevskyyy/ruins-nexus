import * as PIXI from "pixi.js";
import type { HeroBoardUnitsContext, HeroBoardUnitsData } from "./HeroBoardTypes";

type UnitsContext = HeroBoardUnitsContext & HeroBoardUnitsData;

export class HeroBoardUnitsSection {
    getSectionHeight(): number {
        return 100; // Header (26) + content with 2 unit slots + padding
    }

    render({ layer, panelX, panelW, y, units, tooltip }: UnitsContext): number {
        const filledCount = units.filter((u) => u !== null).length;
        const totalSlots = 2;

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
            text: "🤖 COMBAT UNITS",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x888888, letterSpacing: 1, fontWeight: "700" }),
        });
        label.position.set(panelX + 16, y + 6);
        layer.addChild(label);

        const slotsText = new PIXI.Text({
            text: `${filledCount}/${totalSlots}`,
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

        // Unit slots grid (2 columns)
        const padding = 16;
        const gap = 8;
        const availableWidth = panelW - padding * 2;
        const slotWidth = (availableWidth - gap) / 2;
        const slotHeight = 54;

        for (let i = 0; i < totalSlots; i++) {
            const unit = units[i] ?? null;
            const slotX = panelX + padding + i * (slotWidth + gap);
            const slotY = y + 10;

            const slotContainer = new PIXI.Container();
            slotContainer.position.set(slotX, slotY);

            const slot = new PIXI.Graphics();
            if (unit) {
                slot.roundRect(0, 0, slotWidth, slotHeight, 10);
                slot.fill({ color: 0xff6b6b, alpha: 0.15 });
                slot.stroke({ color: 0xff6b6b, width: 2 });
            } else {
                slot.roundRect(0, 0, slotWidth, slotHeight, 10);
                slot.fill({ color: 0x000000, alpha: 0.3 });
                slot.stroke({ color: 0x2a3a4a, width: 2 });
            }
            slotContainer.addChild(slot);

            // Icon
            const icon = new PIXI.Text({
                text: unit ? unit.emoji : "+",
                style: new PIXI.TextStyle({ fontSize: unit ? 20 : 18, fill: unit ? 0xffffff : 0x333333 }),
            });
            icon.anchor.set(0.5);
            icon.position.set(slotWidth / 2, unit ? slotHeight / 2 - 8 : slotHeight / 2);
            slotContainer.addChild(icon);

            // Name
            if (unit) {
                const name = new PIXI.Text({
                    text: unit.name.split(" ")[0],
                    style: new PIXI.TextStyle({ fontSize: 10, fill: 0x888888, fontWeight: "600" }),
                });
                name.anchor.set(0.5);
                name.position.set(slotWidth / 2, slotHeight - 10);
                slotContainer.addChild(name);

                // Bonus badge
                if (unit.type === "assault") {
                    const badgeText = "+1⚔";
                    const badge = new PIXI.Text({
                        text: badgeText,
                        style: new PIXI.TextStyle({ fontSize: 9, fill: 0x00ff88, fontWeight: "700" }),
                    });
                    const badgeWidth = badge.width + 10;
                    const badgeBg = new PIXI.Graphics();
                    badgeBg.roundRect(slotWidth - badgeWidth + 6, -6, badgeWidth, 16, 4);
                    badgeBg.fill({ color: 0x1a2a1a });
                    badgeBg.stroke({ color: 0x00ff88, width: 1 });
                    slotContainer.addChild(badgeBg);
                    badge.anchor.set(0.5);
                    badge.position.set(slotWidth - badgeWidth / 2 + 6, 2);
                    slotContainer.addChild(badge);
                }
            }

            layer.addChild(slotContainer);

            // Hover effect
            slotContainer.eventMode = "static";
            slotContainer.cursor = "pointer";
            const originalY = slotContainer.position.y;

            slotContainer.on("pointerover", () => {
                slotContainer.position.y = originalY - 2;
                slot.clear();
                if (unit) {
                    slot.roundRect(0, 0, slotWidth, slotHeight, 10);
                    slot.fill({ color: 0xff6b6b, alpha: 0.25 });
                    slot.stroke({ color: 0xff8888, width: 2 });
                } else {
                    slot.roundRect(0, 0, slotWidth, slotHeight, 10);
                    slot.fill({ color: 0xff6b6b, alpha: 0.1 });
                    slot.stroke({ color: 0xff6b6b, width: 2 });
                }
            });
            slotContainer.on("pointerout", () => {
                slotContainer.position.y = originalY;
                slot.clear();
                if (unit) {
                    slot.roundRect(0, 0, slotWidth, slotHeight, 10);
                    slot.fill({ color: 0xff6b6b, alpha: 0.15 });
                    slot.stroke({ color: 0xff6b6b, width: 2 });
                } else {
                    slot.roundRect(0, 0, slotWidth, slotHeight, 10);
                    slot.fill({ color: 0x000000, alpha: 0.3 });
                    slot.stroke({ color: 0x2a3a4a, width: 2 });
                }
            });

            // Tooltip
            const tooltipData = unit
                ? {
                    title: unit.name,
                    description: this.getUnitDescription(unit.type),
                    stats: this.getUnitStats(unit.type),
                    accentColor: 0xff6b6b,
                    icon: unit.emoji,
                    itemType: "Unit",
                }
                : {
                    title: "Empty Unit Slot",
                    description: "Hire combat units at the Hub. Units provide permanent or temporary combat bonuses.",
                    accentColor: 0xff6b6b,
                    icon: "🤖",
                };

            tooltip.attach(slotContainer, tooltipData);
        }

        return y + contentHeight;
    }

    private getUnitDescription(type: string): string {
        switch (type) {
            case "assault":
                return "Combat support drone. Provides consistent damage boost in every fight.";
            case "defensive":
                return "Shield support drone. Reduces incoming damage.";
            case "scout":
                return "Reconnaissance drone. Reveals nearby tiles.";
            default:
                return "Combat support unit.";
        }
    }

    private getUnitStats(type: string): string[] {
        switch (type) {
            case "assault":
                return ["+1 ⚔ in all combat", "Permanent until destroyed", "Hired at Hub"];
            case "defensive":
                return ["-1 💀 damage taken", "Permanent until destroyed", "Hired at Hub"];
            case "scout":
                return ["Reveal 2 tiles", "Permanent until destroyed", "Hired at Hub"];
            default:
                return ["Combat bonus"];
        }
    }
}
