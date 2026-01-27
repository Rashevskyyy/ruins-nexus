import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { ModuleType } from "../../entities/BuildingType";

type ShowHintOptions = {
    x?: number;
    y?: number;
    anchor?: "center" | "top" | "bottom";
    showOnce?: boolean;
    highlightRect?: { x: number; y: number; width: number; height: number };
};

type BuildMenuContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    shownHints: Set<string>;
    hintsEnabled: boolean;
    showHint: (id: string, title: string, message: string, options?: ShowHintOptions) => void;
    renderAll: () => void;
};

export class BuildMenuPanel {
    render({ app, game, layer, playerColors, shownHints, hintsEnabled, showHint, renderAll }: BuildMenuContext): void {
        layer.removeChildren();

        // Показываем только в режиме BUILD_MENU
        if (game.state.uiMode !== "BUILD_MENU") return;

        const p = game.state.players[game.state.currentPlayerIndex];
        const playerIndex = game.state.currentPlayerIndex;
        const playerColor = playerColors[playerIndex % playerColors.length];

        const screenW = app.renderer.width;
        const screenH = app.renderer.height;
        const isBase = game.canBuildBase();

        const closeMenu = () => {
            game.state.uiMode = "NONE";
            renderAll();
        };

        // Затемнение фона (backdrop)
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        backdrop.cursor = "pointer";
        backdrop.on("pointerdown", closeMenu);
        layer.addChild(backdrop);

        // Панель меню
        const panelW = 420;
        const panelH = 520;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;

        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x1a1f2e, alpha: 0.98 });
        panel.stroke({ color: playerColor, width: 4, alpha: 1 });
        panel.eventMode = "static"; // Блокируем клики на backdrop
        layer.addChild(panel);

        if (!shownHints.has("build_menu") && hintsEnabled) {
            const hintMessage = isBase
                ? "Build your first Base here. It costs 2 🧱 Materials and unlocks Modules + Crafting."
                : "Each module card shows its cost. Green prices mean you can afford it right now.";
            showHint(
                "build_menu",
                "🏗️ Build Menu",
                hintMessage,
                {
                    anchor: "top",
                    x: panelX + panelW / 2,
                    y: panelY - 10,
                    highlightRect: { x: panelX, y: panelY, width: panelW, height: panelH },
                }
            );
        }

        // Заголовок
        const titleText = isBase ? "🏠 Build Base" : "🏗 Build Modules";

        const title = new PIXI.Text({
            text: titleText,
            style: new PIXI.TextStyle({
                fontSize: 24,
                fill: playerColor,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 4, color: 0x000000, distance: 3 },
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        layer.addChild(title);

        // Ресурсы игрока
        const resourceText = new PIXI.Text({
            text: `Your resources: 🧱${p.materials}  ⚙${p.alloys}  🧬${p.biomass}`,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xa0aec0, fontWeight: "600" }),
        });
        resourceText.position.set(panelX + 20, panelY + 50);
        layer.addChild(resourceText);

        // Кнопка закрыть
        const closeBtn = new PIXI.Graphics();
        closeBtn.circle(panelX + panelW - 24, panelY + 24, 14);
        closeBtn.fill({ color: 0xff4444, alpha: 0.9 });
        closeBtn.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
        closeBtn.eventMode = "static";
        closeBtn.cursor = "pointer";
        closeBtn.on("pointerdown", closeMenu);
        layer.addChild(closeBtn);

        const closeX = new PIXI.Text({
            text: "✕",
            style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff, fontWeight: "900" }),
        });
        closeX.anchor.set(0.5);
        closeX.position.set(panelX + panelW - 24, panelY + 24);
        layer.addChild(closeX);

        let yOffset = panelY + 80;

        if (isBase) {
            // Show Base card
            this.renderBuildingCard(layer, panelX + 16, yOffset, panelW - 32, {
                name: "Base",
                emoji: "🏠",
                cost: "2 🧱",
                effect: "Your base - build modules here",
                canAfford: p.materials >= 2,
                onBuild: () => {
                    game.doBuildBase();
                    closeMenu();
                },
            });
        } else {
            // Показываем все здания (districts)
            const buildings = [
                { type: "AssaultBay", emoji: "⚔️", name: "Assault Bay", cost: "2🧱 1⚙", effect: "+1 damage on ⚔ roll", costCheck: p.materials >= 2 && p.alloys >= 1 },
                { type: "ShieldArray", emoji: "🛡️", name: "Shield Array", cost: "2🧱 1⚙", effect: "Ignore 1 💀 per combat", costCheck: p.materials >= 2 && p.alloys >= 1 },
                { type: "TacticalUplink", emoji: "📡", name: "Tactical Uplink", cost: "1🧱 2⚙", effect: "1 reroll per combat", costCheck: p.materials >= 1 && p.alloys >= 2 },
                { type: "SupplyDepot", emoji: "📦", name: "Supply Depot", cost: "3🧱", effect: "+1 resource on Gather", costCheck: p.materials >= 3 },
                { type: "RelicVault", emoji: "🔮", name: "Relic Vault", cost: "2🧱 2⚙", effect: "Activates relics", costCheck: p.materials >= 2 && p.alloys >= 2 },
                { type: "BeaconSpire", emoji: "📡", name: "Beacon Spire", cost: "3🧱 3⚙", effect: "Ultimate power", costCheck: p.materials >= 3 && p.alloys >= 3 },
            ];

            for (const b of buildings) {
                const alreadyBuilt = p.modules.includes(b.type as ModuleType);

                this.renderBuildingCard(layer, panelX + 16, yOffset, panelW - 32, {
                    name: b.name,
                    emoji: b.emoji,
                    cost: b.cost,
                    effect: b.effect,
                    canAfford: b.costCheck && !alreadyBuilt,
                    alreadyBuilt,
                    onBuild: () => {
                        game.doBuildModules([b.type as ModuleType]);
                        renderAll(); // Обновляем UI, не закрываем меню
                    },
                });

                yOffset += 68;
            }
        }
    }

    private renderBuildingCard(
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
            alreadyBuilt?: boolean;
            onBuild: () => void;
        }
    ): void {
        const h = 60;
        const cardBg = new PIXI.Graphics();
        cardBg.roundRect(x, y, w, h, 10);

        if (options.alreadyBuilt) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.5 });
            cardBg.stroke({ color: 0x48bb78, width: 2, alpha: 0.8 });
        } else if (options.canAfford) {
            cardBg.fill({ color: 0x2d3748, alpha: 0.9 });
            cardBg.stroke({ color: 0xffd700, width: 2, alpha: 0.8 });
        } else {
            cardBg.fill({ color: 0x1a202c, alpha: 0.7 });
            cardBg.stroke({ color: 0x4a5568, width: 1, alpha: 0.5 });
        }
        layer.addChild(cardBg);

        // Emoji
        const emoji = new PIXI.Text({
            text: options.emoji,
            style: new PIXI.TextStyle({ fontSize: 28 }),
        });
        emoji.position.set(x + 16, y + 14);
        layer.addChild(emoji);

        // Name
        const name = new PIXI.Text({
            text: options.name,
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: options.alreadyBuilt ? 0x48bb78 : (options.canAfford ? 0xffffff : 0x718096),
                fontWeight: "700",
            }),
        });
        name.position.set(x + 56, y + 10);
        layer.addChild(name);

        // Effect
        const effect = new PIXI.Text({
            text: options.effect,
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0xa0aec0, fontWeight: "400" }),
        });
        effect.position.set(x + 56, y + 32);
        layer.addChild(effect);

        // Cost
        const cost = new PIXI.Text({
            text: options.cost,
            style: new PIXI.TextStyle({
                fontSize: 13,
                fill: options.canAfford ? 0x48bb78 : 0xe53e3e,
                fontWeight: "600",
            }),
        });
        cost.anchor.set(1, 0);
        cost.position.set(x + w - 80, y + 12);
        layer.addChild(cost);

        // Build button
        if (!options.alreadyBuilt) {
            const btnW = 60;
            const btnH = 28;
            const btnX = x + w - btnW - 10;
            const btnY = y + (h - btnH) / 2;

            const btn = new PIXI.Graphics();
            btn.roundRect(btnX, btnY, btnW, btnH, 6);

            if (options.canAfford) {
                btn.fill({ color: 0x48bb78, alpha: 1 });
                btn.stroke({ color: 0x68d391, width: 2 });
                btn.eventMode = "static";
                btn.cursor = "pointer";
                btn.on("pointerdown", options.onBuild);
            } else {
                btn.fill({ color: 0x4a5568, alpha: 0.5 });
            }
            layer.addChild(btn);

            const btnText = new PIXI.Text({
                text: "BUILD",
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: options.canAfford ? 0xffffff : 0x718096,
                    fontWeight: "800",
                }),
            });
            btnText.anchor.set(0.5);
            btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
            layer.addChild(btnText);
        } else {
            // Already built badge
            const badge = new PIXI.Text({
                text: "✓ BUILT",
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x48bb78, fontWeight: "700" }),
            });
            badge.anchor.set(1, 0.5);
            badge.position.set(x + w - 16, y + h / 2);
            layer.addChild(badge);
        }
    }
}
