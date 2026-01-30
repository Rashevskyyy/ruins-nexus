import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import { TileType } from "../../board/TileTypes";
import type { TutorialHintsManager } from "../ui/TutorialHintsManager";
import type { Player } from "../../entities/Player";

export type HudRendererOptions = {
    app: PIXI.Application;
    game: Game;
    hudLayer: PIXI.Container;
    hudBg: PIXI.Graphics;
    hudText: PIXI.Text;
    rotateButton: { bg: PIXI.Graphics; label: PIXI.Text };
    placeTileButton: { bg: PIXI.Graphics; label: PIXI.Text };
    topStatusLayer: PIXI.Container;
    combatSummaryLayer: PIXI.Container;
    contextHintLayer: PIXI.Container;
    playerColors: number[];
    isMyTurn: () => boolean;
    getMyPlayerIndex: () => number;
    tutorialHints: TutorialHintsManager;
    onToggleSettings: () => void;
    onRenderAll: () => void;
};

export class HudRenderer {
    constructor(private options: HudRendererOptions) {}

    public createRotateButton(): void {
        const { bg, label } = this.options.rotateButton;
        bg.eventMode = "static";
        bg.cursor = "pointer";
        label.anchor.set(0.5);
        label.eventMode = "none";

        bg.on("pointerdown", () => {
            if (!this.options.isMyTurn()) return;
            if (this.options.game.state.uiMode !== "TILE_PLACEMENT") return;
            this.options.game.rotatePendingTile();
            this.options.onRenderAll();
        });

        this.options.hudLayer.addChild(bg);
        this.options.hudLayer.addChild(label);
    }

    public createPlaceTileButton(): void {
        const { bg, label } = this.options.placeTileButton;
        bg.eventMode = "static";
        bg.cursor = "pointer";
        label.anchor.set(0.5);
        label.eventMode = "none";

        bg.on("pointerdown", () => {
            if (!this.options.isMyTurn()) return;
            if (this.options.game.state.uiMode !== "TILE_PLACEMENT") return;
            if (!this.options.game.state.selectedPlacementPosition) return;
            this.options.game.placeTileAtSelected();
            this.options.onRenderAll();
        });

        this.options.hudLayer.addChild(bg);
        this.options.hudLayer.addChild(label);
    }

    public renderHUD(): void {
        this.options.hudBg.visible = false;
        this.options.hudText.visible = false;

        this.options.rotateButton.bg.visible = false;
        this.options.rotateButton.label.visible = false;
        this.options.placeTileButton.bg.visible = false;
        this.options.placeTileButton.label.visible = false;
    }

    public renderTopStatusBar(): void {
        this.options.topStatusLayer.removeChildren();

        const w = this.options.app.renderer.width;
        const h = 56;
        const p = this.options.game.state.players[this.options.game.state.currentPlayerIndex];

        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x0d1117, alpha: 0.98 });
        this.options.topStatusLayer.addChild(bg);

        let phaseText = "";
        let phaseColor = 0x00ff88;
        let phaseBgColor = 0x0a2a1a;
        let tilesRemaining = 0;
        let totalTiles = 31;
        let showTilesBar = false;

        if (this.options.game.state.gameOver) {
            if (this.options.game.state.missionFailed) {
                phaseText = "💀 MISSION FAILED";
                phaseColor = 0xff4444;
                phaseBgColor = 0x3a1a1a;
            } else {
                phaseText = "🏆 VICTORY";
                phaseColor = 0xffd700;
                phaseBgColor = 0x3a3a1a;
            }
        } else if (this.options.game.state.finalTrialStarted) {
            phaseText = "⚡ FINAL TRIAL";
            phaseColor = 0xff6b6b;
            phaseBgColor = 0x3a1a2a;
        } else if (this.options.game.state.isFinalPreparation) {
            phaseText = `🔧 ORBITAL • ${this.options.game.state.finalPrepRoundsLeft} rounds`;
            phaseColor = 0xffaa00;
            phaseBgColor = 0x3a2a1a;
        } else if (this.options.game.state.isFinalPhase) {
            phaseText = `🚨 FINAL • ${this.options.game.state.finalRoundsLeft} rounds`;
            phaseColor = 0xff4444;
            phaseBgColor = 0x3a1a1a;
        } else {
            phaseText = "🔍 EXPLORATION";
            phaseColor = 0x00ff88;
            phaseBgColor = 0x0a2a1a;
            tilesRemaining = this.options.game.state.tileDeck.getRemainingCount();
            showTilesBar = true;
        }

        const plateW = 280;
        const plateH = 44;
        const plateX = (w - plateW) / 2;
        const plateY = 6;

        const phasePlate = new PIXI.Graphics();
        phasePlate.roundRect(plateX, plateY, plateW, plateH, 10);
        phasePlate.fill({ color: phaseBgColor, alpha: 1 });
        phasePlate.stroke({ color: phaseColor, width: 2, alpha: 0.8 });
        this.options.topStatusLayer.addChild(phasePlate);

        const phaseLabel = new PIXI.Text({
            text: phaseText,
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: phaseColor,
                fontWeight: "900",
                letterSpacing: 2,
                dropShadow: { color: phaseColor, blur: 12, alpha: 0.7, distance: 0 },
            }),
        });
        phaseLabel.anchor.set(0.5);
        phaseLabel.position.set(w / 2, showTilesBar ? plateY + 13 : plateY + plateH / 2);
        this.options.topStatusLayer.addChild(phaseLabel);

        if (showTilesBar) {
            const barW = plateW - 20;
            const barH = 16;
            const barX = plateX + 10;
            const barY = plateY + 26;

            const tilesBarBg = new PIXI.Graphics();
            tilesBarBg.roundRect(barX, barY, barW, barH, 6);
            tilesBarBg.fill({ color: 0x0a0f1a });
            tilesBarBg.stroke({ color: 0x00d4ff, width: 2, alpha: 0.6 });
            this.options.topStatusLayer.addChild(tilesBarBg);

            const fillRatio = tilesRemaining / totalTiles;
            const fillW = Math.max(barW * fillRatio, 4);

            let fillColor = 0x00d4ff;
            if (fillRatio < 0.25) fillColor = 0xff4444;
            else if (fillRatio < 0.5) fillColor = 0xffaa00;

            const tilesBarFill = new PIXI.Graphics();
            tilesBarFill.roundRect(barX + 2, barY + 2, fillW - 4, barH - 4, 4);
            tilesBarFill.fill({ color: fillColor });
            this.options.topStatusLayer.addChild(tilesBarFill);

            const tilesText = new PIXI.Text({
                text: `${tilesRemaining}`,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0x0a2a1a,
                    fontWeight: "900",
                }),
            });
            tilesText.anchor.set(0.5);
            tilesText.position.set(plateX + plateW / 2, barY + barH / 2);
            this.options.topStatusLayer.addChild(tilesText);
        }

        const isMyTurn = this.options.isMyTurn();
        const turnText = isMyTurn ? "YOUR TURN" : `${p.id}'s TURN`;
        const turnColor = isMyTurn ? 0x00ff88 : 0xffaa00;

        const turnLabel = new PIXI.Text({
            text: turnText,
            style: new PIXI.TextStyle({ fontSize: 18, fill: turnColor, fontWeight: "800" }),
        });
        turnLabel.position.set(16, 8);
        this.options.topStatusLayer.addChild(turnLabel);

        const roundLabel = new PIXI.Text({
            text: `Round ${this.options.game.state.round}`,
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0x8b949e }),
        });
        roundLabel.position.set(16, 30);
        this.options.topStatusLayer.addChild(roundLabel);

        const apX = 160;
        for (let i = 0; i < 2; i++) {
            const dot = new PIXI.Graphics();
            const filled = i < this.options.game.state.actionPoints;
            dot.circle(apX + i * 28, 24, 10);

            if (filled) {
                dot.fill({ color: 0x00ff88 });
                dot.stroke({ color: 0x00aa55, width: 2 });
            } else {
                dot.fill({ color: 0x21262d });
                dot.stroke({ color: 0x484f58, width: 2 });
            }
            this.options.topStatusLayer.addChild(dot);
        }

        const activeEvents = this.options.game.state.activeEvents;
        if (activeEvents.length > 0) {
            const panelWidth = 260;
            const rowHeight = 16;
            const panelHeight = 24 + activeEvents.length * rowHeight;
            const panelX = w - panelWidth - 16;
            const panelY = 6;

            const panel = new PIXI.Graphics();
            panel.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
            panel.fill({ color: 0x111827, alpha: 0.95 });
            panel.stroke({ color: 0x3b82f6, width: 1, alpha: 0.8 });
            this.options.topStatusLayer.addChild(panel);

            const title = new PIXI.Text({
                text: "ACTIVE EVENTS",
                style: new PIXI.TextStyle({
                    fontSize: 10,
                    fill: 0x93c5fd,
                    fontWeight: "700",
                    letterSpacing: 1,
                }),
            });
            title.position.set(panelX + 12, panelY + 6);
            this.options.topStatusLayer.addChild(title);

            let y = panelY + 20;
            for (const event of activeEvents) {
                const roundsLeft = Math.max(0, event.activeUntilRound - this.options.game.state.round + 1);
                const eventText = new PIXI.Text({
                    text: `${event.name} • ${roundsLeft}r`,
                    style: new PIXI.TextStyle({
                        fontSize: 11,
                        fill: 0xe2e8f0,
                        fontWeight: "600",
                    }),
                });
                eventText.position.set(panelX + 10, y);
                this.options.topStatusLayer.addChild(eventText);
                y += rowHeight;
            }
        }

        const apLabel = new PIXI.Text({
            text: "AP",
            style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e }),
        });
        apLabel.anchor.set(0.5);
        apLabel.position.set(apX + 14, 42);
        this.options.topStatusLayer.addChild(apLabel);

        const myPlayer = this.options.game.state.players[this.options.getMyPlayerIndex()];
        const playerColor = this.options.playerColors[this.options.getMyPlayerIndex() % this.options.playerColors.length];

        const playerLabel = new PIXI.Text({
            text: myPlayer.id,
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: playerColor,
                fontWeight: "900",
            }),
        });
        playerLabel.anchor.set(1, 0.5);
        playerLabel.position.set(w - 70, h / 2);
        this.options.topStatusLayer.addChild(playerLabel);

        const settingsBtn = new PIXI.Container();
        const settingsBg = new PIXI.Graphics();
        settingsBg.roundRect(0, 0, 32, 32, 8);
        settingsBg.fill({ color: 0x21262d, alpha: 0.95 });
        settingsBg.stroke({ color: 0x4a90d9, width: 2, alpha: 0.8 });

        const settingsIcon = new PIXI.Text({
            text: "⚙️",
            style: new PIXI.TextStyle({ fontSize: 16 }),
        });
        settingsIcon.anchor.set(0.5);
        settingsIcon.position.set(16, 16);
        settingsIcon.eventMode = "none";

        settingsBtn.addChild(settingsBg);
        settingsBtn.addChild(settingsIcon);
        settingsBtn.position.set(w - 50, 12);
        settingsBtn.eventMode = "static";
        settingsBtn.cursor = "pointer";
        settingsBtn.on("pointerdown", () => {
            this.options.onToggleSettings();
        });

        settingsBtn.on("pointerover", () => {
            settingsBg.clear();
            settingsBg.roundRect(0, 0, 32, 32, 8);
            settingsBg.fill({ color: 0x30363d, alpha: 0.95 });
            settingsBg.stroke({ color: 0x6cb2ff, width: 2 });
        });
        settingsBtn.on("pointerout", () => {
            settingsBg.clear();
            settingsBg.roundRect(0, 0, 32, 32, 8);
            settingsBg.fill({ color: 0x21262d, alpha: 0.95 });
            settingsBg.stroke({ color: 0x4a90d9, width: 2, alpha: 0.8 });
        });

        this.options.topStatusLayer.addChild(settingsBtn);
    }

    public renderCombatSummary(): void {
        this.options.combatSummaryLayer.removeChildren();

        const myPlayer = this.options.game.state.players[this.options.getMyPlayerIndex()];
        if (!myPlayer) return;

        const panelW = 140;
        const panelH = 180;
        // v0.6: Position left of Hero Board (Hero Board is at width - 300 - 40)
        const heroBoardX = this.options.app.renderer.width - 300 - 40;
        const panelX = heroBoardX - panelW - 16;
        const panelY = 70;

        const bonuses = this.calculateStaticCombatBonuses(myPlayer);
        const bonusTotal = bonuses.units + bonuses.modules + bonuses.weapons + bonuses.race;
        const baseMin = 0;
        const baseMax = 3;
        const totalMin = baseMin + bonusTotal;
        const totalMax = baseMax + bonusTotal;

        const myTile = this.options.game.state.board.getTile(myPlayer.position);
        const monsterTier = myTile?.monsterTier && myTile.encounterActive ? myTile.monsterTier : 0;
        const canBeat = monsterTier > 0 && totalMin >= monsterTier;
        const canMaybeBeat = monsterTier > 0 && totalMax >= monsterTier;
        const nearMonster = monsterTier > 0;

        let borderColor = 0xffd700;
        if (nearMonster) {
            if (canBeat) {
                borderColor = 0x00ff88;
            } else if (canMaybeBeat) {
                borderColor = 0xffd700;
            } else {
                borderColor = 0xff4444;
            }
        }

        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x0d1117, alpha: 0.96 });
        bg.stroke({ color: borderColor, width: 3 });
        this.options.combatSummaryLayer.addChild(bg);

        const header = new PIXI.Text({
            text: "⚔ POWER",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: borderColor,
                fontWeight: "800",
                letterSpacing: 1,
            }),
        });
        header.anchor.set(0.5, 0);
        header.position.set(panelX + panelW / 2, panelY + 10);
        this.options.combatSummaryLayer.addChild(header);

        const totalColor = nearMonster
            ? (canBeat ? 0x00ff88 : (canMaybeBeat ? 0xffd700 : 0xff4444))
            : 0x00ff88;
        const totalLabel = new PIXI.Text({
            text: totalMin === totalMax ? `${totalMax}` : `${totalMin}-${totalMax}`,
            style: new PIXI.TextStyle({
                fontSize: 40,
                fill: totalColor,
                fontWeight: "900",
                dropShadow: { color: totalColor, blur: 8, alpha: 0.5, distance: 0 },
            }),
        });
        totalLabel.anchor.set(0.5);
        totalLabel.position.set(panelX + panelW / 2, panelY + 52);
        this.options.combatSummaryLayer.addChild(totalLabel);

        let y = panelY + 85;
        const leftX = panelX + 12;
        const rightX = panelX + panelW - 12;

        const divider = new PIXI.Graphics();
        divider.rect(panelX + 10, y - 5, panelW - 20, 1);
        divider.fill({ color: 0x30363d });
        this.options.combatSummaryLayer.addChild(divider);

        const breakdownItems: Array<{ label: string; value: number | string; color: number }> = [
            { label: "Hero Die", value: `${baseMin}-${baseMax}`, color: 0x8b949e },
        ];
        if (bonuses.units > 0) breakdownItems.push({ label: "Units", value: bonuses.units, color: 0x3b82f6 });
        if (bonuses.weapons > 0) breakdownItems.push({ label: "Gear", value: bonuses.weapons, color: 0xffd700 });
        if (bonuses.modules > 0) breakdownItems.push({ label: "Mods", value: bonuses.modules, color: 0x60a5fa });
        if (bonuses.race > 0) breakdownItems.push({ label: "Race", value: bonuses.race, color: 0x00ff88 });

        for (const item of breakdownItems) {
            const labelText = new PIXI.Text({
                text: item.label,
                style: new PIXI.TextStyle({ fontSize: 11, fill: 0x8b949e }),
            });
            labelText.position.set(leftX, y);
            this.options.combatSummaryLayer.addChild(labelText);

            const valueText = new PIXI.Text({
                text: typeof item.value === "string" ? item.value : `+${item.value}`,
                style: new PIXI.TextStyle({ fontSize: 11, fill: item.color, fontWeight: "700" }),
            });
            valueText.anchor.set(1, 0);
            valueText.position.set(rightX, y);
            this.options.combatSummaryLayer.addChild(valueText);

            y += 14;
        }

        // v0.6: Compact layout - icons and hint at bottom
        const infoItems: string[] = [];
        if (bonuses.hasReroll) infoItems.push("🎲");
        if (bonuses.skullReduction > 0) infoItems.push(`🛡️${bonuses.skullReduction}`);

        if (infoItems.length > 0) {
            const infoRow = new PIXI.Text({
                text: infoItems.join(" "),
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x8b949e }),
            });
            infoRow.anchor.set(0.5, 0);
            infoRow.position.set(panelX + panelW / 2, panelY + panelH - 36);
            this.options.combatSummaryLayer.addChild(infoRow);
        }

        if (nearMonster) {
            let hintText = `✗ Need +${monsterTier - totalMax}`;
            if (canBeat) {
                hintText = `✓ vs T${monsterTier}`;
            } else if (canMaybeBeat) {
                hintText = `⚠️ Maybe T${monsterTier}`;
            }
            const hint = new PIXI.Text({
                text: hintText,
                style: new PIXI.TextStyle({
                    fontSize: 10,
                    fill: canBeat ? 0x00ff88 : (canMaybeBeat ? 0xffd700 : 0xff6b6b),
                    fontWeight: "600",
                }),
            });
            hint.anchor.set(0.5, 0);
            hint.position.set(panelX + panelW / 2, panelY + panelH - 18);
            this.options.combatSummaryLayer.addChild(hint);
        }
    }

    public addCombatLine(label: string, value: string, color: number, panelX: number, y: number): void {
        const labelText = new PIXI.Text({
            text: label,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x8b949e }),
        });
        labelText.position.set(panelX + 12, y);
        this.options.combatSummaryLayer.addChild(labelText);

        const valueText = new PIXI.Text({
            text: value,
            style: new PIXI.TextStyle({ fontSize: 12, fill: color, fontWeight: "600" }),
        });
        valueText.anchor.set(1, 0);
        valueText.position.set(panelX + 188, y);
        this.options.combatSummaryLayer.addChild(valueText);
    }

    public renderContextHints(): void {
        this.options.contextHintLayer.removeChildren();

        const myPlayer = this.options.game.state.players[this.options.getMyPlayerIndex()];
        if (!myPlayer) return;
        if (!this.options.isMyTurn()) return;
        if (!this.options.tutorialHints.isEnabled()) return;

        const hints: string[] = [];

        if (myPlayer.components < 2) {
            hints.push("💡 Components are earned from Tier 2+ monsters");
        }

        if (myPlayer.prestige >= 12 && myPlayer.prestige < 15) {
            hints.push("⚠️ Prestige Pressure active: Monsters require +1 to defeat");
        }
        if (myPlayer.prestige >= 15) {
            hints.push("🚫 Prestige ≥15: No rerolls allowed in combat!");
        }

        const myTile = this.options.game.state.board.getTile(myPlayer.position);
        const isGatherableTile = myTile && (
            myTile.type === TileType.Resource
            || myTile.type === TileType.StartingSector
        ) && !myTile.encounterActive && !myTile.ownerId;
        if (myTile && !isGatherableTile && this.options.game.state.actionPoints > 0) {
            hints.push("📍 Move to a resource tile to gather");
        }

        if (!myPlayer.basePosition && myPlayer.materials >= 2) {
            hints.push("🏠 You can build a Base (costs 2🧱)");
        }

        if (this.options.game.isInOwnBase() && myPlayer.components >= 1) {
            hints.push("🔧 You're at Base - CRAFT available!");
        }

        if (this.options.game.state.isFinalPreparation && !this.options.game.state.finalTrialStarted) {
            const score = this.calculateFinalTrialPreview(myPlayer);
            hints.push(`📊 Final Trial Preview: ~${score} points`);
        }

        if (hints.length > 0) {
            const hintText = new PIXI.Text({
                text: hints[0],
                style: new PIXI.TextStyle({
                    fontSize: 13,
                    fill: 0xffaa00,
                    fontWeight: "600",
                    dropShadow: { color: 0x000000, blur: 4, alpha: 0.8, distance: 1 },
                }),
            });
            hintText.anchor.set(0.5, 0);
            hintText.position.set(this.options.app.renderer.width / 2, this.options.app.renderer.height - 80);
            this.options.contextHintLayer.addChild(hintText);
        }
    }

    public calculateStaticCombatBonuses(player: Player): {
        units: number;
        modules: number;
        weapons: number;
        race: number;
        skullReduction: number;
        hasReroll: boolean;
    } {
        let units = 0;
        let modules = 0;
        let weapons = 0;
        let race = 0;
        let skullReduction = 0;
        let hasReroll = false;

        for (const unit of player.units) {
            if (!unit) continue;
            if (unit.type === "assault") units += 1;
            if (unit.type === "shield") skullReduction += 1;
            if (unit.type === "tactical") hasReroll = true;
        }

        if (player.modules.includes("AssaultBay")) modules += 1;
        if (player.modules.includes("ShieldArray")) skullReduction += 1;
        if (player.modules.includes("TacticalUplink")) hasReroll = true;

        for (const weapon of player.inventory.weapons) {
            if (!weapon) continue;
            if (weapon.effectId === "blaster_core") weapons += 1;
            if (weapon.effectId === "shock_blade") weapons += 1;
            if (weapon.effectId === "plasma_edge") weapons += 2;
            if (weapon.effectId === "heavy_cannon") weapons += 3;
            if (weapon.effectId === "arc_rifle") weapons += Math.min(player.tilesMovedThisTurn, 3);
            if (weapon.effectId === "void_launcher") weapons += 2;
        }

        for (const spell of player.inventory.spells) {
            if (!spell) continue;
            if (spell.effectId === "reroll_module") hasReroll = true;
            if (spell.effectId === "shield_matrix") skullReduction += 1;
        }

        if (player.inventory.amulet?.effectId === "core_relic") {
            weapons += 1;
            skullReduction += 1;
        }

        if (player.raceId === "warbound") race += 1;
        if (player.raceId === "warbound" && player.raceOption === "A") race += 1;
        if (player.raceId === "bioform") skullReduction += 1;
        if (player.raceId === "chrono") hasReroll = true;
        if (player.raceId === "chrono" && player.raceOption === "A") skullReduction += 1;

        return { units, modules, weapons, race, skullReduction, hasReroll };
    }

    private calculateFinalTrialPreview(player: Player): number {
        let score = 0;

        score += player.prestige;

        for (const w of player.inventory.weapons) if (w) score += 1;
        for (const s of player.inventory.spells) if (s) score += 1;
        if (player.inventory.amulet) score += 1;

        for (const u of player.units) if (u) score += 1;

        score += player.modules.length;

        return score;
    }
}
