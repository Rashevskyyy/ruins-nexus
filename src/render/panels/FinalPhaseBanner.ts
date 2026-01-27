import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type FinalPhaseBannerContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    isMyTurn: boolean;
    onRecall: () => void;
    onFinalTrial: () => void;
};

export class FinalPhaseBanner {
    render({ app, game, layer, isMyTurn, onRecall, onFinalTrial }: FinalPhaseBannerContext): void {
        layer.removeChildren();

        // Only show during Final Preparation or Final Trial
        if (!game.state.isFinalPreparation && !game.state.finalTrialStarted) return;

        const screenW = app.renderer.width;
        const bannerH = 60;
        const bannerY = 60; // Below the top

        // Banner background
        const bg = new PIXI.Graphics();
        bg.rect(0, bannerY, screenW, bannerH);

        if (game.state.finalTrialStarted) {
            bg.fill({ color: 0x7c2d12, alpha: 0.95 }); // Orange for Trial
        } else {
            bg.fill({ color: 0x1e3a5f, alpha: 0.95 }); // Blue for Preparation
        }
        layer.addChild(bg);

        // Title text
        let titleStr = "";
        let subtitleStr = "";

        if (game.state.finalTrialStarted) {
            titleStr = "🎯 FINAL TRIAL";
            const player = game.state.players[game.state.currentPlayerIndex];
            if (player.finalTrialScore !== null) {
                subtitleStr = `Score: ${player.finalTrialScore} | Waiting for other players...`;
            } else {
                subtitleStr = "Complete your Final Trial attempt!";
            }
        } else if (game.state.isFinalPreparation) {
            titleStr = `🚨 ORBITAL PHASE - ${game.state.finalPrepRoundsLeft} Rounds Left`;
            subtitleStr = "Explore DISABLED | Move, Gather, Build, Craft only | Recall to Base available";
        }

        const title = new PIXI.Text({
            text: titleStr,
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: 0xffffff,
                fontWeight: "800",
                dropShadow: { alpha: 0.8, angle: 90, blur: 3, color: 0x000000, distance: 2 },
            }),
        });
        title.anchor.set(0.5, 0);
        title.position.set(screenW / 2, bannerY + 8);
        layer.addChild(title);

        const subtitle = new PIXI.Text({
            text: subtitleStr,
            style: new PIXI.TextStyle({
                fontSize: 12,
                fill: 0xd1d5db,
                fontWeight: "500",
            }),
        });
        subtitle.anchor.set(0.5, 0);
        subtitle.position.set(screenW / 2, bannerY + 36);
        layer.addChild(subtitle);

        // Recall button (if available)
        if (game.canRecallToBase()) {
            const btnW = 140;
            const btnH = 36;
            const btnX = screenW - btnW - 20;
            const btnY = bannerY + (bannerH - btnH) / 2;

            const btn = new PIXI.Graphics();
            btn.roundRect(btnX, btnY, btnW, btnH, 8);
            btn.fill({ color: 0x10b981, alpha: 1 });
            btn.stroke({ color: 0x34d399, width: 2 });
            btn.eventMode = "static";
            btn.cursor = "pointer";
            btn.on("pointerdown", onRecall);
            layer.addChild(btn);

            const btnText = new PIXI.Text({
                text: "📡 RECALL",
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0xffffff,
                    fontWeight: "800",
                }),
            });
            btnText.anchor.set(0.5);
            btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
            layer.addChild(btnText);
        }

        // Final Trial button (if in trial phase and hasn't done trial yet)
        if (game.state.finalTrialStarted) {
            const player = game.state.players[game.state.currentPlayerIndex];
            if (player.finalTrialScore === null && isMyTurn) {
                const btnW = 180;
                const btnH = 36;
                const btnX = screenW - btnW - 20;
                const btnY = bannerY + (bannerH - btnH) / 2;

                const btn = new PIXI.Graphics();
                btn.roundRect(btnX, btnY, btnW, btnH, 8);
                btn.fill({ color: 0xdc2626, alpha: 1 });
                btn.stroke({ color: 0xef4444, width: 2 });
                btn.eventMode = "static";
                btn.cursor = "pointer";
                btn.on("pointerdown", onFinalTrial);
                layer.addChild(btn);

                const btnText = new PIXI.Text({
                    text: "🎯 DO FINAL TRIAL",
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: 0xffffff,
                        fontWeight: "800",
                    }),
                });
                btnText.anchor.set(0.5);
                btnText.position.set(btnX + btnW / 2, btnY + btnH / 2);
                layer.addChild(btnText);
            }
        }
    }
}
