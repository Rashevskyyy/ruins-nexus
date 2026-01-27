import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { Player } from "../../entities/Player";

export type HeroBoardLegacyRendererOptions = {
    game: Game;
    heroBoardLayer: PIXI.Container;
};

export class HeroBoardLegacyRenderer {
    constructor(private options: HeroBoardLegacyRendererOptions) {}

    public renderEquipmentSummaryCompact(p: Player, x: number, y: number, width: number): void {
        const weaponsCount = p.inventory.weapons.filter(w => w !== null).length;
        const modulesCount = p.inventory.spells.filter(s => s !== null).length;
        const unitsCount = p.units.filter(u => u !== null).length;
        const hasAmulet = p.inventory.amulet !== null;

        const items = [
            { icon: "⚔", count: weaponsCount, max: 2, color: 0xffd700 },
            { icon: "🔧", count: modulesCount, max: 2, color: 0x9333ea },
            { icon: "🤖", count: unitsCount, max: 2, color: 0x3b82f6 },
            { icon: "📿", count: hasAmulet ? 1 : 0, max: 1, color: 0x3498db },
        ];

        const itemW = (width - 30) / 4;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const ix = x + i * (itemW + 10);
            const filled = item.count > 0;

            const box = new PIXI.Graphics();
            box.roundRect(ix, y, itemW, 64, 10);
            box.fill({ color: filled ? 0x161b2e : 0x0a0e1a, alpha: filled ? 0.8 : 0.4 });
            box.stroke({ color: item.color, width: filled ? 2 : 1, alpha: filled ? 0.6 : 0.3 });
            this.options.heroBoardLayer.addChild(box);

            const icon = new PIXI.Text({
                text: item.icon,
                style: new PIXI.TextStyle({
                    fontSize: 26,
                }),
            });
            icon.alpha = filled ? 1 : 0.4;
            icon.anchor.set(0.5);
            icon.position.set(ix + itemW / 2, y + 24);
            this.options.heroBoardLayer.addChild(icon);

            const countText = new PIXI.Text({
                text: `${item.count}/${item.max}`,
                style: new PIXI.TextStyle({
                    fontSize: 15,
                    fill: filled ? item.color : 0x484f58,
                    fontWeight: "800",
                }),
            });
            countText.anchor.set(0.5);
            countText.position.set(ix + itemW / 2, y + 48);
            this.options.heroBoardLayer.addChild(countText);
        }
    }

    public renderEquipmentSummary(p: Player, x: number, y: number, _width: number): void {
        const slotSize = 42;
        const gap = 10;

        const weaponsCount = p.inventory.weapons.filter(w => w !== null).length;
        const modulesCount = p.inventory.spells.filter(s => s !== null).length;
        const unitsCount = p.units.filter(u => u !== null).length;
        const hasAmulet = p.inventory.amulet !== null;

        const weaponLabel = new PIXI.Text({
            text: `⚔ ${weaponsCount}/2`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffd700, fontWeight: "700" }),
        });
        weaponLabel.position.set(x, y);
        this.options.heroBoardLayer.addChild(weaponLabel);

        for (let i = 0; i < 2; i++) {
            const item = p.inventory.weapons[i];
            this.renderEquipSlotSimple(x + i * (slotSize + gap), y + 24, slotSize, item !== null);
        }

        const moduleLabel = new PIXI.Text({
            text: `🔧 ${modulesCount}/2`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0x9333ea, fontWeight: "700" }),
        });
        moduleLabel.position.set(x + 160, y);
        this.options.heroBoardLayer.addChild(moduleLabel);

        for (let i = 0; i < 2; i++) {
            const item = p.inventory.spells[i];
            this.renderEquipSlotSimple(x + 160 + i * (slotSize + gap), y + 24, slotSize, item !== null);
        }

        const unitLabel = new PIXI.Text({
            text: `🤖 ${unitsCount}/2`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0x3b82f6, fontWeight: "700" }),
        });
        unitLabel.position.set(x, y + 50);
        this.options.heroBoardLayer.addChild(unitLabel);

        for (let i = 0; i < 2; i++) {
            const unit = p.units[i];
            this.renderEquipSlotSimple(x + i * (slotSize + gap), y + 74, slotSize, unit !== null, unit?.emoji);
        }

        const amuletLabel = new PIXI.Text({
            text: `📿 ${hasAmulet ? "1" : "0"}/1`,
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0x3498db, fontWeight: "700" }),
        });
        amuletLabel.position.set(x + 160, y + 50);
        this.options.heroBoardLayer.addChild(amuletLabel);

        this.renderEquipSlotSimple(x + 160, y + 74, slotSize, hasAmulet);
    }

    public renderSectionHeader(text: string, x: number, y: number, color: number): void {
        const label = new PIXI.Text({
            text: text,
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: color,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        label.position.set(x, y);
        this.options.heroBoardLayer.addChild(label);
    }

    public renderLifeTokensCompact(p: { hp: number; maxHp: number }, x: number, y: number): void {
        const heartSize = 16;
        const gap = 4;

        for (let i = 0; i < p.maxHp; i++) {
            const heart = new PIXI.Graphics();
            const filled = i < p.hp;
            const s = heartSize / 20;
            heart.moveTo(0, 6 * s);
            heart.bezierCurveTo(-5 * s, -3 * s, -12 * s, -3 * s, -12 * s, 2 * s);
            heart.bezierCurveTo(-12 * s, 7 * s, -8 * s, 12 * s, 0, 16 * s);
            heart.bezierCurveTo(8 * s, 12 * s, 12 * s, 7 * s, 12 * s, 2 * s);
            heart.bezierCurveTo(12 * s, -3 * s, 5 * s, -3 * s, 0, 6 * s);

            if (filled) {
                heart.fill({ color: 0xff3b4a, alpha: 1 });
                heart.stroke({ color: 0xcc0000, width: 1 });
            } else {
                heart.fill({ color: 0x2d3748, alpha: 0.6 });
                heart.stroke({ color: 0x4a5568, width: 1 });
            }

            heart.position.set(x + i * (heartSize + gap) + heartSize / 2, y + heartSize / 2);
            this.options.heroBoardLayer.addChild(heart);
        }

        const hpLabel = new PIXI.Text({
            text: `${p.hp}/${p.maxHp}`,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "600" }),
        });
        hpLabel.position.set(x + p.maxHp * (heartSize + gap) + 8, y + 2);
        this.options.heroBoardLayer.addChild(hpLabel);
    }

    public renderPrestigeBarModern(p: { prestige: number }, x: number, y: number, width: number): void {
        const barH = 32;
        const pressureThreshold = 12;
        const noRerollThreshold = 15;
        const maxDisplay = 20;

        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, width, 70, 10);
        cardBg.fill({ color: 0x161b2e, alpha: 0.6 });
        this.options.heroBoardLayer.addChild(cardBg);

        const label = new PIXI.Text({
            text: "⭐ PRESTIGE",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0xffd700,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        label.position.set(x + 10, y + 8);
        this.options.heroBoardLayer.addChild(label);

        const valueDisplay = new PIXI.Text({
            text: `${p.prestige}`,
            style: new PIXI.TextStyle({
                fontSize: 32,
                fill: 0xffd700,
                fontWeight: "900",
                dropShadow: { color: 0xffd700, blur: 8, alpha: 0.6, distance: 0 },
            }),
        });
        valueDisplay.anchor.set(1, 0);
        valueDisplay.position.set(x + width - 10, y + 4);
        this.options.heroBoardLayer.addChild(valueDisplay);

        const barY = y + 42;
        const barBg = new PIXI.Graphics();
        barBg.roundRect(x + 10, barY, width - 20, barH, 8);
        barBg.fill({ color: 0x0a0e1a, alpha: 1 });
        barBg.stroke({ color: 0x30363d, width: 2 });
        this.options.heroBoardLayer.addChild(barBg);

        const fillWidth = Math.min(p.prestige / maxDisplay, 1) * (width - 20);

        let barColor = 0xffd700;
        if (p.prestige >= noRerollThreshold) {
            barColor = 0xff4444;
        } else if (p.prestige >= pressureThreshold) {
            barColor = 0xffaa00;
        }

        if (fillWidth > 0) {
            const barFill = new PIXI.Graphics();
            barFill.roundRect(x + 10, barY, fillWidth, barH, 8);
            barFill.fill({ color: barColor, alpha: 1 });
            this.options.heroBoardLayer.addChild(barFill);
        }

        const marker12X = x + 10 + (pressureThreshold / maxDisplay) * (width - 20);
        const marker12 = new PIXI.Graphics();
        marker12.rect(marker12X - 1, barY + 4, 2, barH - 8);
        marker12.fill({ color: 0xffffff, alpha: 0.6 });
        this.options.heroBoardLayer.addChild(marker12);

        const marker12Label = new PIXI.Text({
            text: "12",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: "700" }),
        });
        marker12Label.anchor.set(0.5, 1);
        marker12Label.position.set(marker12X, barY - 2);
        this.options.heroBoardLayer.addChild(marker12Label);

        const marker15X = x + 10 + (noRerollThreshold / maxDisplay) * (width - 20);
        const marker15 = new PIXI.Graphics();
        marker15.rect(marker15X - 1, barY + 4, 2, barH - 8);
        marker15.fill({ color: 0xffffff, alpha: 0.6 });
        this.options.heroBoardLayer.addChild(marker15);

        const marker15Label = new PIXI.Text({
            text: "15",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: "700" }),
        });
        marker15Label.anchor.set(0.5, 1);
        marker15Label.position.set(marker15X, barY - 2);
        this.options.heroBoardLayer.addChild(marker15Label);
    }

    public renderPrestigeBar(p: { prestige: number }, x: number, y: number, width: number): void {
        const barH = 24;
        const pressureThreshold = 12;
        const noRerollThreshold = 15;
        const maxDisplay = 20;

        const label = new PIXI.Text({
            text: `⭐ PRESTIGE: ${p.prestige}`,
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffd700, fontWeight: "800", letterSpacing: 1 }),
        });
        label.position.set(x, y);
        this.options.heroBoardLayer.addChild(label);

        const barY = y + 28;
        const barBg = new PIXI.Graphics();
        barBg.roundRect(x, barY, width, barH, 6);
        barBg.fill({ color: 0x21262d, alpha: 1 });
        barBg.stroke({ color: 0x30363d, width: 2 });
        this.options.heroBoardLayer.addChild(barBg);

        const fillWidth = Math.min(p.prestige / maxDisplay, 1) * width;

        let barColor = 0xffd700;
        if (p.prestige >= noRerollThreshold) {
            barColor = 0xff4444;
        } else if (p.prestige >= pressureThreshold) {
            barColor = 0xffaa00;
        }

        const barFill = new PIXI.Graphics();
        barFill.roundRect(x, barY, fillWidth, barH, 6);
        barFill.fill({ color: barColor, alpha: 1 });
        this.options.heroBoardLayer.addChild(barFill);

        const marker12X = x + (pressureThreshold / maxDisplay) * width;
        const marker12 = new PIXI.Graphics();
        marker12.rect(marker12X - 1, barY, 2, barH);
        marker12.fill({ color: 0xffaa00, alpha: 1 });
        this.options.heroBoardLayer.addChild(marker12);

        const marker12Label = new PIXI.Text({
            text: "12",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffaa00, fontWeight: "700" }),
        });
        marker12Label.anchor.set(0.5, 1);
        marker12Label.position.set(marker12X, barY - 2);
        this.options.heroBoardLayer.addChild(marker12Label);

        const marker15X = x + (noRerollThreshold / maxDisplay) * width;
        const marker15 = new PIXI.Graphics();
        marker15.rect(marker15X - 1, barY, 2, barH);
        marker15.fill({ color: 0xff4444, alpha: 1 });
        this.options.heroBoardLayer.addChild(marker15);

        const marker15Label = new PIXI.Text({
            text: "15",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xff4444, fontWeight: "700" }),
        });
        marker15Label.anchor.set(0.5, 1);
        marker15Label.position.set(marker15X, barY - 2);
        this.options.heroBoardLayer.addChild(marker15Label);

        let warningText = "";
        let warningColor = 0x8b949e;

        if (p.prestige >= noRerollThreshold) {
            warningText = "🚫 No rerolls!";
            warningColor = 0xff4444;
        } else if (p.prestige >= pressureThreshold) {
            warningText = "⚠️ +1 difficulty";
            warningColor = 0xffaa00;
        } else {
            const toNextThreshold = pressureThreshold - p.prestige;
            warningText = `${toNextThreshold} to pressure`;
            warningColor = 0x8b949e;
        }

        const warning = new PIXI.Text({
            text: warningText,
            style: new PIXI.TextStyle({ fontSize: 14, fill: warningColor, fontWeight: "600" }),
        });
        warning.position.set(x, barY + barH + 6);
        this.options.heroBoardLayer.addChild(warning);
    }

    public renderModuleTokensCompact(p: { modules: string[] }, x: number, y: number, _width: number): void {
        if (p.modules.length === 0) {
            const none = new PIXI.Text({
                text: "No modules built yet",
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x718096 }),
            });
            none.position.set(x, y + 4);
            this.options.heroBoardLayer.addChild(none);
            return;
        }

        const slotSize = 28;
        const gap = 6;
        for (let i = 0; i < p.modules.length; i++) {
            const slot = new PIXI.Graphics();
            slot.roundRect(x + i * (slotSize + gap), y, slotSize, slotSize, 5);
            slot.fill({ color: 0x4a5568, alpha: 1 });
            slot.stroke({ color: 0x60a5fa, width: 2 });
            this.options.heroBoardLayer.addChild(slot);

            const label = new PIXI.Text({
                text: p.modules[i][0],
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "700" }),
            });
            label.anchor.set(0.5);
            label.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
            this.options.heroBoardLayer.addChild(label);
        }
    }

    public renderUnitsCompact(p: Player, x: number, y: number, _width: number): void {
        const slotSize = 36;
        const gap = 8;

        for (let i = 0; i < 2; i++) {
            const unit = p.units[i];

            const slot = new PIXI.Graphics();
            slot.roundRect(x + i * (slotSize + gap), y, slotSize, slotSize, 6);

            if (unit) {
                slot.fill({ color: 0x3b82f6, alpha: 0.8 });
                slot.stroke({ color: 0x60a5fa, width: 2 });

                const emoji = new PIXI.Text({
                    text: unit.emoji,
                    style: new PIXI.TextStyle({ fontSize: 20 }),
                });
                emoji.anchor.set(0.5);
                emoji.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
                this.options.heroBoardLayer.addChild(emoji);

                const name = new PIXI.Text({
                    text: unit.name.split(" ")[0],
                    style: new PIXI.TextStyle({ fontSize: 8, fill: 0xa0aec0 }),
                });
                name.anchor.set(0.5, 0);
                name.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize + 2);
                this.options.heroBoardLayer.addChild(name);
            } else {
                slot.fill({ color: 0x2d3748, alpha: 0.5 });
                slot.stroke({ color: 0x4a5568, width: 1 });

                const plus = new PIXI.Text({
                    text: "+",
                    style: new PIXI.TextStyle({ fontSize: 16, fill: 0x4a5568 }),
                });
                plus.anchor.set(0.5);
                plus.position.set(x + i * (slotSize + gap) + slotSize / 2, y + slotSize / 2);
                this.options.heroBoardLayer.addChild(plus);
            }

            this.options.heroBoardLayer.addChild(slot);
        }

        const hasEmptySlot = p.units.some(u => u === null);
        if (hasEmptySlot && this.options.game.isInOwnBase()) {
            const hint = new PIXI.Text({
                text: "← HIRE at Base",
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0x3b82f6, fontWeight: "600" }),
            });
            hint.position.set(x + 2 * (slotSize + gap) + 10, y + 10);
            this.options.heroBoardLayer.addChild(hint);
        }
    }

    public renderEquipmentCompact(p: Player, x: number, y: number, _width: number): void {
        const slotSize = 36;
        const gap = 6;
        const isAtBase = this.options.game.isInOwnBase();

        const weaponLabel = new PIXI.Text({
            text: "⚔ Weapons",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffd700, fontWeight: "600" }),
        });
        weaponLabel.position.set(x, y);
        this.options.heroBoardLayer.addChild(weaponLabel);

        for (let i = 0; i < 2; i++) {
            const item = p.inventory.weapons[i];
            this.renderEquipSlot(x + i * (slotSize + gap), y + 18, slotSize, item, "weapon", isAtBase);
        }

        const amuletLabel = new PIXI.Text({
            text: "📿 Amulet",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x3498db, fontWeight: "600" }),
        });
        amuletLabel.position.set(x + 180, y);
        this.options.heroBoardLayer.addChild(amuletLabel);

        this.renderEquipSlot(x + 180, y + 18, slotSize, p.inventory.amulet, "amulet", isAtBase);

        const moduleLabel = new PIXI.Text({
            text: "🔧 Modules",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x9333ea, fontWeight: "600" }),
        });
        moduleLabel.position.set(x, y + 60);
        this.options.heroBoardLayer.addChild(moduleLabel);

        for (let i = 0; i < 2; i++) {
            const item = p.inventory.spells[i];
            this.renderEquipSlot(x + i * (slotSize + gap), y + 78, slotSize, item, "module", isAtBase);
        }

        if (isAtBase) {
            const craftHint = new PIXI.Text({
                text: "← CRAFT at Base",
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0x9333ea, fontWeight: "600" }),
            });
            craftHint.position.set(x + 90, y + 85);
            this.options.heroBoardLayer.addChild(craftHint);
        }
    }

    public renderDivider(x: number, y: number, width: number): void {
        const divider = new PIXI.Graphics();
        divider.moveTo(x, y);
        divider.lineTo(x + width, y);
        divider.stroke({ color: 0x4a5568, width: 1, alpha: 0.4 });
        this.options.heroBoardLayer.addChild(divider);
    }

    private renderEquipSlotSimple(x: number, y: number, size: number, filled: boolean, emoji?: string): void {
        const slot = new PIXI.Graphics();
        slot.roundRect(x, y, size, size, 6);

        if (filled) {
            slot.fill({ color: 0x2d3748, alpha: 1 });
            slot.stroke({ color: 0x00ff88, width: 2 });

            if (emoji) {
                const icon = new PIXI.Text({
                    text: emoji,
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                icon.anchor.set(0.5);
                icon.position.set(x + size / 2, y + size / 2);
                this.options.heroBoardLayer.addChild(icon);
            } else {
                const checkmark = new PIXI.Text({
                    text: "✓",
                    style: new PIXI.TextStyle({ fontSize: 20, fill: 0x00ff88, fontWeight: "700" }),
                });
                checkmark.anchor.set(0.5);
                checkmark.position.set(x + size / 2, y + size / 2);
                this.options.heroBoardLayer.addChild(checkmark);
            }
        } else {
            slot.fill({ color: 0x21262d, alpha: 1 });
            slot.stroke({ color: 0x484f58, width: 2 });
        }

        this.options.heroBoardLayer.addChild(slot);
    }

    private renderEquipSlot(x: number, y: number, size: number, item: any, type: string, _isAtBase: boolean): void {
        const slot = new PIXI.Graphics();
        slot.roundRect(x, y, size, size, 6);

        const colors: Record<string, number> = {
            weapon: 0xffd700,
            module: 0x9333ea,
            amulet: 0x3498db,
        };
        const strokeColor = colors[type] || 0x4a5568;

        if (item) {
            slot.fill({ color: 0x4a5568, alpha: 1 });
            slot.stroke({ color: strokeColor, width: 2 });

            const emoji = new PIXI.Text({
                text: item.emoji || item.name?.[0] || "?",
                style: new PIXI.TextStyle({ fontSize: 18, fill: 0xffffff }),
            });
            emoji.anchor.set(0.5);
            emoji.position.set(x + size / 2, y + size / 2);
            this.options.heroBoardLayer.addChild(emoji);
        } else {
            slot.fill({ color: 0x1a1f2e, alpha: 0.8 });
            slot.stroke({ color: 0x4a5568, width: 1 });

            const icon = new PIXI.Text({
                text: type === "weapon" ? "⚔" : type === "module" ? "🔧" : "📿",
                style: new PIXI.TextStyle({ fontSize: 14 }),
            });
            icon.anchor.set(0.5);
            icon.alpha = 0.3;
            icon.position.set(x + size / 2, y + size / 2);
            this.options.heroBoardLayer.addChild(icon);
        }

        this.options.heroBoardLayer.addChild(slot);
    }
}
