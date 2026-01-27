import * as PIXI from "pixi.js";
import type { HeroBoardEquipmentContext, HeroBoardEquipmentData } from "./HeroBoardTypes";

type EquipmentContext = HeroBoardEquipmentContext & HeroBoardEquipmentData;

export class HeroBoardEquipmentSection {
    render({ layer, leftX, rightX, panelW, y, inventory, isAtBase, hasComponents }: EquipmentContext): number {
        const weaponsCount = inventory.weapons.filter((w) => w !== null).length;
        const modulesCount = inventory.spells.filter((s) => s !== null).length;
        const hasAmulet = inventory.amulet !== null;
        const totalEquip = weaponsCount + modulesCount + (hasAmulet ? 1 : 0);
        const maxEquip = 5;

        const equipLabel = new PIXI.Text({
            text: "⚔ EQUIPMENT",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffd700, letterSpacing: 1, fontWeight: "600" }),
        });
        equipLabel.position.set(leftX, y);
        layer.addChild(equipLabel);

        let equipHint = "";
        let hintColor = 0x8b949e;
        if (totalEquip >= maxEquip) {
            equipHint = "✓ FULL";
            hintColor = 0x00ff88;
        } else if (isAtBase && hasComponents) {
            equipHint = "→ CRAFT NOW";
            hintColor = 0x00ff88;
        } else if (isAtBase && !hasComponents) {
            equipHint = "NEED 🧩 TO CRAFT";
            hintColor = 0x9333ea;
        } else if (hasComponents) {
            equipHint = "← GO TO BASE";
            hintColor = 0xffaa00;
        } else {
            equipHint = "HUNT FOR 🧩";
            hintColor = 0x9333ea;
        }

        const hintText = new PIXI.Text({
            text: equipHint,
            style: new PIXI.TextStyle({ fontSize: 10, fill: hintColor, fontWeight: "700" }),
        });
        hintText.anchor.set(1, 0);
        hintText.position.set(rightX, y + 1);
        layer.addChild(hintText);

        y += 18;

        const equipItems = [
            { icon: "⚔", count: weaponsCount, max: 2, color: 0xffd700 },
            { icon: "🔧", count: modulesCount, max: 2, color: 0x9333ea },
            { icon: "📿", count: hasAmulet ? 1 : 0, max: 1, color: 0x3498db },
        ];

        const eqW = (panelW - 38 - 10) / 3;

        for (let i = 0; i < 3; i++) {
            const eq = equipItems[i];
            const ex = leftX + i * (eqW + 5);
            const filled = eq.count > 0;

            const eqBox = new PIXI.Graphics();
            eqBox.roundRect(ex, y, eqW, 50, 6);
            eqBox.fill({ color: filled ? 0x1a2535 : 0x0d1117 });
            eqBox.stroke({ color: eq.color, width: filled ? 2 : 1, alpha: filled ? 0.8 : 0.3 });
            layer.addChild(eqBox);

            const icon = new PIXI.Text({ text: eq.icon, style: new PIXI.TextStyle({ fontSize: 20 }) });
            icon.alpha = filled ? 1 : 0.4;
            icon.anchor.set(0.5);
            icon.position.set(ex + eqW / 2, y + 16);
            layer.addChild(icon);

            const count = new PIXI.Text({
                text: `${eq.count}/${eq.max}`,
                style: new PIXI.TextStyle({ fontSize: 12, fill: filled ? eq.color : 0x484f58, fontWeight: "700" }),
            });
            count.anchor.set(0.5);
            count.position.set(ex + eqW / 2, y + 38);
            layer.addChild(count);
        }

        return y + 58;
    }
}
