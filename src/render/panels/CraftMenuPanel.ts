import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type ShowHintOptions = {
    x?: number;
    y?: number;
    anchor?: "center" | "top" | "bottom";
    showOnce?: boolean;
    highlightRect?: { x: number; y: number; width: number; height: number };
};

type CraftMenuContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    canShowHint: (id: string) => boolean;
    showHint: (id: string, title: string, message: string, options?: ShowHintOptions) => void;
    renderAll: () => void;
};

export class CraftMenuPanel {
    private activeTab: "weapon" | "module" | "amulet" = "weapon";

    render({ app, game, layer, canShowHint, showHint, renderAll }: CraftMenuContext): void {
        layer.removeChildren();

        // Only show in CRAFT_MENU mode
        if (game.state.uiMode !== "CRAFT_MENU") return;

        const p = game.state.players[game.state.currentPlayerIndex];

        const screenW = app.renderer.width;
        const screenH = app.renderer.height;

        // Backdrop
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", () => {
            game.state.uiMode = "NONE";
            renderAll();
        });
        layer.addChild(backdrop);

        // Panel
        const panelW = 580;
        const panelH = 560;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;

        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x0d1520, alpha: 0.98 });
        panel.stroke({ color: 0x2a4a6a, width: 2, alpha: 1 });
        panel.eventMode = "static";
        layer.addChild(panel);

        const headerH = 56;
        const headerBg = new PIXI.Graphics();
        headerBg.roundRect(panelX, panelY, panelW, headerH, 16);
        headerBg.fill({ color: 0x141f2e, alpha: 0.95 });
        headerBg.stroke({ color: 0x2a4a6a, width: 1, alpha: 0.8 });
        layer.addChild(headerBg);

        if (canShowHint("craft_menu")) {
            showHint(
                "craft_menu",
                "🔧 Crafting",
                "Crafting consumes Components, Alloys, Materials, or Prestige. Green prices = affordable.",
                {
                    anchor: "top",
                    x: panelX + panelW / 2,
                    y: panelY - 10,
                    highlightRect: { x: panelX, y: panelY, width: panelW, height: panelH },
                }
            );
        }

        // Title
        const title = new PIXI.Text({
            text: "⚒️ Craft Items",
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: 0x00ddff,
                fontWeight: "700",
                dropShadow: { alpha: 0.6, angle: 90, blur: 4, color: 0x000000, distance: 2 },
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        layer.addChild(title);

        // Close button
        const closeBtn = new PIXI.Graphics();
        const closeSize = 28;
        closeBtn.roundRect(panelX + panelW - 20 - closeSize, panelY + 14, closeSize, closeSize, 8);
        closeBtn.fill({ color: 0x331414, alpha: 0.95 });
        closeBtn.stroke({ color: 0xff4444, width: 1, alpha: 0.9 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            game.state.uiMode = "NONE";
            renderAll();
        });
        layer.addChild(closeBtn);

        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xff4444, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 20 - closeSize / 2, panelY + 14 + closeSize / 2);
        layer.addChild(closeX);

        const tabsY = panelY + headerH;
        const tabsH = 44;
        const tabsBg = new PIXI.Graphics();
        tabsBg.rect(panelX, tabsY, panelW, tabsH);
        tabsBg.fill({ color: 0x0c111a, alpha: 0.9 });
        tabsBg.stroke({ color: 0x1a2a3a, width: 1, alpha: 0.8 });
        layer.addChild(tabsBg);

        const tabSpecs: Array<{ label: string; icon: string; type: "weapon" | "module" | "amulet" }> = [
            { label: "Weapons", icon: "⚔️", type: "weapon" },
            { label: "Modules", icon: "🔧", type: "module" },
            { label: "Amulets", icon: "💎", type: "amulet" },
        ];
        const tabX = panelX + 16;
        const tabY = tabsY + 8;
        const tabW = 160;
        const tabH = 28;
        tabSpecs.forEach((tab, index) => {
            const isActive = this.activeTab === tab.type;
            const tabBg = new PIXI.Graphics();
            tabBg.roundRect(tabX + index * (tabW + 10), tabY, tabW, tabH, 8);
            tabBg.fill({ color: isActive ? 0x1a3a5a : 0x141821, alpha: 1 });
            tabBg.stroke({ color: isActive ? 0x00aaff : 0x1a2a3a, width: 1, alpha: 0.9 });
            tabBg.eventMode = "static";
            tabBg.cursor = "pointer";
            tabBg.on("pointerdown", () => {
                this.activeTab = tab.type;
                renderAll();
            });
            layer.addChild(tabBg);

            const tabText = new PIXI.Text({
                text: `${tab.icon} ${tab.label}`,
                style: new PIXI.TextStyle({
                    fontSize: 12,
                    fill: isActive ? 0x00ddff : 0x8892a0,
                    fontWeight: "700",
                }),
            });
            tabText.anchor.set(0.5);
            tabText.position.set(tabX + index * (tabW + 10) + tabW / 2, tabY + tabH / 2);
            layer.addChild(tabText);
        });

        const resourcesY = tabsY + tabsH;
        const resourcesH = 38;
        const resourcesBg = new PIXI.Graphics();
        resourcesBg.rect(panelX, resourcesY, panelW, resourcesH);
        resourcesBg.fill({ color: 0x0a1018, alpha: 0.95 });
        resourcesBg.stroke({ color: 0x1a2a3a, width: 1, alpha: 0.7 });
        layer.addChild(resourcesBg);

        const resourcesLabel = new PIXI.Text({
            text: "Resources:",
            style: new PIXI.TextStyle({
                fontSize: 11,
                fill: 0x667085,
                fontWeight: "700",
                letterSpacing: 1,
            }),
        });
        resourcesLabel.position.set(panelX + 16, resourcesY + 12);
        layer.addChild(resourcesLabel);

        const resourceItems = [
            { text: `🧩 ${p.components}`, color: 0xcc66ff },
            { text: `⚙ ${p.alloys}`, color: 0x00ddff },
            { text: `🧱 ${p.materials}`, color: 0xffaa00 },
            { text: `⭐ ${p.prestige}`, color: 0xffd700 },
        ];
        let resourceX = panelX + 120;
        resourceItems.forEach(item => {
            const pill = new PIXI.Graphics();
            const pillText = new PIXI.Text({
                text: item.text,
                style: new PIXI.TextStyle({ fontSize: 12, fill: item.color, fontWeight: "700" }),
            });
            const pillPaddingX = 8;
            const pillPaddingY = 4;
            const pillW = pillText.width + pillPaddingX * 2;
            const pillH = pillText.height + pillPaddingY * 2;
            pill.roundRect(resourceX, resourcesY + 8, pillW, pillH, 6);
            pill.fill({ color: 0x141821, alpha: 0.9 });
            layer.addChild(pill);
            pillText.position.set(resourceX + pillPaddingX, resourcesY + 8 + pillPaddingY - 1);
            layer.addChild(pillText);
            resourceX += pillW + 10;
        });

        let yOffset = resourcesY + resourcesH + 12;

        // Get all recipes
        const allRecipes = game.getAllCraftRecipes().filter(recipe => recipe.result.type === this.activeTab);

        for (const recipe of allRecipes) {
            const canCraft =
                p.components >= recipe.cost.components &&
                p.alloys >= recipe.cost.alloys &&
                p.materials >= recipe.cost.materials &&
                p.prestige >= recipe.cost.prestige;

            this.renderCraftCard(layer, panelX + 16, yOffset, panelW - 32, {
                name: recipe.name,
                emoji: recipe.emoji,
                cost: recipe.cost,
                affordability: {
                    components: p.components >= recipe.cost.components,
                    alloys: p.alloys >= recipe.cost.alloys,
                    materials: p.materials >= recipe.cost.materials,
                    prestige: p.prestige >= recipe.cost.prestige,
                },
                effect: recipe.description,
                canAfford: canCraft,
                onCraft: () => {
                    game.doCraft(recipe.id);
                    renderAll();
                },
            });

            yOffset += 72;
        }
    }

    private renderCraftCard(
        layer: PIXI.Container,
        x: number,
        y: number,
        w: number,
        options: {
            name: string;
            emoji: string;
            cost: { components: number; alloys: number; materials: number; prestige: number };
            affordability: { components: boolean; alloys: boolean; materials: boolean; prestige: boolean };
            effect: string;
            canAfford: boolean;
            onCraft: () => void;
        }
    ) {
        const h = 64;
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, w, h, 10);

        cardBg.fill({ color: options.canAfford ? 0x101826 : 0x0f1520, alpha: 0.95 });
        cardBg.stroke({ color: options.canAfford ? 0x2a4a6a : 0x1a2a3a, width: 1, alpha: 0.9 });
        layer.addChild(cardBg);

        const iconBg = new PIXI.Graphics();
        const iconSize = 42;
        iconBg.roundRect(x + 12, y + (h - iconSize) / 2, iconSize, iconSize, 10);
        iconBg.fill({ color: this.getIconBg(options.emoji), alpha: 0.25 });
        iconBg.stroke({ color: this.getIconBg(options.emoji), width: 1, alpha: 0.6 });
        layer.addChild(iconBg);

        // Emoji
        const emoji = new PIXI.Text({
            text: options.emoji,
            style: new PIXI.TextStyle({ fontSize: 22 }),
        });
        emoji.anchor.set(0.5);
        emoji.position.set(x + 12 + iconSize / 2, y + h / 2 + 1);
        layer.addChild(emoji);

        // Name
        const name = new PIXI.Text({
            text: options.name,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: options.canAfford ? 0xffffff : 0x7a8699,
                fontWeight: "700",
            }),
        });
        name.position.set(x + 66, y + 10);
        layer.addChild(name);

        // Effect
        const effect = new PIXI.Text({
            text: options.effect,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8c9bb0, fontWeight: "400" }),
        });
        effect.position.set(x + 66, y + 32);
        layer.addChild(effect);

        // Craft button
        const btnW = 70;
        const btnH = 26;
        const btnX = x + w - btnW - 12;
        const btnY = y + (h - btnH) / 2;

        const btn = new PIXI.Graphics();
        btn.roundRect(btnX, btnY, btnW, btnH, 6);

        if (options.canAfford) {
            btn.fill({ color: 0x1a4a35, alpha: 1 });
            btn.stroke({ color: 0x4ade80, width: 1 });
            btn.eventMode = "static";
            btn.cursor = "pointer";
            btn.on("pointerdown", options.onCraft);
        } else {
            btn.fill({ color: 0x1a202c, alpha: 0.8 });
            btn.stroke({ color: 0x333b4a, width: 1, alpha: 0.6 });
        }
        layer.addChild(btn);

        const btnText = new PIXI.Text({
            text: "CRAFT",
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: options.canAfford ? 0x4ade80 : 0x5a6476,
                fontWeight: "800",
            }),
        });
        btnText.anchor.set(0.5);
        btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
        layer.addChild(btnText);

        this.renderCostRow(layer, x + 66, y + 12, btnX - 12, options.cost, options.affordability);
    }

    private getIconBg(emoji: string): number {
        switch (emoji) {
            case "🔫":
            case "⚡":
            case "💥":
                return 0xff4444;
            case "🎲":
            case "🛡️":
                return 0x00aaff;
            case "💎":
                return 0xcc66ff;
            default:
                return 0x00ddff;
        }
    }

    private renderCostRow(
        layer: PIXI.Container,
        x: number,
        y: number,
        maxX: number,
        cost: { components: number; alloys: number; materials: number; prestige: number },
        affordability: { components: boolean; alloys: boolean; materials: boolean; prestige: boolean },
    ): void {
        const parts: Array<{ text: string; color: number; count: number }> = [
            {
                text: `🧩 ${cost.components}`,
                color: affordability.components ? 0xcc66ff : 0xff4444,
                count: cost.components,
            },
            { text: `⚙ ${cost.alloys}`, color: affordability.alloys ? 0x00ddff : 0xff4444, count: cost.alloys },
            {
                text: `🧱 ${cost.materials}`,
                color: affordability.materials ? 0xffaa00 : 0xff4444,
                count: cost.materials,
            },
            {
                text: `⭐ ${cost.prestige}`,
                color: affordability.prestige ? 0xffd700 : 0xff4444,
                count: cost.prestige,
            },
        ].filter(item => item.count > 0);

        const gap = 8;
        const texts = parts.map(part => {
            return new PIXI.Text({
                text: part.text,
                style: new PIXI.TextStyle({ fontSize: 11, fill: part.color, fontWeight: "700" }),
            });
        });

        const totalWidth =
            texts.reduce((sum, text) => sum + text.width, 0) + (texts.length > 0 ? gap * (texts.length - 1) : 0);
        const startX = Math.max(x, maxX - totalWidth);
        let currentX = startX;

        texts.forEach(text => {
            text.position.set(currentX, y);
            layer.addChild(text);
            currentX += text.width + gap;
        });
    }
}
