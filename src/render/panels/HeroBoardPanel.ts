import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import { MODULES, type ModuleType } from "../../entities/BuildingType";

type HeroBoardContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    playerIndex: number;
};

export class HeroBoardPanel {
    render({ app, game, layer, playerColors, playerIndex }: HeroBoardContext): void {
        const p = game.state.players[playerIndex];
        if (!p) return;

        const playerColor = playerColors[playerIndex % playerColors.length];
        const isAtBase = game.isInOwnBase();
        const hasComponents = p.components >= 1;

        layer.removeChildren();

        const panelW = 300;
        const moduleOrder: ModuleType[] = [
            "AssaultBay",
            "ShieldArray",
            "TacticalUplink",
            "SupplyDepot",
            "RelicVault",
            "BeaconSpire",
            "OrbitalHangar",
        ];
        const builtModules = moduleOrder.filter((type) => p.modules.includes(type));
        const moduleRows = Math.max(1, builtModules.length);
        const moduleRowHeight = 36;
        const modulesSectionHeight = 22 + moduleRows * moduleRowHeight + 6;
        const headerHeight = 86;
        const panelH = 360 + headerHeight + modulesSectionHeight;
        const panelX = app.renderer.width - panelW - 20;
        const panelY = 70;

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x0d1117, alpha: 0.96 });
        bg.stroke({ color: playerColor, width: 3 });
        layer.addChild(bg);

        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(panelX + 12, panelY + 10, panelW - 24, headerHeight - 16, 10);
        headerBg.fill({ color: 0x111827, alpha: 0.9 });
        headerBg.stroke({ color: playerColor, width: 1, alpha: 0.35 });
        layer.addChild(headerBg);

        const portraitBox = new PIXI.Graphics();
        portraitBox.roundRect(panelX + 22, panelY + 20, 60, 60, 12);
        portraitBox.fill({ color: 0x0b1220 });
        portraitBox.stroke({ color: playerColor, width: 2, alpha: 0.6 });
        layer.addChild(portraitBox);

        const portraitHint = new PIXI.Text({
            text: "HERO",
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x8b949e, fontWeight: "700", letterSpacing: 1 }),
        });
        portraitHint.anchor.set(0.5);
        portraitHint.position.set(panelX + 52, panelY + 50);
        layer.addChild(portraitHint);

        const title = new PIXI.Text({
            text: p.id,
            style: new PIXI.TextStyle({ fontSize: 22, fill: playerColor, fontWeight: "900" }),
        });
        title.position.set(panelX + 92, panelY + 24);
        layer.addChild(title);

        const subtitle = new PIXI.Text({
            text: "Commander",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e, fontWeight: "600", letterSpacing: 1 }),
        });
        subtitle.position.set(panelX + 92, panelY + 48);
        layer.addChild(subtitle);

        let y = panelY + headerHeight;
        const leftX = panelX + 14;
        const rightX = panelX + panelW - 14;

        // ═══════════════════════════════════════
        // PRESTIGE SECTION (prominent!)
        // ═══════════════════════════════════════
        const prestigeBgColor = p.prestige >= 15 ? 0x3d1a1a : (p.prestige >= 12 ? 0x3d2a1a : 0x161b2e);
        const prestigeBorderColor = p.prestige >= 15 ? 0xff4444 : (p.prestige >= 12 ? 0xffaa00 : 0xffd700);

        const prestigeBox = new PIXI.Graphics();
        prestigeBox.roundRect(leftX, y, panelW - 28, 56, 8);
        prestigeBox.fill({ color: prestigeBgColor });
        prestigeBox.stroke({ color: prestigeBorderColor, width: 2 });
        layer.addChild(prestigeBox);

        // Prestige header
        const prestigeHeader = new PIXI.Text({
            text: "⭐ PRESTIGE",
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffd700, fontWeight: "700", letterSpacing: 1 }),
        });
        prestigeHeader.position.set(leftX + 10, y + 6);
        layer.addChild(prestigeHeader);

        // Large prestige value
        const prestigeValue = new PIXI.Text({
            text: `${p.prestige}`,
            style: new PIXI.TextStyle({
                fontSize: 36,
                fill: 0xffd700,
                fontWeight: "900",
                dropShadow: { color: 0xffd700, blur: 8, alpha: 0.5, distance: 0 },
            }),
        });
        prestigeValue.anchor.set(1, 0);
        prestigeValue.position.set(rightX - 10, y + 14);
        layer.addChild(prestigeValue);

        // Progress bar
        const barW = panelW - 50;
        const barH = 8;
        const barX = leftX + 10;
        const barY = y + 40;
        const maxPrestige = 20;

        const prestigeBarBg = new PIXI.Graphics();
        prestigeBarBg.roundRect(barX, barY, barW, barH, 3);
        prestigeBarBg.fill({ color: 0x0d1117 });
        layer.addChild(prestigeBarBg);

        const fillW = Math.min(p.prestige / maxPrestige, 1) * barW;
        if (fillW > 0) {
            const prestigeBarFill = new PIXI.Graphics();
            prestigeBarFill.roundRect(barX, barY, fillW, barH, 3);
            prestigeBarFill.fill({ color: prestigeBorderColor });
            layer.addChild(prestigeBarFill);
        }

        // Threshold markers
        const marker12X = barX + (12 / maxPrestige) * barW;
        const marker15X = barX + (15 / maxPrestige) * barW;

        const m12 = new PIXI.Graphics();
        m12.rect(marker12X, barY, 1, barH);
        m12.fill({ color: 0xffffff, alpha: 0.5 });
        layer.addChild(m12);

        const m15 = new PIXI.Graphics();
        m15.rect(marker15X, barY, 1, barH);
        m15.fill({ color: 0xffffff, alpha: 0.5 });
        layer.addChild(m15);

        // Warning text
        if (p.prestige >= 12) {
            const warnText = p.prestige >= 15 ? "🚫 No Rerolls" : "⚠️ +1 Difficulty";
            const warn = new PIXI.Text({
                text: warnText,
                style: new PIXI.TextStyle({ fontSize: 10, fill: prestigeBorderColor, fontWeight: "600" }),
            });
            warn.position.set(leftX + 10, y + 22);
            layer.addChild(warn);
        }

        y += 64;

        // ═══════════════════════════════════════
        // HP + RESOURCES
        // ═══════════════════════════════════════
        const statsW = (panelW - 38) / 5;
        const stats = [
            { emoji: "❤️", value: `${p.hp}`, color: 0xff6b6b },
            { emoji: "🧬", value: p.biomass, color: 0x00ff88 },
            { emoji: "🧱", value: p.materials, color: 0xd97706 },
            { emoji: "⚙", value: p.alloys, color: 0x708090 },
            { emoji: "🧩", value: p.components, color: 0x9333ea },
        ];

        for (let i = 0; i < 5; i++) {
            const stat = stats[i];
            const sx = leftX + i * (statsW + 5);

            const statBox = new PIXI.Graphics();
            statBox.roundRect(sx, y, statsW, 44, 10);
            statBox.fill({ color: 0x0f172a });
            statBox.stroke({ color: stat.color, width: 1, alpha: 0.4 });
            layer.addChild(statBox);

            const emoji = new PIXI.Text({ text: stat.emoji, style: new PIXI.TextStyle({ fontSize: 14 }) });
            emoji.anchor.set(0.5);
            emoji.position.set(sx + statsW / 2, y + 12);
            layer.addChild(emoji);

            const val = new PIXI.Text({
                text: `${stat.value}`,
                style: new PIXI.TextStyle({ fontSize: 16, fill: stat.color, fontWeight: "800" }),
            });
            val.anchor.set(0.5);
            val.position.set(sx + statsW / 2, y + 31);
            layer.addChild(val);
        }

        y += 54;

        // ═══════════════════════════════════════
        // EQUIPMENT (with actionable context hints)
        // ═══════════════════════════════════════
        const weaponsCount = p.inventory.weapons.filter((w) => w !== null).length;
        const modulesCount = p.inventory.spells.filter((s) => s !== null).length;
        const hasAmulet = p.inventory.amulet !== null;
        const totalEquip = weaponsCount + modulesCount + (hasAmulet ? 1 : 0);
        const maxEquip = 5;

        const equipLabel = new PIXI.Text({
            text: "⚔ EQUIPMENT",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffd700, letterSpacing: 1, fontWeight: "600" }),
        });
        equipLabel.position.set(leftX, y);
        layer.addChild(equipLabel);

        // Actionable context hint - tells player WHAT TO DO
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

        y += 58;

        // ═══════════════════════════════════════
        // UNITS (combat support - permanent bonus)
        // ═══════════════════════════════════════
        const unitsCount = p.units.filter((u) => u !== null).length;

        const unitsLabel = new PIXI.Text({
            text: "🤖 COMBAT UNITS",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x3b82f6, letterSpacing: 1, fontWeight: "600" }),
        });
        unitsLabel.position.set(leftX, y);
        layer.addChild(unitsLabel);

        const permLabel = new PIXI.Text({
            text: unitsCount > 0 ? `+${unitsCount} POWER` : "PERMANENT",
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: unitsCount > 0 ? 0x00ff88 : 0x484f58,
                fontWeight: "700",
            }),
        });
        permLabel.anchor.set(1, 0);
        permLabel.position.set(rightX, y + 1);
        layer.addChild(permLabel);

        y += 16;

        const unitW = (panelW - 38 - 5) / 2;

        for (let i = 0; i < 2; i++) {
            const unit = p.units[i];
            const ux = leftX + i * (unitW + 5);
            const filled = unit !== null;

            const unitBox = new PIXI.Graphics();
            unitBox.roundRect(ux, y, unitW, 55, 6);
            unitBox.fill({ color: filled ? 0x1a2a3e : 0x0d1117 });
            unitBox.stroke({ color: 0x3b82f6, width: filled ? 2 : 1, alpha: filled ? 0.8 : 0.3 });
            layer.addChild(unitBox);

            if (unit) {
                const emoji = new PIXI.Text({ text: unit.emoji, style: new PIXI.TextStyle({ fontSize: 24 }) });
                emoji.anchor.set(0.5);
                emoji.position.set(ux + unitW / 2, y + 20);
                layer.addChild(emoji);

                const name = new PIXI.Text({
                    text: unit.name.split(" ")[0],
                    style: new PIXI.TextStyle({ fontSize: 10, fill: 0x3b82f6, fontWeight: "600" }),
                });
                name.anchor.set(0.5);
                name.position.set(ux + unitW / 2, y + 42);
                layer.addChild(name);
            } else {
                const plus = new PIXI.Text({
                    text: "+",
                    style: new PIXI.TextStyle({ fontSize: 24, fill: 0x3b82f6 }),
                });
                plus.alpha = 0.3;
                plus.anchor.set(0.5);
                plus.position.set(ux + unitW / 2, y + 24);
                layer.addChild(plus);
            }
        }

        y += 65;

        // ═══════════════════════════════════════
        // BASE MODULES (built buildings + effects)
        // ═══════════════════════════════════════
        const moduleIcons: Record<ModuleType, string> = {
            AssaultBay: "⚔️",
            ShieldArray: "🛡️",
            TacticalUplink: "📡",
            SupplyDepot: "📦",
            RelicVault: "🔮",
            BeaconSpire: "🛰️",
            OrbitalHangar: "🚀",
        };

        const modulesLabel = new PIXI.Text({
            text: "🏠 BASE MODULES",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffaa00, letterSpacing: 1, fontWeight: "600" }),
        });
        modulesLabel.position.set(leftX, y);
        layer.addChild(modulesLabel);

        const modulesCountLabel = new PIXI.Text({
            text: `${builtModules.length}/${moduleOrder.length} BUILT`,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0x8b949e, fontWeight: "700" }),
        });
        modulesCountLabel.anchor.set(1, 0);
        modulesCountLabel.position.set(rightX, y + 1);
        layer.addChild(modulesCountLabel);

        y += 18;

        if (builtModules.length === 0) {
            const none = new PIXI.Text({
                text: "No modules built yet. Build at your Base.",
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0x8b949e, fontWeight: "600" }),
            });
            none.position.set(leftX + 6, y + 6);
            layer.addChild(none);
        } else {
            for (const type of builtModules) {
                const def = MODULES[type];
                const row = new PIXI.Graphics();
                row.roundRect(leftX, y, panelW - 28, moduleRowHeight, 6);
                row.fill({ color: 0x111827 });
                row.stroke({ color: 0xffaa00, width: 1, alpha: 0.35 });
                layer.addChild(row);

                const icon = new PIXI.Text({
                    text: moduleIcons[type] ?? "🏠",
                    style: new PIXI.TextStyle({ fontSize: 18 }),
                });
                icon.anchor.set(0.5);
                icon.position.set(leftX + 16, y + moduleRowHeight / 2);
                layer.addChild(icon);

                const name = new PIXI.Text({
                    text: def.description,
                    style: new PIXI.TextStyle({ fontSize: 11, fill: 0xffe8b0, fontWeight: "700" }),
                });
                name.position.set(leftX + 32, y + 4);
                layer.addChild(name);

                const effect = new PIXI.Text({
                    text: def.effect,
                    style: new PIXI.TextStyle({
                        fontSize: 9,
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
}
