import * as PIXI from "pixi.js";
import type { HeroBoardEquipmentContext, HeroBoardEquipmentData } from "./HeroBoardTypes";

type EquipmentContext = HeroBoardEquipmentContext & HeroBoardEquipmentData;

export class HeroBoardEquipmentSection {
    getSectionHeight(): number {
        return 110;
    }

    render({ layer, panelX, panelW, y, inventory, totalSlots, tooltip }: EquipmentContext): number {
        const weaponsCount = inventory.weapons.filter((w) => w !== null).length;
        const hasAmulet = inventory.amulet !== null;
        const totalEquip = weaponsCount + (hasAmulet ? 1 : 0);

        // Section Header
        const headerHeight = 26;
        const headerBg = new PIXI.Graphics();
        headerBg.rect(panelX, y, panelW, headerHeight);
        headerBg.fill({ color: 0x000000, alpha: 0.2 });
        layer.addChild(headerBg);

        // Header bottom border
        const headerBorder = new PIXI.Graphics();
        headerBorder.rect(panelX, y + headerHeight - 1, panelW, 1);
        headerBorder.fill({ color: 0x1a2a3a });
        layer.addChild(headerBorder);

        const equipLabel = new PIXI.Text({
            text: "⚔️ EQUIPMENT",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x888888, letterSpacing: 1, fontWeight: "700" }),
        });
        equipLabel.position.set(panelX + 16, y + 6);
        layer.addChild(equipLabel);

        const slotsText = new PIXI.Text({
            text: `${totalEquip}/${totalSlots}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x555555, fontWeight: "700" }),
        });
        slotsText.anchor.set(1, 0);
        slotsText.position.set(panelX + panelW - 16, y + 7);
        // Color the filled count
        const filledCountText = new PIXI.Text({
            text: `${totalEquip}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x00ddff, fontWeight: "700" }),
        });
        filledCountText.anchor.set(1, 0);
        filledCountText.position.set(panelX + panelW - 16 - slotsText.width + filledCountText.width, y + 7);
        layer.addChild(slotsText);

        y += headerHeight;

        // Equipment content area
        const contentHeight = 84;
        const contentBg = new PIXI.Graphics();
        contentBg.rect(panelX, y, panelW, contentHeight);
        contentBg.fill({ color: 0x0a1015 });
        layer.addChild(contentBg);

        // Bottom border
        const bottomBorder = new PIXI.Graphics();
        bottomBorder.rect(panelX, y + contentHeight - 1, panelW, 1);
        bottomBorder.fill({ color: 0x1a2a3a });
        layer.addChild(bottomBorder);

        const slotSize = 50;
        const slotGap = 6;
        const leftPadding = 16;

        // Weapons group
        const weaponLabelY = y + 8;
        const weaponLabel = new PIXI.Text({
            text: "🗡️ WEAPONS (2)",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x555555, fontWeight: "700", letterSpacing: 0.5 }),
        });
        weaponLabel.position.set(panelX + leftPadding, weaponLabelY);
        layer.addChild(weaponLabel);

        const weaponSlots = inventory.weapons.slice(0, 2);
        weaponSlots.forEach((item, index) => {
            const slotX = panelX + leftPadding + index * (slotSize + slotGap);
            const slotY = weaponLabelY + 18;
            this.renderEquipSlot(layer, slotX, slotY, slotSize, item, "weapon", tooltip);
        });

        // Amulet group
        const amuletLabelX = panelX + leftPadding + 2 * (slotSize + slotGap) + 12;
        const amuletLabel = new PIXI.Text({
            text: "💎 AMULET (1)",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x555555, fontWeight: "700", letterSpacing: 0.5 }),
        });
        amuletLabel.position.set(amuletLabelX, weaponLabelY);
        layer.addChild(amuletLabel);

        this.renderEquipSlot(layer, amuletLabelX, weaponLabelY + 18, slotSize, inventory.amulet, "amulet", tooltip);

        return y + contentHeight;
    }

    private renderEquipSlot(
        layer: PIXI.Container,
        x: number,
        y: number,
        size: number,
        item: { emoji: string; name: string; effectId?: string } | null,
        type: "weapon" | "amulet",
        tooltip: EquipmentContext["tooltip"]
    ): void {
        const slotContainer = new PIXI.Container();
        slotContainer.position.set(x, y);

        const colors = {
            weapon: { border: 0xff6666, hoverBorder: 0xff8888, fill: 0xff4444 },
            amulet: { border: 0xcc66ff, hoverBorder: 0xdd88ff, fill: 0xcc66ff },
        };
        const color = colors[type];

        const slot = new PIXI.Graphics();
        if (item) {
            slot.roundRect(0, 0, size, size, 10);
            slot.fill({ color: color.fill, alpha: 0.15 });
            slot.stroke({ color: color.border, width: 2 });
        } else {
            slot.roundRect(0, 0, size, size, 10);
            slot.fill({ color: 0x000000, alpha: 0.3 });
            slot.stroke({ color: 0x2a3a4a, width: 2 });
        }
        slotContainer.addChild(slot);

        // Icon
        const icon = new PIXI.Text({
            text: item ? item.emoji : "+",
            style: new PIXI.TextStyle({ fontSize: item ? 22 : 18, fill: item ? 0xffffff : 0x333333 }),
        });
        icon.anchor.set(0.5);
        icon.position.set(size / 2, item ? size / 2 - 6 : size / 2);
        slotContainer.addChild(icon);

        // Item name
        if (item) {
            const name = new PIXI.Text({
                text: item.name.split(" ")[0],
                style: new PIXI.TextStyle({ fontSize: 9, fill: 0x888888, fontWeight: "600" }),
            });
            name.anchor.set(0.5);
            name.position.set(size / 2, size - 8);
            slotContainer.addChild(name);

            // Bonus badge for weapons
            if (type === "weapon") {
                const bonusText = this.getWeaponBonus(item.effectId ?? "");
                const badgeBg = new PIXI.Graphics();
                const badge = new PIXI.Text({
                    text: bonusText,
                    style: new PIXI.TextStyle({ fontSize: 9, fill: 0x00ff88, fontWeight: "700" }),
                });
                const badgeWidth = badge.width + 10;
                badgeBg.roundRect(size - badgeWidth + 6, -6, badgeWidth, 16, 4);
                badgeBg.fill({ color: 0x1a2a1a });
                badgeBg.stroke({ color: 0x00ff88, width: 1 });
                slotContainer.addChild(badgeBg);
                badge.anchor.set(0.5);
                badge.position.set(size - badgeWidth / 2 + 6, 2);
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
            if (item) {
                slot.roundRect(0, 0, size, size, 10);
                slot.fill({ color: color.fill, alpha: 0.25 });
                slot.stroke({ color: color.hoverBorder, width: 2 });
            } else {
                slot.roundRect(0, 0, size, size, 10);
                slot.fill({ color: 0x00aaff, alpha: 0.1 });
                slot.stroke({ color: 0x00aaff, width: 2 });
            }
        });
        slotContainer.on("pointerout", () => {
            slotContainer.position.y = originalY;
            slot.clear();
            if (item) {
                slot.roundRect(0, 0, size, size, 10);
                slot.fill({ color: color.fill, alpha: 0.15 });
                slot.stroke({ color: color.border, width: 2 });
            } else {
                slot.roundRect(0, 0, size, size, 10);
                slot.fill({ color: 0x000000, alpha: 0.3 });
                slot.stroke({ color: 0x2a3a4a, width: 2 });
            }
        });

        // Tooltip
        const tooltipData = item
            ? {
                title: item.name,
                description: this.getItemDescription(item.effectId ?? "", type),
                stats: this.getItemStats(item.effectId ?? "", type),
                accentColor: color.border,
                icon: item.emoji,
                itemType: type === "weapon" ? "Weapon" : "Amulet",
            }
            : {
                title: `Empty ${type === "weapon" ? "Weapon" : "Amulet"} Slot`,
                description: type === "weapon" 
                    ? "Craft weapons at the Hub to fill this slot. Weapons provide combat bonuses."
                    : "Find amulets in special locations. Amulets provide powerful bonuses.",
                accentColor: color.border,
                icon: type === "weapon" ? "⚔️" : "💎",
            };

        tooltip.attach(slotContainer, tooltipData);
    }

    private getWeaponBonus(effectId: string): string {
        switch (effectId) {
            case "blaster_core": return "+1⚔";
            case "shock_blade": return "+1⚔";
            case "plasma_edge": return "+2⚔";
            case "heavy_cannon": return "+3⚔";
            case "arc_rifle": return "+1-3⚔";
            case "void_launcher": return "+2⚔";
            default: return "+1⚔";
        }
    }

    private getItemDescription(effectId: string, type: "weapon" | "amulet"): string {
        if (type === "amulet") {
            return "Ancient artifact of immense power. The most versatile amulet.";
        }
        switch (effectId) {
            case "blaster_core": return "Standard issue energy weapon. Reliable but basic.";
            case "shock_blade": return "Electrified melee weapon. Clean kills prevent damage.";
            case "plasma_edge": return "High-powered plasma weapon. Devastating damage.";
            case "heavy_cannon": return "Massive damage cannon. Slow but deadly.";
            case "arc_rifle": return "Movement-powered rifle. Damage scales with mobility.";
            case "void_launcher": return "Void energy weapon. Deals extra void damage.";
            default: return "Combat weapon.";
        }
    }

    private getItemStats(effectId: string, type: "weapon" | "amulet"): string[] {
        if (type === "amulet") {
            return ["+1 ⚔ in combat", "-1 💀 damage taken", "Build-defining item"];
        }
        switch (effectId) {
            case "blaster_core": return ["+1 ⚔ to all combat", "No special effects"];
            case "shock_blade": return ["+1 ⚔ to all combat", "No 💀 damage on victory"];
            case "plasma_edge": return ["+2 ⚔ to all combat", "High damage"];
            case "heavy_cannon": return ["+3 ⚔ to all combat", "Maximum damage"];
            case "arc_rifle": return ["+1 ⚔ per tile moved", "Max +3 bonus"];
            case "void_launcher": return ["+2 ⚔ to all combat", "Void damage"];
            default: return ["+1 ⚔"];
        }
    }
}
