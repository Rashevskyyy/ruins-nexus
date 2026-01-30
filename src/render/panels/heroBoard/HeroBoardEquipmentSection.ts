import * as PIXI from "pixi.js";
import type { HeroBoardEquipmentContext, HeroBoardEquipmentData } from "./HeroBoardTypes";

type EquipmentContext = HeroBoardEquipmentContext & HeroBoardEquipmentData;

export class HeroBoardEquipmentSection {
    getSectionHeight(): number {
        return 104;
    }

    render({ layer, leftX, rightX, panelW, y, inventory, totalSlots }: EquipmentContext): number {
        const weaponsCount = inventory.weapons.filter((w) => w !== null).length;
        const hasAmulet = inventory.amulet !== null;
        const totalEquip = weaponsCount + (hasAmulet ? 1 : 0);

        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(leftX - 2, y, panelW - 24, 22, 6);
        headerBg.fill({ color: 0x05080d, alpha: 0.6 });
        headerBg.stroke({ color: 0x1a2a3a, width: 1, alpha: 0.8 });
        layer.addChild(headerBg);

        const equipLabel = new PIXI.Text({
            text: "⚔️ Equipment",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x94a3b8, letterSpacing: 1, fontWeight: "700" }),
        });
        equipLabel.position.set(leftX + 6, y + 5);
        layer.addChild(equipLabel);

        const slotsText = new PIXI.Text({
            text: `${totalEquip}/${totalSlots}`,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x00ddff, fontWeight: "700" }),
        });
        slotsText.anchor.set(1, 0);
        slotsText.position.set(rightX - 4, y + 5);
        layer.addChild(slotsText);

        y += 30;

        const slotSize = 50;
        const gap = 10;
        const columnX = leftX + 6;

        const weaponSlots = inventory.weapons.slice(0, 2);
        weaponSlots.forEach((item, index) => {
            const slotX = columnX + index * (slotSize + 8);
            const slotY = y + 18;
            const filled = Boolean(item);

            const slot = new PIXI.Graphics();
            slot.roundRect(slotX, slotY, slotSize, slotSize, 10);
            slot.fill({ color: filled ? 0x1a1111 : 0x0b0f14, alpha: 0.6 });
            slot.stroke({ color: 0xff6666, width: filled ? 2 : 1, alpha: filled ? 0.8 : 0.3 });
            layer.addChild(slot);

            const icon = new PIXI.Text({
                text: item ? item.emoji : "+",
                style: new PIXI.TextStyle({ fontSize: item ? 22 : 18, fill: item ? 0xffffff : 0x30363d }),
            });
            icon.anchor.set(0.5);
            icon.position.set(slotX + slotSize / 2, slotY + 24);
            layer.addChild(icon);

            if (item) {
                const name = new PIXI.Text({
                    text: item.name,
                    style: new PIXI.TextStyle({ fontSize: 8, fill: 0x94a3b8, fontWeight: "600" }),
                });
                name.anchor.set(0.5);
                name.position.set(slotX + slotSize / 2, slotY + 40);
                layer.addChild(name);

                const bonus = item.description.split(",")[0];
                if (bonus.includes("+")) {
                    const badge = new PIXI.Text({
                        text: bonus,
                        style: new PIXI.TextStyle({ fontSize: 7, fill: 0x00ff88, fontWeight: "700" }),
                    });
                    badge.position.set(slotX + slotSize - 22, slotY - 6);
                    layer.addChild(badge);
                }
            }
        });

        const weaponLabel = new PIXI.Text({
            text: "🗡️ Weapons (2)",
            style: new PIXI.TextStyle({ fontSize: 9, fill: 0x6b7280, fontWeight: "700" }),
        });
        weaponLabel.position.set(columnX, y);
        layer.addChild(weaponLabel);

        const amuletX = columnX + (slotSize + 8) * 2 + gap;
        const amuletSlot = inventory.amulet;
        const amuletBox = new PIXI.Graphics();
        amuletBox.roundRect(amuletX, y + 18, slotSize, slotSize, 10);
        amuletBox.fill({ color: amuletSlot ? 0x1a1222 : 0x0b0f14, alpha: 0.6 });
        amuletBox.stroke({ color: 0xcc66ff, width: amuletSlot ? 2 : 1, alpha: amuletSlot ? 0.8 : 0.3 });
        layer.addChild(amuletBox);

        const amuletIcon = new PIXI.Text({
            text: amuletSlot ? amuletSlot.emoji : "+",
            style: new PIXI.TextStyle({ fontSize: amuletSlot ? 22 : 18, fill: amuletSlot ? 0xffffff : 0x30363d }),
        });
        amuletIcon.anchor.set(0.5);
        amuletIcon.position.set(amuletX + slotSize / 2, y + 18 + 24);
        layer.addChild(amuletIcon);

        if (amuletSlot) {
            const name = new PIXI.Text({
                text: amuletSlot.name,
                style: new PIXI.TextStyle({ fontSize: 8, fill: 0x94a3b8, fontWeight: "600" }),
            });
            name.anchor.set(0.5);
            name.position.set(amuletX + slotSize / 2, y + 58);
            layer.addChild(name);
        }

        const amuletLabel = new PIXI.Text({
            text: "💎 Amulet (1)",
            style: new PIXI.TextStyle({ fontSize: 9, fill: 0x6b7280, fontWeight: "700" }),
        });
        amuletLabel.position.set(amuletX, y);
        layer.addChild(amuletLabel);

        return y + 78;
    }
}
