import * as PIXI from "pixi.js";
import type { HeroBoardResourcesContext, HeroBoardResourcesData } from "./HeroBoardTypes";

type ResourcesContext = HeroBoardResourcesContext & HeroBoardResourcesData;

type ResourceConfig = {
    emoji: string;
    value: number | string;
    color: number;
    hoverBorderColor: number;
    hoverBgColor: number;
    key: string;
    title: string;
    desc: string;
    stats: string[];
};

export class HeroBoardResourcesSection {
    getSectionHeight(): number {
        return 80;
    }

    render({ layer, panelX, panelW, y, player, tooltip }: ResourcesContext): number {
        const padding = 12;
        const gap = 6;
        const availableWidth = panelW - padding * 2;
        const boxW = (availableWidth - gap * 4) / 5;
        const boxH = 60;

        // Section container
        const sectionContainer = new PIXI.Container();
        sectionContainer.position.set(panelX, y);

        // Section background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, panelW, 80);
        bg.fill({ color: 0x0a1015 });
        sectionContainer.addChild(bg);

        // Bottom border
        const borderLine = new PIXI.Graphics();
        borderLine.rect(0, 79, panelW, 1);
        borderLine.fill({ color: 0x1a2a3a });
        sectionContainer.addChild(borderLine);

        layer.addChild(sectionContainer);

        const stats: ResourceConfig[] = [
            {
                emoji: "❤️",
                value: player.hp,
                color: 0xff6666,
                hoverBorderColor: 0xff6666,
                hoverBgColor: 0xff4444,
                key: "hp",
                title: "Health Points",
                desc: "Your life total. If HP reaches 0, you're knocked out and lose resources.",
                stats: [`Current: ${player.hp}/${player.maxHp}`, `Max HP: ${player.maxHp}`, "Heal at: Base, Hub"],
            },
            {
                emoji: "🧬",
                value: player.biomass,
                color: 0x00ff88,
                hoverBorderColor: 0x00ff88,
                hoverBgColor: 0x00ff88,
                key: "biomass",
                title: "Biomass",
                desc: "Organic material gathered from alien flora. Used for healing and some crafting.",
                stats: [`Current: ${player.biomass}`, "Used for: Healing (2→1HP)", "Trade rate: 3→1 other"],
            },
            {
                emoji: "🧱",
                value: player.materials,
                color: 0xffaa00,
                hoverBorderColor: 0xffaa00,
                hoverBgColor: 0xffaa00,
                key: "materials",
                title: "Materials",
                desc: "Raw construction materials. Essential for building base modules.",
                stats: [`Current: ${player.materials}`, "Used for: Base modules", "Trade rate: 2→1 other"],
            },
            {
                emoji: "⚙️",
                value: player.alloys,
                color: 0x00ddff,
                hoverBorderColor: 0x00ddff,
                hoverBgColor: 0x00ddff,
                key: "alloys",
                title: "Alloys",
                desc: "Refined metals for advanced crafting. Required for weapons and equipment.",
                stats: [`Current: ${player.alloys}`, "Used for: Weapons, Modules", "Trade rate: 2→1 other"],
            },
            {
                emoji: "🧩",
                value: player.components,
                color: 0xcc66ff,
                hoverBorderColor: 0xcc66ff,
                hoverBgColor: 0xcc66ff,
                key: "components",
                title: "Components",
                desc: "Rare tech parts dropped by Tier 2+ monsters. Required for all crafting.",
                stats: [`Current: ${player.components}`, "Source: T2+ monsters", "Used for: All equipment"],
            },
        ];

        for (let i = 0; i < 5; i++) {
            const stat = stats[i];
            const sx = padding + i * (boxW + gap);

            const resourceContainer = new PIXI.Container();
            resourceContainer.position.set(sx, 10);

            const resourceBox = new PIXI.Graphics();
            resourceBox.roundRect(0, 0, boxW, boxH, 8);
            resourceBox.fill({ color: 0x000000, alpha: 0.3 });
            resourceContainer.addChild(resourceBox);

            // Emoji icon
            const emoji = new PIXI.Text({ 
                text: stat.emoji, 
                style: new PIXI.TextStyle({ fontSize: 16 }) 
            });
            emoji.anchor.set(0.5);
            emoji.position.set(boxW / 2, 16);
            resourceContainer.addChild(emoji);

            // Value
            const val = new PIXI.Text({
                text: `${stat.value}`,
                style: new PIXI.TextStyle({ fontSize: 15, fill: stat.color, fontWeight: "700" }),
            });
            val.anchor.set(0.5);
            val.position.set(boxW / 2, 36);
            resourceContainer.addChild(val);

            // HP bar (only for HP stat)
            if (stat.key === "hp") {
                const barY = 50;
                const barW = boxW - 8;
                const barH = 3;
                const barX = 4;

                const hpBarBg = new PIXI.Graphics();
                hpBarBg.roundRect(barX, barY, barW, barH, 2);
                hpBarBg.fill({ color: 0x2a1a1a });
                resourceContainer.addChild(hpBarBg);

                const fillRatio = Math.max(0, Math.min(player.hp / Math.max(player.maxHp, 1), 1));
                const fillW = fillRatio * barW;
                if (fillW > 0) {
                    const hpBarFill = new PIXI.Graphics();
                    hpBarFill.roundRect(barX, barY, fillW, barH, 2);
                    hpBarFill.fill({ color: 0xff5c5c });
                    resourceContainer.addChild(hpBarFill);
                }
            }

            sectionContainer.addChild(resourceContainer);

            // Hover effect
            resourceContainer.eventMode = "static";
            resourceContainer.cursor = "pointer";
            const originalY = resourceContainer.position.y;

            resourceContainer.on("pointerover", () => {
                resourceContainer.position.y = originalY - 2;
                resourceBox.clear();
                resourceBox.roundRect(0, 0, boxW, boxH, 8);
                resourceBox.fill({ color: stat.hoverBgColor, alpha: 0.15 });
                resourceBox.stroke({ color: stat.hoverBorderColor, width: 1 });
            });
            resourceContainer.on("pointerout", () => {
                resourceContainer.position.y = originalY;
                resourceBox.clear();
                resourceBox.roundRect(0, 0, boxW, boxH, 8);
                resourceBox.fill({ color: 0x000000, alpha: 0.3 });
            });

            tooltip.attach(resourceContainer, {
                title: stat.title,
                description: stat.desc,
                stats: stat.stats,
                accentColor: stat.color,
                icon: stat.emoji,
                itemType: "Stat",
            });
        }

        return y + 80;
    }
}
