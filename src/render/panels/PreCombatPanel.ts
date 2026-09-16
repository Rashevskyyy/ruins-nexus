import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { PreCombatSpend } from "../../core/GameState";

type PreCombatContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    renderAll: () => void;
};

export class PreCombatPanel {
    render({ app, game, layer, playerColors, renderAll }: PreCombatContext): void {
        layer.removeChildren();

        // Debug logging
        console.log("[PreCombatPanel] uiMode:", game.state.uiMode, "pendingCombat:", !!game.state.pendingCombat);

        if (game.state.uiMode !== "PRE_COMBAT") return;

        const pending = game.state.pendingCombat;
        if (!pending) {
            console.log("[PreCombatPanel] No pending combat!");
            return;
        }

        const p = game.state.players[game.state.currentPlayerIndex];
        if (p.id !== pending.playerId) {
            console.log("[PreCombatPanel] Player mismatch:", p.id, "!==", pending.playerId);
            return;
        }

        const tile = game.state.board.getTile(pending.tileCoord);
        if (!tile) {
            console.log("[PreCombatPanel] No tile at", pending.tileCoord);
            return;
        }

        console.log("[PreCombatPanel] Rendering panel for", p.id, "at", pending.tileCoord);

        const spend = pending.spend;
        const playerIndex = game.state.currentPlayerIndex;
        const playerColor = playerColors[playerIndex % playerColors.length];
        const screenW = app.renderer.width;
        const screenH = app.renderer.height;

        const closePanel = (applySpend: boolean) => {
            game.confirmPreCombat(applySpend);
            renderAll();
        };

        // Backdrop
        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.6 });
        backdrop.eventMode = "static";
        layer.addChild(backdrop);

        const panelW = 520;
        const panelH = 600;
        const panelX = (screenW - panelW) / 2;
        const panelY = (screenH - panelH) / 2;

        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 16);
        panel.fill({ color: 0x111827, alpha: 0.98 });
        panel.stroke({ color: playerColor, width: 4, alpha: 1 });
        panel.eventMode = "static";
        layer.addChild(panel);

        const title = new PIXI.Text({
            text: "🛡️ Pre-Combat",
            style: new PIXI.TextStyle({
                fontSize: 24,
                fill: playerColor,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 4, color: 0x000000, distance: 3 },
            }),
        });
        title.position.set(panelX + 20, panelY + 16);
        layer.addChild(title);

        const monsterTier = tile.monsterTier ?? 1;
        const monsterType = tile.monsterType ?? "standard";
        const requiredTier = p.prestige >= 12 ? monsterTier + 1 : monsterTier;
        const header = new PIXI.Text({
            text: `Monster Tier ${monsterTier} • Need ${requiredTier}⚔`,
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0xa0aec0, fontWeight: "600" }),
        });
        header.position.set(panelX + 20, panelY + 50);
        layer.addChild(header);

        const resourceText = new PIXI.Text({
            text: `Resources: 🧩${p.components}  ⭐${p.prestige}  🧬${p.biomass}  ❤️${p.hp}/${p.maxHp}`,
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0x94a3b8, fontWeight: "600" }),
        });
        resourceText.position.set(panelX + 20, panelY + 70);
        layer.addChild(resourceText);

        const monsterMeta = {
            standard: { label: "STANDARD", icon: "👹", description: "Standard fight", warning: "" },
            hunter: { label: "HUNTER", icon: "🐺", description: "Moves toward nearest player", warning: "⚠️ Will move at end of round!" },
            guardian: { label: "GUARDIAN", icon: "🛡️", description: "Blocks passage — must defeat", warning: "💎 Reward: ×1.5 (rounded up)" },
        } as const;

        const meta = monsterMeta[monsterType];
        const monsterTitle = new PIXI.Text({
            text: `${meta.icon} ${meta.label}`,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xe2e8f0, fontWeight: "700" }),
        });
        monsterTitle.position.set(panelX + 20, panelY + 94);
        layer.addChild(monsterTitle);

        const monsterDesc = new PIXI.Text({
            text: meta.description,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x94a3b8 }),
        });
        monsterDesc.position.set(panelX + 20, panelY + 116);
        layer.addChild(monsterDesc);

        if (meta.warning) {
            const monsterWarning = new PIXI.Text({
                text: meta.warning,
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xfacc15, fontWeight: "600" }),
            });
            monsterWarning.position.set(panelX + 20, panelY + 134);
            layer.addChild(monsterWarning);
        }

        const rerollAllowed = spend.componentReroll && p.prestige < 15;
        const componentCost = spend.componentSwords + spend.componentSkullReduction * 3 + (rerollAllowed ? 2 : 0);
        const prestigeCost = (spend.prestigeSwords ? 1 : 0) + (spend.prestigeCancelRetreat ? 2 : 0);
        const biomassCost = spend.biomassHeal ? 2 : 0;

        const componentRemaining = p.components - componentCost;
        const prestigeRemaining = p.prestige - prestigeCost;
        const biomassRemaining = p.biomass - biomassCost;

        let y = panelY + 164;

        const sectionTitle = new PIXI.Text({
            text: "Spend for bonuses",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xe2e8f0, fontWeight: "700" }),
        });
        sectionTitle.position.set(panelX + 20, y);
        layer.addChild(sectionTitle);
        y += 24;

        const updateSpend = (patch: Partial<PreCombatSpend>) => {
            Object.assign(spend, patch);
            renderAll();
        };

        const renderAdjustRow = (label: string, costLabel: string, value: number, canAdd: boolean, onAdd: () => void, onRemove: () => void) => {
            const labelText = new PIXI.Text({
                text: `${costLabel} → ${label}`,
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0x94a3b8 }),
            });
            labelText.position.set(panelX + 40, y + 4);
            layer.addChild(labelText);

            const valueText = new PIXI.Text({
                text: `Current: ${value}`,
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xe2e8f0, fontWeight: "600" }),
            });
            valueText.anchor.set(1, 0);
            valueText.position.set(panelX + panelW - 120, y + 4);
            layer.addChild(valueText);

            const addBtn = this.renderSquareButton("+", panelX + panelW - 90, y, canAdd, onAdd);
            const removeBtn = this.renderSquareButton("−", panelX + panelW - 120, y, value > 0, onRemove);
            layer.addChild(removeBtn, addBtn);
            y += 28;
        };

        renderAdjustRow(
            "+1⚔",
            "1🧩",
            spend.componentSwords,
            componentRemaining >= 1,
            () => updateSpend({ componentSwords: spend.componentSwords + 1 }),
            () => updateSpend({ componentSwords: Math.max(0, spend.componentSwords - 1) })
        );

        renderAdjustRow(
            "-1💀",
            "3🧩",
            spend.componentSkullReduction,
            componentRemaining >= 3,
            () => updateSpend({ componentSkullReduction: spend.componentSkullReduction + 1 }),
            () => updateSpend({ componentSkullReduction: Math.max(0, spend.componentSkullReduction - 1) })
        );

        const rerollDisabled = p.prestige >= 15;
        y = this.renderToggleRow(
            layer,
            "2🧩 → Reroll if 0⚔",
            spend.componentReroll,
            componentRemaining >= 2 && !rerollDisabled,
            panelX,
            panelW,
            y,
            () => updateSpend({ componentReroll: !spend.componentReroll }),
            rerollDisabled ? "Prestige ≥15 blocks rerolls" : undefined,
        );

        y = this.renderToggleRow(
            layer,
            "1⭐ → +2⚔",
            spend.prestigeSwords,
            prestigeRemaining >= 1,
            panelX,
            panelW,
            y,
            () => updateSpend({ prestigeSwords: !spend.prestigeSwords }),
        );

        y = this.renderToggleRow(
            layer,
            "2⭐ → Cancel retreat",
            spend.prestigeCancelRetreat,
            prestigeRemaining >= 2,
            panelX,
            panelW,
            y,
            () => updateSpend({ prestigeCancelRetreat: !spend.prestigeCancelRetreat }),
        );

        y = this.renderToggleRow(
            layer,
            "2🧬 → +1 HP",
            spend.biomassHeal,
            biomassRemaining >= 2 && p.hp < p.maxHp,
            panelX,
            panelW,
            y,
            () => updateSpend({ biomassHeal: !spend.biomassHeal }),
            p.hp >= p.maxHp ? "Already at max HP" : undefined,
        );

        y += 8;

        const bonusSwords = spend.componentSwords + (spend.prestigeSwords ? 2 : 0);
        const preview = new PIXI.Text({
            text: `Preview: 0-3⚔ +${bonusSwords}⚔  |  -${spend.componentSkullReduction}💀`,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xa0aec0 }),
        });
        preview.position.set(panelX + 20, y);
        layer.addChild(preview);

        const buttonsY = panelY + panelH - 70;
        const confirmBtn = this.renderRectButton("CONFIRM", panelX + 80, buttonsY, 160, 40, true, () => closePanel(true));
        const cancelBtn = this.renderRectButton("SKIP", panelX + panelW - 240, buttonsY, 160, 40, true, () => closePanel(false));
        layer.addChild(confirmBtn, cancelBtn);
    }

    private renderSquareButton(label: string, x: number, y: number, enabled: boolean, onClick: () => void): PIXI.Container {
        const container = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.roundRect(x, y, 24, 24, 6);
        bg.fill({ color: enabled ? 0x334155 : 0x1f2937, alpha: enabled ? 0.9 : 0.5 });
        bg.stroke({ color: enabled ? 0x94a3b8 : 0x334155, width: 1 });
        container.addChild(bg);

        const text = new PIXI.Text({
            text: label,
            style: new PIXI.TextStyle({ fontSize: 14, fill: enabled ? 0xe2e8f0 : 0x64748b, fontWeight: "700" }),
        });
        text.anchor.set(0.5);
        text.position.set(x + 12, y + 12);
        container.addChild(text);

        if (enabled) {
            bg.eventMode = "static";
            bg.cursor = "pointer";
            bg.on("pointerdown", onClick);
        }
        return container;
    }

    private renderToggleRow(
        layer: PIXI.Container,
        label: string,
        active: boolean,
        canToggle: boolean,
        panelX: number,
        panelW: number,
        y: number,
        onToggle: () => void,
        hint?: string,
    ): number {
        const checkbox = new PIXI.Graphics();
        checkbox.roundRect(panelX + panelW - 120, y, 24, 24, 6);
        checkbox.fill({ color: active ? 0x22c55e : 0x1f2937, alpha: 0.9 });
        checkbox.stroke({ color: active ? 0x86efac : 0x334155, width: 1 });
        checkbox.eventMode = "static";
        checkbox.cursor = canToggle || active ? "pointer" : "default";
        if (canToggle || active) {
            checkbox.on("pointerdown", onToggle);
        }

        const mark = new PIXI.Text({
            text: active ? "✓" : "",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0x0f172a, fontWeight: "900" }),
        });
        mark.anchor.set(0.5);
        mark.position.set(panelX + panelW - 108, y + 12);

        const labelText = new PIXI.Text({
            text: label,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0x94a3b8 }),
        });
        labelText.position.set(panelX + 40, y + 4);
        labelText.alpha = canToggle || active ? 1 : 0.5;

        checkbox.addChild(mark);

        layer.addChild(labelText, checkbox);

        if (hint) {
            const hintText = new PIXI.Text({
                text: hint,
                style: new PIXI.TextStyle({ fontSize: 10, fill: 0x64748b }),
            });
            hintText.position.set(panelX + 40, y + 20);
            layer.addChild(hintText);
            y += 16;
        }

        return y + 28;
    }

    private renderRectButton(
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        enabled: boolean,
        onClick: () => void,
    ): PIXI.Container {
        const container = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.roundRect(x, y, width, height, 10);
        bg.fill({ color: enabled ? 0x2563eb : 0x1f2937, alpha: enabled ? 0.95 : 0.6 });
        bg.stroke({ color: enabled ? 0x93c5fd : 0x334155, width: 2 });
        container.addChild(bg);

        const label = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0xffffff, fontWeight: "800" }),
        });
        label.anchor.set(0.5);
        label.position.set(x + width / 2, y + height / 2);
        container.addChild(label);

        if (enabled) {
            bg.eventMode = "static";
            bg.cursor = "pointer";
            bg.on("pointerdown", onClick);
        }
        return container;
    }
}
