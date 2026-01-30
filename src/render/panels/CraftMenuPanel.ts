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
    playerColors: number[];
    canShowHint: (id: string) => boolean;
    showHint: (id: string, title: string, message: string, options?: ShowHintOptions) => void;
    renderAll: () => void;
};

export class CraftMenuPanel {
    private activeCategory: "weapon" | "module" | "amulet" = "weapon";

    render({ app, game, layer, playerColors, canShowHint, showHint, renderAll }: CraftMenuContext): void {
        layer.removeChildren();

        // Only show in CRAFT_MENU mode
        if (game.state.uiMode !== "CRAFT_MENU") return;

        const p = game.state.players[game.state.currentPlayerIndex];
        const playerIndex = game.state.currentPlayerIndex;
        const playerColor = playerColors[playerIndex % playerColors.length];

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
        const panelW = 450;
        const panelH = 550;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;

        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: playerColor, width: 4, alpha: 1 });
        panel.eventMode = "static";
        layer.addChild(panel);

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
            text: "🔧 Craft Items",
            style: new PIXI.TextStyle({
                fontSize: 24,
                fill: playerColor,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 4, color: 0x000000, distance: 3 },
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        layer.addChild(title);

        const categories: Array<{ id: "weapon" | "module" | "amulet"; label: string; emoji: string }> = [
            { id: "weapon", label: "Weapons", emoji: "⚔" },
            { id: "module", label: "Modules", emoji: "🔧" },
            { id: "amulet", label: "Amulets", emoji: "📿" },
        ];

        let tabX = panelX + 20;
        const tabY = panelY + 48;
        for (const category of categories) {
            const isActive = this.activeCategory === category.id;
            const tab = new PIXI.Graphics();
            tab.roundRect(tabX, tabY, 100, 24, 8);
            tab.fill({ color: isActive ? 0x3b82f6 : 0x2d3748, alpha: 0.9 });
            tab.stroke({ color: isActive ? 0x60a5fa : 0x4b5563, width: 1 });
            tab.eventMode = "static";
            tab.cursor = "pointer";
            tab.on("pointerdown", () => {
                this.activeCategory = category.id;
                renderAll();
            });
            layer.addChild(tab);

            const tabLabel = new PIXI.Text({
                text: `${category.emoji} ${category.label}`,
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xf8fafc, fontWeight: "700" }),
            });
            tabLabel.anchor.set(0.5);
            tabLabel.position.set(tabX + 50, tabY + 12);
            layer.addChild(tabLabel);

            tabX += 110;
        }

        // Resources
        const resourceText = new PIXI.Text({
            text: `Resources: 🧩${p.components}  ⚙${p.alloys}  🧱${p.materials}  ⭐${p.prestige}`,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0, fontWeight: "600" }),
        });
        resourceText.position.set(panelX + 20, panelY + 78);
        layer.addChild(resourceText);

        // Close button
        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", () => {
            game.state.uiMode = "NONE";
            renderAll();
        });
        layer.addChild(closeBtn);

        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        layer.addChild(closeX);

        const yOffset = panelY + 110;

        // Get filtered recipes
        const allRecipes = game.getAllCraftRecipes().filter(recipe => recipe.result.type === this.activeCategory);
        const columns = allRecipes.length > 8 ? 2 : 1;
        const columnGap = 12;
        const columnWidth = (panelW - 32 - (columns - 1) * columnGap) / columns;

        for (let i = 0; i < allRecipes.length; i++) {
            const recipe = allRecipes[i];
            const canCraft =
                p.components >= recipe.cost.components &&
                p.alloys >= recipe.cost.alloys &&
                p.materials >= recipe.cost.materials &&
                p.prestige >= recipe.cost.prestige;

            const column = i % columns;
            const row = Math.floor(i / columns);
            const cardX = panelX + 16 + column * (columnWidth + columnGap);
            const cardY = yOffset + row * 62;

            this.renderCraftCard(layer, cardX, cardY, columnWidth, {
                name: recipe.name,
                emoji: recipe.emoji,
                cost: this.formatCraftCost(recipe.cost),
                effect: recipe.description,
                canAfford: canCraft,
                onCraft: () => {
                    game.doCraft(recipe.id);
                    renderAll();
                },
            });
        }
    }

    private formatCraftCost(cost: { components: number; alloys: number; materials: number; prestige: number }): string {
        const parts: string[] = [];
        if (cost.components > 0) parts.push(`${cost.components}🧩`);
        if (cost.alloys > 0) parts.push(`${cost.alloys}⚙`);
        if (cost.materials > 0) parts.push(`${cost.materials}🧱`);
        if (cost.prestige > 0) parts.push(`${cost.prestige}⭐`);
        return parts.join(" ");
    }

    private renderCraftCard(
        layer: PIXI.Container,
        x: number,
        y: number,
        w: number,
        options: {
            name: string;
            emoji: string;
            cost: string;
            effect: string;
            canAfford: boolean;
            onCraft: () => void;
        }
    ) {
        const h = 55;
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, w, h, 10);

        if (options.canAfford) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0x9333ea, width: 2, alpha: 0.8 }); // Purple for crafting
        } else {
            cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
            cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
        }
        layer.addChild(cardBg);

        // Emoji
        const emoji = new PIXI.Text({
            text: options.emoji,
            style: new PIXI.TextStyle({ fontSize: 24 }),
        });
        emoji.position.set(x + 12, y + 14);
        layer.addChild(emoji);

        // Name
        const name = new PIXI.Text({
            text: options.name,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: options.canAfford ? 0xffffff : 0x718096,
                fontWeight: "700",
            }),
        });
        name.position.set(x + 48, y + 8);
        layer.addChild(name);

        // Effect
        const effect = new PIXI.Text({
            text: options.effect,
            style: new PIXI.TextStyle({ fontSize: 10, fill: 0xa0aec0, fontWeight: "400" }),
        });
        effect.position.set(x + 48, y + 28);
        layer.addChild(effect);

        // Cost
        const cost = new PIXI.Text({
            text: options.cost,
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: options.canAfford ? 0x48bb78 : 0xe53e3e,
                fontWeight: "600",
            }),
        });
        cost.anchor.set(1, 0);
        cost.position.set(x + w - 80, y + 10);
        layer.addChild(cost);

        // Craft button
        const btnW = 60;
        const btnH = 26;
        const btnX = x + w - btnW - 10;
        const btnY = y + (h - btnH) / 2;

        const btn = new PIXI.Graphics();
        btn.roundRect(btnX, btnY, btnW, btnH, 6);

        if (options.canAfford) {
            btn.fill({ color: 0x9333ea, alpha: 1 }); // Purple
            btn.stroke({ color: 0xa855f7, width: 2 });
            btn.eventMode = "static";
            btn.cursor = "pointer";
            btn.on("pointerdown", options.onCraft);
        } else {
            btn.fill({ color: 0x4a5568, alpha: 0.5 });
        }
        layer.addChild(btn);

        const btnText = new PIXI.Text({
            text: "CRAFT",
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: options.canAfford ? 0xffffff : 0x718096,
                fontWeight: "800",
            }),
        });
        btnText.anchor.set(0.5);
        btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
        layer.addChild(btnText);
    }
}
