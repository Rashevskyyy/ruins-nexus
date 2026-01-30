import * as PIXI from "pixi.js";
import type { HeroBoardResourcesContext, HeroBoardResourcesData } from "./HeroBoardTypes";

type ResourcesContext = HeroBoardResourcesContext & HeroBoardResourcesData;

export class HeroBoardResourcesSection {
    getSectionHeight(): number {
        return 62;
    }

    render({ layer, leftX, panelW, y, player, tooltip }: ResourcesContext): number {
        const columnGap = 8;
        const statsW = (panelW - 28 - columnGap * 4) / 5;
        const stats = [
            {
                emoji: "❤️",
                value: `${player.hp}`,
                color: 0xff6b6b,
                key: "hp",
                title: "Health Points",
                desc: "Your life total. If HP reaches 0, you're knocked out and lose resources.",
                stats: [`Current: ${player.hp}/${player.maxHp}`],
            },
            {
                emoji: "🧬",
                value: player.biomass,
                color: 0x00ff88,
                key: "biomass",
                title: "Biomass",
                desc: "Organic material gathered from alien flora. Used for healing and some crafting.",
                stats: ["Heal: 2→1 HP", "Trade: 3→1"],
            },
            {
                emoji: "🧱",
                value: player.materials,
                color: 0xffaa00,
                key: "materials",
                title: "Materials",
                desc: "Raw construction materials. Essential for building base modules.",
                stats: ["Build: Base modules", "Trade: 2→1"],
            },
            {
                emoji: "⚙️",
                value: player.alloys,
                color: 0x00ddff,
                key: "alloys",
                title: "Alloys",
                desc: "Refined metals for advanced crafting. Required for weapons and equipment.",
                stats: ["Craft: Weapons", "Trade: 2→1"],
            },
            {
                emoji: "🧩",
                value: player.components,
                color: 0xcc66ff,
                key: "components",
                title: "Components",
                desc: "Rare tech parts dropped by Tier 2+ monsters. Required for all crafting.",
                stats: ["Source: Tier 2+ monsters"],
            },
        ];

        for (let i = 0; i < 5; i++) {
            const stat = stats[i];
            const sx = leftX + i * (statsW + columnGap);

            const statBox = new PIXI.Graphics();
            statBox.roundRect(sx, y, statsW, 52, 10);
            statBox.fill({ color: 0x05080d, alpha: 0.6 });
            statBox.stroke({ color: stat.color, width: 1, alpha: 0.35 });
            layer.addChild(statBox);

            const emoji = new PIXI.Text({ text: stat.emoji, style: new PIXI.TextStyle({ fontSize: 16 }) });
            emoji.anchor.set(0.5);
            emoji.position.set(sx + statsW / 2, y + 12);
            layer.addChild(emoji);

            const val = new PIXI.Text({
                text: `${stat.value}`,
                style: new PIXI.TextStyle({ fontSize: 18, fill: stat.color, fontWeight: "800" }),
            });
            val.anchor.set(0.5);
            val.position.set(sx + statsW / 2, y + 30);
            layer.addChild(val);

            if (stat.key === "hp") {
                const barX = sx + 6;
                const barY = y + 42;
                const barW = statsW - 12;
                const barH = 4;

                const hpBarBg = new PIXI.Graphics();
                hpBarBg.roundRect(barX, barY, barW, barH, 2);
                hpBarBg.fill({ color: 0x2a1a1a, alpha: 1 });
                layer.addChild(hpBarBg);

                const fillW = Math.max(0, Math.min(player.hp / Math.max(player.maxHp, 1), 1)) * barW;
                if (fillW > 0) {
                    const hpBarFill = new PIXI.Graphics();
                    hpBarFill.roundRect(barX, barY, fillW, barH, 2);
                    hpBarFill.fill({ color: 0xff5c5c, alpha: 1 });
                    layer.addChild(hpBarFill);
                }
            }

            tooltip.attach(statBox, {
                title: stat.title,
                description: stat.desc,
                stats: stat.stats,
                accentColor: stat.color,
                icon: stat.emoji,
            });
        }

        return y + 62;
    }
}
