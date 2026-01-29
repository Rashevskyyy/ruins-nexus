import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { PublicObjectiveReward } from "../../core/PublicObjectives";

type PublicObjectivesContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
};

const formatReward = (reward: PublicObjectiveReward): string => {
    const parts: string[] = [];
    if (reward.prestige) {
        parts.push(`🏆 +${reward.prestige} Prestige`);
    }
    if (reward.components) {
        parts.push(`🧩 +${reward.components} Components`);
    }
    if (reward.permanent?.gatherBonus) {
        parts.push(`📦 +${reward.permanent.gatherBonus} Gather`);
    }
    if (reward.permanent?.combatBonus) {
        parts.push(`⚔ +${reward.permanent.combatBonus} Combat`);
    }
    if (reward.permanent?.finalTrialBonus) {
        parts.push(`🎯 +${reward.permanent.finalTrialBonus} Final Trial`);
    }
    return parts.join(" • ");
};

export class PublicObjectivesPanel {
    render({ app: _app, game, layer }: PublicObjectivesContext): void {
        layer.removeChildren();

        const objectives = game.state.publicObjectives;
        const panelW = 340;
        const headerH = 34;
        const rowH = 56;
        const panelH = headerH + objectives.length * rowH + 16;

        const panelX = 16;
        const panelY = 72;

        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 10);
        bg.fill({ color: 0x0f172a, alpha: 0.94 });
        bg.stroke({ color: 0x334155, width: 2, alpha: 0.9 });
        layer.addChild(bg);

        const title = new PIXI.Text({
            text: "🎯 Public Objectives",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffd700,
                fontWeight: "700",
            }),
        });
        title.position.set(panelX + 12, panelY + 8);
        layer.addChild(title);

        let yOffset = panelY + headerH;
        const now = Date.now();

        for (const objective of objectives) {
            const rowBg = new PIXI.Graphics();
            rowBg.roundRect(panelX + 10, yOffset, panelW - 20, rowH - 6, 8);
            rowBg.fill({ color: 0x111827, alpha: 0.92 });

            const isRecent = objective.completedAt && now - objective.completedAt < 5000;
            const highlightColor = objective.completed ? 0x22c55e : 0x38bdf8;
            if (isRecent) {
                const pulse = 0.5 + Math.sin(now / 140) * 0.3;
                rowBg.stroke({ color: highlightColor, width: 2, alpha: pulse });
            } else {
                rowBg.stroke({ color: 0x1f2937, width: 1, alpha: 0.8 });
            }
            layer.addChild(rowBg);

            const statusText = objective.completed ? "✅" : "•";
            const status = new PIXI.Text({
                text: statusText,
                style: new PIXI.TextStyle({
                    fontSize: 16,
                    fill: objective.completed ? 0x22c55e : 0x94a3b8,
                    fontWeight: "700",
                }),
            });
            status.position.set(panelX + 18, yOffset + 8);
            layer.addChild(status);

            const name = new PIXI.Text({
                text: objective.name,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: objective.completed ? 0x86efac : 0xffffff,
                    fontWeight: "700",
                }),
            });
            name.position.set(panelX + 40, yOffset + 6);
            layer.addChild(name);

            const description = new PIXI.Text({
                text: objective.completedBy
                    ? `${objective.description} • ${objective.completedBy}`
                    : objective.description,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: objective.completed ? 0x6ee7b7 : 0x94a3b8,
                }),
            });
            description.position.set(panelX + 40, yOffset + 26);
            layer.addChild(description);

            const rewardLine = new PIXI.Text({
                text: formatReward(objective.reward),
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: 0xf8fafc,
                }),
            });
            rewardLine.position.set(panelX + 40, yOffset + 40);
            layer.addChild(rewardLine);

            yOffset += rowH;
        }
    }
}
