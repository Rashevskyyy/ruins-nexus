import * as PIXI from "pixi.js";
import type { HeroBoardModuleSlotsContext, HeroBoardModuleSlotsData } from "./HeroBoardTypes";

type ModuleSlotsContext = HeroBoardModuleSlotsContext & HeroBoardModuleSlotsData;

type ModuleStyle = {
    border: number;
    fill: number;
    badge?: string;
    badgeColor?: number;
};

export class HeroBoardModuleSlotsSection {
    getSectionHeight(slotCount: number): number {
        const rows = Math.ceil(Math.max(slotCount, 4) / 4);
        return 24 + rows * 58 + 6;
    }

    render({ layer, leftX, rightX, panelW, y, inventory }: ModuleSlotsContext): number {
        const slotCount = 4;
        const filledCount = inventory.spells.filter(Boolean).length;

        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(leftX - 2, y, panelW - 24, 22, 6);
        headerBg.fill({ color: 0x05080d, alpha: 0.6 });
        headerBg.stroke({ color: 0x1a2a3a, width: 1, alpha: 0.8 });
        layer.addChild(headerBg);

        const label = new PIXI.Text({
            text: "🔧 Modules",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x94a3b8, letterSpacing: 1, fontWeight: "700" }),
        });
        label.position.set(leftX + 6, y + 5);
        layer.addChild(label);

        const slotsText = new PIXI.Text({
            text: `${filledCount}/${slotCount}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x00ddff, fontWeight: "700" }),
        });
        slotsText.anchor.set(1, 0);
        slotsText.position.set(rightX - 4, y + 5);
        layer.addChild(slotsText);

        y += 28;

        const gridW = panelW - 28;
        const slotSize = 50;
        const gap = 8;
        const columns = 4;
        const startX = leftX + (gridW - (columns * slotSize + (columns - 1) * gap)) / 2;

        const slotItems = [...inventory.spells];
        while (slotItems.length < slotCount) slotItems.push(null);

        slotItems.slice(0, slotCount).forEach((item, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const slotX = startX + col * (slotSize + gap);
            const slotY = y + row * (slotSize + gap);

            const style = this.getModuleStyle(item?.effectId ?? null);
            const slot = new PIXI.Graphics();
            slot.roundRect(slotX, slotY, slotSize, slotSize, 10);
            slot.fill({ color: style.fill, alpha: item ? 0.75 : 0.3 });
            slot.stroke({ color: style.border, width: item ? 2 : 1, alpha: item ? 0.8 : 0.3 });
            layer.addChild(slot);

            const icon = new PIXI.Text({
                text: item ? item.emoji : "+",
                style: new PIXI.TextStyle({ fontSize: item ? 20 : 18, fill: item ? 0xffffff : 0x30363d }),
            });
            icon.anchor.set(0.5);
            icon.position.set(slotX + slotSize / 2, slotY + 26);
            layer.addChild(icon);

            if (style.badge) {
                const badge = new PIXI.Graphics();
                badge.circle(slotX + slotSize - 6, slotY + 6, 7);
                badge.fill({ color: style.badgeColor ?? 0x00ff88 });
                layer.addChild(badge);

                const badgeText = new PIXI.Text({
                    text: style.badge,
                    style: new PIXI.TextStyle({ fontSize: 8, fill: 0x000000, fontWeight: "700" }),
                });
                badgeText.anchor.set(0.5);
                badgeText.position.set(slotX + slotSize - 6, slotY + 6);
                layer.addChild(badgeText);
            }
        });

        return y + slotSize + 10;
    }

    private getModuleStyle(effectId: string | null): ModuleStyle {
        switch (effectId) {
            case "reroll_module":
                return { border: 0x00aaff, fill: 0x0b1a2e, badge: "✓", badgeColor: 0x00ff88 };
            case "shield_matrix":
                return { border: 0x00aaff, fill: 0x0b1a2e, badge: "✓", badgeColor: 0x00ff88 };
            case "overdrive":
                return { border: 0xffaa00, fill: 0x2a1a0a, badge: "1", badgeColor: 0xff4444 };
            case "emergency_repair":
                return { border: 0x00ff88, fill: 0x0a1f16, badge: "1", badgeColor: 0x00ff88 };
            case "escape_pod":
                return { border: 0x00ff88, fill: 0x0a1f16, badge: "1", badgeColor: 0x00ff88 };
            default:
                return { border: 0x2a3a4a, fill: 0x0b0f14 };
        }
    }
}
