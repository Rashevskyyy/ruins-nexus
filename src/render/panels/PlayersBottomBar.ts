import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { Player } from "../../entities/Player";
import { RACES, type RaceId } from "../../entities/Race";
import { MODULES, type ModuleType } from "../../entities/BuildingType";
import { UNIT_DEFINITIONS } from "../../entities/Unit";

export type PlayersBottomBarContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    myPlayerIndex: number;
};

export class PlayersBottomBar {
    private popupContainer: PIXI.Container | null = null;
    private currentLayer: PIXI.Container | null = null;

    render(ctx: PlayersBottomBarContext): void {
        const { app, game, layer, playerColors, myPlayerIndex } = ctx;

        // Remove popup before clearing layer
        if (this.popupContainer && this.popupContainer.parent) {
            this.popupContainer.parent.removeChild(this.popupContainer);
        }

        layer.removeChildren();
        this.currentLayer = layer;

        const barHeight = 70;
        const barY = app.renderer.height - barHeight;

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, barY, app.renderer.width, barHeight);
        bg.fill({ color: 0x0a0e14 });
        // Top border
        bg.rect(0, barY, app.renderer.width, 1);
        bg.fill({ color: 0x1a2a3a });
        layer.addChild(bg);

        let x = 20;
        const players = game.state.players;
        const currentPlayerIndex = game.state.currentPlayerIndex;
        const myPlayer = players[myPlayerIndex];
        const isMyTurn = myPlayerIndex === currentPlayerIndex;

        // Current player (You) section
        if (myPlayer) {
            const currentSection = this.renderCurrentPlayer(myPlayer, playerColors[myPlayerIndex], isMyTurn, barY);
            currentSection.position.x = x;
            layer.addChild(currentSection);
            x += 200;

            // Divider
            const divider = new PIXI.Graphics();
            divider.rect(x, barY + 10, 1, barHeight - 20);
            divider.fill({ color: 0x2a3a4a, alpha: 0.5 });
            layer.addChild(divider);
            x += 20;
        }

        // Other players
        for (let i = 0; i < players.length; i++) {
            if (i === myPlayerIndex) continue;

            const player = players[i];
            const color = playerColors[i];
            const isPlaying = i === currentPlayerIndex;

            const card = this.renderPlayerCard(player, color, isPlaying, i, barY, game);
            card.position.x = x;
            layer.addChild(card);

            x += 220;
        }

        // Right side: Turn status + AP section
        const rightSection = this.renderTurnStatusSection(game, isMyTurn, barY, app.renderer.width);
        layer.addChild(rightSection);

        // Render popup if hovering
        if (this.popupContainer) {
            layer.addChild(this.popupContainer);
        }
    }

    private renderTurnStatusSection(game: Game, isMyTurn: boolean, barY: number, screenWidth: number): PIXI.Container {
        const container = new PIXI.Container();
        const width = 140;
        const height = 50;
        const x = screenWidth - width - 20;

        container.position.set(x, barY + 10);

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, width, height, 10);
        if (isMyTurn) {
            bg.fill({ color: 0x00ff88, alpha: 0.15 });
            bg.stroke({ color: 0x00ff88, width: 2 });
        } else {
            bg.fill({ color: 0xffaa00, alpha: 0.1 });
            bg.stroke({ color: 0xffaa00, width: 1 });
        }
        container.addChild(bg);

        // Turn label
        const turnText = isMyTurn ? "YOUR TURN" : "WAITING...";
        const turnColor = isMyTurn ? 0x00ff88 : 0xffaa00;

        const turnLabel = new PIXI.Text({
            text: turnText,
            style: { fontSize: 12, fill: turnColor, fontWeight: "700" },
        });
        turnLabel.anchor.set(0.5, 0);
        turnLabel.position.set(width / 2, 6);
        container.addChild(turnLabel);

        // AP dots
        const apStartX = width / 2 - 20;
        const apY = 30;

        for (let i = 0; i < 2; i++) {
            const dot = new PIXI.Graphics();
            const filled = i < game.state.actionPoints;
            dot.circle(apStartX + i * 22, apY, 8);

            if (filled) {
                dot.fill({ color: 0x00ff88 });
                dot.stroke({ color: 0x00aa55, width: 2 });
            } else {
                dot.fill({ color: 0x21262d });
                dot.stroke({ color: 0x484f58, width: 2 });
            }
            container.addChild(dot);
        }

        // AP label
        const apLabel = new PIXI.Text({
            text: "AP",
            style: { fontSize: 9, fill: 0x8b949e },
        });
        apLabel.anchor.set(0.5, 0);
        apLabel.position.set(width / 2 + 22, apY - 5);
        container.addChild(apLabel);

        return container;
    }

    private renderCurrentPlayer(player: Player, color: number, isMyTurn: boolean, barY: number): PIXI.Container {
        const container = new PIXI.Container();
        container.position.y = barY + 10;

        const width = 180;
        const height = 50;

        // Background with green glow
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, width, height, 10);
        bg.fill({ color: 0x00ff88, alpha: 0.1 });
        bg.stroke({ color: 0x00ff88, width: 2 });
        container.addChild(bg);

        // "Your Turn" badge
        if (isMyTurn) {
            const badge = new PIXI.Graphics();
            badge.roundRect(10, -8, 60, 16, 4);
            badge.fill({ color: 0x00ff88 });
            container.addChild(badge);

            const badgeText = new PIXI.Text({
                text: "YOUR TURN",
                style: { fontSize: 8, fill: 0x000000, fontWeight: "700" },
            });
            badgeText.position.set(14, -6);
            container.addChild(badgeText);
        }

        // Portrait
        const portrait = this.renderPortrait(player.raceId, color, 36);
        portrait.position.set(8, 7);
        container.addChild(portrait);

        // Name
        const name = new PIXI.Text({
            text: `${player.id} (You)`,
            style: { fontSize: 13, fill: 0x00ff88, fontWeight: "700" },
        });
        name.position.set(50, 6);
        container.addChild(name);

        // Stats row
        const hpText = new PIXI.Text({
            text: `❤️ ${player.hp}/${player.maxHp}`,
            style: { fontSize: 11, fill: 0xff6666, fontWeight: "600" },
        });
        hpText.position.set(50, 26);
        container.addChild(hpText);

        const prestigeText = new PIXI.Text({
            text: `⭐ ${player.prestige}`,
            style: { fontSize: 11, fill: 0xffd700, fontWeight: "600" },
        });
        prestigeText.position.set(110, 26);
        container.addChild(prestigeText);

        return container;
    }

    private renderPlayerCard(player: Player, color: number, isPlaying: boolean, _playerIndex: number, barY: number, game: Game): PIXI.Container {
        const container = new PIXI.Container();
        container.position.y = barY + 10;
        container.eventMode = "static";
        container.cursor = "pointer";

        const width = 200;
        const height = 50;

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, width, height, 10);
        if (isPlaying) {
            bg.fill({ color: 0xffaa00, alpha: 0.12 });
            bg.stroke({ color: 0xffaa00, width: 2 });
        } else {
            bg.fill({ color: 0xffffff, alpha: 0.03 });
            bg.stroke({ color: 0x1e2e3e, width: 1 });
        }
        container.addChild(bg);

        // "Playing" badge
        if (isPlaying) {
            const badge = new PIXI.Graphics();
            badge.roundRect(width / 2 - 30, -8, 60, 16, 4);
            badge.fill({ color: 0xffaa00 });
            container.addChild(badge);

            const badgeText = new PIXI.Text({
                text: "PLAYING",
                style: { fontSize: 8, fill: 0x000000, fontWeight: "700" },
            });
            badgeText.anchor.set(0.5, 0);
            badgeText.position.set(width / 2, -6);
            container.addChild(badgeText);
        }

        // Portrait
        const portrait = this.renderPortrait(player.raceId, color, 32);
        portrait.position.set(8, 9);
        container.addChild(portrait);

        // Name
        const name = new PIXI.Text({
            text: player.id,
            style: { fontSize: 12, fill: color, fontWeight: "700" },
        });
        name.position.set(46, 4);
        container.addChild(name);

        // Race name
        const race = player.raceId ? RACES[player.raceId] : null;
        if (race) {
            const raceText = new PIXI.Text({
                text: `${race.emoji} ${race.name}`,
                style: { fontSize: 10, fill: 0x00ff88 },
            });
            raceText.position.set(46, 18);
            container.addChild(raceText);
        }

        // Stats row
        const statsY = 34;
        const hpText = new PIXI.Text({
            text: `❤️${player.hp}`,
            style: { fontSize: 10, fill: 0xff6666, fontWeight: "600" },
        });
        hpText.position.set(46, statsY);
        container.addChild(hpText);

        const prestigeText = new PIXI.Text({
            text: `⭐${player.prestige}`,
            style: { fontSize: 10, fill: 0xffd700, fontWeight: "600" },
        });
        prestigeText.position.set(80, statsY);
        container.addChild(prestigeText);

        // Power range
        const powerRange = this.calculatePowerRange(player);
        const powerText = new PIXI.Text({
            text: `⚔${powerRange.min}-${powerRange.max}`,
            style: { fontSize: 10, fill: 0xffaa00, fontWeight: "600" },
        });
        powerText.position.set(114, statsY);
        container.addChild(powerText);

        // Mini equipment display
        const equipContainer = this.renderMiniEquipment(player);
        equipContainer.position.set(width - 50, 8);
        container.addChild(equipContainer);

        // Hover events (no scale, just highlight)
        container.on("pointerover", () => {
            bg.clear();
            bg.roundRect(0, 0, width, height, 10);
            if (isPlaying) {
                bg.fill({ color: 0xffaa00, alpha: 0.2 });
                bg.stroke({ color: 0xffaa00, width: 2 });
            } else {
                bg.fill({ color: 0x00aaff, alpha: 0.1 });
                bg.stroke({ color: 0x3a5a7a, width: 1 });
            }
            this.showPopup(player, color, container, game);
        });

        container.on("pointerout", () => {
            bg.clear();
            bg.roundRect(0, 0, width, height, 10);
            if (isPlaying) {
                bg.fill({ color: 0xffaa00, alpha: 0.12 });
                bg.stroke({ color: 0xffaa00, width: 2 });
            } else {
                bg.fill({ color: 0xffffff, alpha: 0.03 });
                bg.stroke({ color: 0x1e2e3e, width: 1 });
            }
            this.hidePopup();
        });

        return container;
    }

    private renderPortrait(raceId: RaceId | null, color: number, size: number): PIXI.Container {
        const container = new PIXI.Container();

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, size, size, 8);
        bg.fill({ color: 0x1a2a3a });
        bg.stroke({ color: color, width: 2 });
        container.addChild(bg);

        const race = raceId ? RACES[raceId] : null;
        const emoji = new PIXI.Text({
            text: race?.emoji || "👤",
            style: { fontSize: size * 0.55 },
        });
        emoji.anchor.set(0.5);
        emoji.position.set(size / 2, size / 2);
        container.addChild(emoji);

        return container;
    }

    private renderMiniEquipment(player: Player): PIXI.Container {
        const container = new PIXI.Container();
        const slotSize = 16;
        const gap = 3;

        // Weapons row
        for (let i = 0; i < 2; i++) {
            const weapon = player.inventory.weapons[i];
            const slot = this.renderMiniSlot(slotSize, weapon?.emoji || null, 0xff6666);
            slot.position.set(i * (slotSize + gap), 0);
            container.addChild(slot);
        }

        // Spells row
        for (let i = 0; i < 2; i++) {
            const spell = player.inventory.spells[i];
            const slot = this.renderMiniSlot(slotSize, spell?.emoji || null, 0x00aaff);
            slot.position.set(i * (slotSize + gap), slotSize + gap);
            container.addChild(slot);
        }

        return container;
    }

    private renderMiniSlot(size: number, icon: string | null, filledColor: number): PIXI.Graphics {
        const slot = new PIXI.Graphics();
        slot.roundRect(0, 0, size, size, 4);
        if (icon) {
            slot.fill({ color: filledColor, alpha: 0.15 });
            slot.stroke({ color: filledColor, width: 1, alpha: 0.6 });

            const iconText = new PIXI.Text({
                text: icon,
                style: { fontSize: size * 0.6 },
            });
            iconText.anchor.set(0.5);
            iconText.position.set(size / 2, size / 2);
            slot.addChild(iconText);
        } else {
            slot.fill({ color: 0x000000, alpha: 0.3 });
            slot.stroke({ color: 0x1a2a3a, width: 1 });
        }
        return slot;
    }

    private showPopup(player: Player, color: number, cardContainer: PIXI.Container, game: Game): void {
        this.hidePopup();

        const popup = new PIXI.Container();
        const popupWidth = 300;
        const popupX = cardContainer.position.x + 100 - popupWidth / 2;
        const popupY = cardContainer.position.y - 15;

        // Build popup content
        const content = this.buildPopupContent(player, color, popupWidth, game);
        const popupHeight = content.height + 20;

        // Background
        const bg = new PIXI.Graphics();
        bg.roundRect(0, -popupHeight, popupWidth, popupHeight, 12);
        bg.fill({ color: 0x0d1520 });
        bg.stroke({ color: 0x2a4a6a, width: 1 });
        popup.addChild(bg);

        // Arrow
        const arrow = new PIXI.Graphics();
        arrow.moveTo(popupWidth / 2 - 10, 0);
        arrow.lineTo(popupWidth / 2, 8);
        arrow.lineTo(popupWidth / 2 + 10, 0);
        arrow.closePath();
        arrow.fill({ color: 0x0d1520 });
        popup.addChild(arrow);

        content.position.set(12, -popupHeight + 12);
        popup.addChild(content);

        popup.position.set(popupX, popupY);
        this.popupContainer = popup;

        // Add popup directly to layer
        if (this.currentLayer) {
            this.currentLayer.addChild(popup);
        }
    }

    private hidePopup(): void {
        if (this.popupContainer) {
            this.popupContainer.destroy({ children: true });
            this.popupContainer = null;
        }
    }

    private buildPopupContent(player: Player, color: number, width: number, _game: Game): PIXI.Container {
        const container = new PIXI.Container();
        const contentWidth = width - 24;
        let y = 0;

        // Header section
        const header = this.buildPopupHeader(player, color, contentWidth);
        header.position.y = y;
        container.addChild(header);
        y += 60;

        // Divider
        const divider1 = new PIXI.Graphics();
        divider1.rect(0, y, contentWidth, 1);
        divider1.fill({ color: 0x2a3a4a });
        container.addChild(divider1);
        y += 10;

        // Stats row
        const stats = this.buildPopupStats(player, contentWidth);
        stats.position.y = y;
        container.addChild(stats);
        y += 45;

        // Equipment section
        const equipment = this.buildPopupEquipment(player, contentWidth);
        equipment.position.y = y;
        container.addChild(equipment);
        y += equipment.height + 10;

        // Base modules section
        const baseModules = this.buildPopupBaseModules(player, contentWidth);
        baseModules.position.y = y;
        container.addChild(baseModules);
        y += baseModules.height;

        return container;
    }

    private buildPopupHeader(player: Player, color: number, width: number): PIXI.Container {
        const container = new PIXI.Container();

        // Portrait
        const portrait = this.renderPortrait(player.raceId, color, 44);
        container.addChild(portrait);

        // Name
        const name = new PIXI.Text({
            text: player.id,
            style: { fontSize: 16, fill: color, fontWeight: "700" },
        });
        name.position.set(54, 2);
        container.addChild(name);

        // Race
        const race = player.raceId ? RACES[player.raceId] : null;
        if (race) {
            const raceText = new PIXI.Text({
                text: `${race.emoji} ${race.name}`,
                style: { fontSize: 11, fill: 0x00ff88 },
            });
            raceText.position.set(54, 20);
            container.addChild(raceText);

            // Race passive
            const passiveText = new PIXI.Text({
                text: race.passiveDescription,
                style: { fontSize: 9, fill: 0x888888, wordWrap: true, wordWrapWidth: width - 120 },
            });
            passiveText.position.set(54, 34);
            container.addChild(passiveText);
        }

        // Power box
        const powerRange = this.calculatePowerRange(player);
        const powerBox = new PIXI.Graphics();
        powerBox.roundRect(width - 55, 5, 55, 40, 8);
        powerBox.fill({ color: 0x000000, alpha: 0.3 });
        container.addChild(powerBox);

        const powerLabel = new PIXI.Text({
            text: "POWER",
            style: { fontSize: 8, fill: 0x666666 },
        });
        powerLabel.anchor.set(0.5, 0);
        powerLabel.position.set(width - 27, 8);
        container.addChild(powerLabel);

        const powerValue = new PIXI.Text({
            text: `${powerRange.min}-${powerRange.max}`,
            style: { fontSize: 16, fill: 0xffaa00, fontWeight: "700" },
        });
        powerValue.anchor.set(0.5, 0);
        powerValue.position.set(width - 27, 22);
        container.addChild(powerValue);

        return container;
    }

    private buildPopupStats(player: Player, width: number): PIXI.Container {
        const container = new PIXI.Container();

        const stats = [
            { icon: "❤️", value: `${player.hp}/${player.maxHp}`, color: 0xff6666 },
            { icon: "🧬", value: `${player.biomass}`, color: 0x00ff88 },
            { icon: "🧱", value: `${player.materials}`, color: 0xffaa00 },
            { icon: "⚙️", value: `${player.alloys}`, color: 0x00ddff },
            { icon: "🧩", value: `${player.components}`, color: 0xcc66ff },
        ];

        const statWidth = width / stats.length;
        stats.forEach((stat, i) => {
            const statBox = new PIXI.Graphics();
            statBox.roundRect(i * statWidth + 2, 0, statWidth - 4, 35, 6);
            statBox.fill({ color: 0x000000, alpha: 0.25 });
            container.addChild(statBox);

            const icon = new PIXI.Text({
                text: stat.icon,
                style: { fontSize: 14 },
            });
            icon.anchor.set(0.5, 0);
            icon.position.set(i * statWidth + statWidth / 2, 3);
            container.addChild(icon);

            const value = new PIXI.Text({
                text: stat.value,
                style: { fontSize: 12, fill: stat.color, fontWeight: "700" },
            });
            value.anchor.set(0.5, 0);
            value.position.set(i * statWidth + statWidth / 2, 19);
            container.addChild(value);
        });

        return container;
    }

    private buildPopupEquipment(player: Player, width: number): PIXI.Container {
        const container = new PIXI.Container();

        // Title
        const equipmentCount = this.countEquipment(player);
        const title = new PIXI.Text({
            text: `⚔️ Equipment (${equipmentCount})`,
            style: { fontSize: 9, fill: 0x666666 },
        });
        container.addChild(title);

        let y = 16;
        const items: { icon: string; name: string; type: "weapon" | "module" | "amulet" }[] = [];

        // Weapons
        player.inventory.weapons.forEach(w => {
            if (w) {
                items.push({ icon: w.emoji, name: w.name, type: "weapon" });
            }
        });

        // Spells/Modules
        player.inventory.spells.forEach(s => {
            if (s) {
                items.push({ icon: s.emoji, name: s.name, type: "module" });
            }
        });

        // Amulet
        if (player.inventory.amulet) {
            items.push({ icon: player.inventory.amulet.emoji, name: player.inventory.amulet.name, type: "amulet" });
        }

        if (items.length === 0) {
            const emptyText = new PIXI.Text({
                text: "No equipment yet",
                style: { fontSize: 10, fill: 0x444444, fontStyle: "italic" },
            });
            emptyText.position.y = y;
            container.addChild(emptyText);
            y += 18;
        } else {
            // Render items in a flex wrap manner
            let x = 0;
            const itemHeight = 22;
            const gap = 6;

            items.forEach(item => {
                const itemContainer = this.renderEquipmentItem(item.icon, item.name, item.type);
                const itemWidth = itemContainer.width;

                if (x + itemWidth > width && x > 0) {
                    x = 0;
                    y += itemHeight + gap;
                }

                itemContainer.position.set(x, y);
                container.addChild(itemContainer);
                x += itemWidth + gap;
            });

            y += itemHeight + gap;
        }

        return container;
    }

    private renderEquipmentItem(icon: string, name: string, type: "weapon" | "module" | "amulet"): PIXI.Container {
        const container = new PIXI.Container();

        const colors = {
            weapon: 0xff6666,
            module: 0x00aaff,
            amulet: 0xcc66ff,
        };
        const borderColor = colors[type];

        const text = new PIXI.Text({
            text: `${icon} ${name}`,
            style: { fontSize: 10, fill: 0xcccccc },
        });

        const padding = 6;
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, text.width + padding * 2 + 3, 20, 6);
        bg.fill({ color: 0x000000, alpha: 0.3 });
        // Left border
        bg.rect(0, 3, 3, 14);
        bg.fill({ color: borderColor });
        container.addChild(bg);

        text.position.set(padding + 3, 4);
        container.addChild(text);

        return container;
    }

    private buildPopupBaseModules(player: Player, width: number): PIXI.Container {
        const container = new PIXI.Container();

        // Title
        const moduleCount = player.modules.length;
        const title = new PIXI.Text({
            text: `🏠 Base Modules (${moduleCount}/8)`,
            style: { fontSize: 9, fill: 0x666666 },
        });
        container.addChild(title);

        let y = 16;

        if (!player.basePosition) {
            const emptyText = new PIXI.Text({
                text: "No base built",
                style: { fontSize: 10, fill: 0x444444, fontStyle: "italic" },
            });
            emptyText.position.y = y;
            container.addChild(emptyText);
            y += 18;
        } else if (moduleCount === 0) {
            const emptyText = new PIXI.Text({
                text: "No modules built",
                style: { fontSize: 10, fill: 0x444444, fontStyle: "italic" },
            });
            emptyText.position.y = y;
            container.addChild(emptyText);
            y += 18;
        } else {
            let x = 0;
            const slotSize = 28;
            const gap = 6;

            player.modules.forEach(moduleType => {
                const moduleDef = MODULES[moduleType];
                if (!moduleDef) return;

                const slot = new PIXI.Graphics();
                slot.roundRect(x, y, slotSize, slotSize, 6);
                slot.fill({ color: 0x4ade80, alpha: 0.15 });
                slot.stroke({ color: 0x4ade80, width: 1 });
                container.addChild(slot);

                // Use first letter of module type as icon
                const icon = new PIXI.Text({
                    text: moduleType.charAt(0),
                    style: { fontSize: 14, fill: 0x4ade80, fontWeight: "700" },
                });
                icon.anchor.set(0.5);
                icon.position.set(x + slotSize / 2, y + slotSize / 2);
                container.addChild(slot);
                container.addChild(icon);

                x += slotSize + gap;
                if (x + slotSize > width) {
                    x = 0;
                    y += slotSize + gap;
                }
            });

            y += slotSize + gap;
        }

        return container;
    }

    private countEquipment(player: Player): number {
        let count = 0;
        player.inventory.weapons.forEach(w => { if (w) count++; });
        player.inventory.spells.forEach(s => { if (s) count++; });
        if (player.inventory.amulet) count++;
        return count;
    }

    private calculatePowerRange(player: Player): { min: number; max: number } {
        let baseDice = 3;
        let bonusSwords = 0;

        // Weapons with combat effects (simplified - just count weapons)
        player.inventory.weapons.forEach(w => {
            if (w) {
                // Common weapons typically give +1
                bonusSwords += 1;
            }
        });

        // Modules like AssaultBay
        if (player.modules.includes("AssaultBay" as ModuleType)) {
            bonusSwords += 1;
        }

        // Units - check unit type for combat bonuses
        player.units.forEach(u => {
            if (u) {
                const unitDef = UNIT_DEFINITIONS[u.type];
                // Assault type units give +1 sword
                if (unitDef && u.type === "assault") {
                    bonusSwords += 1;
                }
            }
        });

        const min = 0 + bonusSwords; // Minimum is all skulls
        const max = baseDice + bonusSwords; // Maximum is all swords

        return { min, max };
    }
}
