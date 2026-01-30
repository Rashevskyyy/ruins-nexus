import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

export type RewardRendererOptions = {
    app: PIXI.Application;
    game: Game;
    tokenRewardLayer: PIXI.Container;
    hudLayer: PIXI.Container;
    isMyTurn: () => boolean;
    getMyPlayerIndex: () => number;
    onRenderAll: () => void;
    showToast: (message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
};

export class RewardRenderer {
    private isTokenRewardVisible = false;
    private otherPlayerStatusContainer: PIXI.Container | null = null;
    private reconnectProtectionActive = true;

    constructor(private options: RewardRendererOptions) {
        window.setTimeout(() => {
            this.reconnectProtectionActive = false;
            console.log("[Renderer] Reconnect protection disabled");
        }, 500);
    }

    public checkPendingTokenRewards(): void {
        if (this.isTokenRewardVisible) return;
        if (this.reconnectProtectionActive) return;

        const myPlayer = this.options.game.state.players[this.options.getMyPlayerIndex()];
        const activePlayer = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const pendingChoice = this.options.game.state.pendingRewardChoice;

        if (this.options.isMyTurn()) {
            if (!myPlayer) return;

            if (pendingChoice && pendingChoice.playerId === myPlayer.id) {
                this.showRewardChoiceUI(pendingChoice);
                return;
            }

            if (myPlayer.pendingTokens && myPlayer.pendingTokens.length > 0) {
                const nextToken = myPlayer.pendingTokens[0];
                this.showTokenRewardUI(nextToken);
            } else {
                this.hideOtherPlayerStatus();
            }
        } else {
            if (!activePlayer) return;

            if (pendingChoice) {
                this.showOtherPlayerStatus(`${activePlayer.id} is choosing a reward...`, "🎁");
                return;
            }

            if (activePlayer.pendingTokens && activePlayer.pendingTokens.length > 0) {
                this.showOtherPlayerStatus(`${activePlayer.id} is selecting equipment...`, "🗡️");
                return;
            }

            this.hideOtherPlayerStatus();
        }
    }

    private showOtherPlayerStatus(message: string, emoji: string): void {
        this.hideOtherPlayerStatus();

        const screenW = this.options.app.screen.width;

        this.otherPlayerStatusContainer = new PIXI.Container();

        const bg = new PIXI.Graphics();
        const panelW = 300;
        const panelH = 50;
        const panelX = (screenW - panelW) / 2;
        const panelY = 120;

        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x2a2a4e, alpha: 0.95 });
        bg.stroke({ color: 0xffd700, width: 2 });
        this.otherPlayerStatusContainer.addChild(bg);

        const text = new PIXI.Text({
            text: `${emoji} ${message}`,
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffffff,
                fontWeight: "bold",
            }),
        });
        text.anchor.set(0.5);
        text.position.set(panelX + panelW / 2, panelY + panelH / 2);
        this.otherPlayerStatusContainer.addChild(text);

        this.options.hudLayer.addChild(this.otherPlayerStatusContainer);
    }

    private hideOtherPlayerStatus(): void {
        if (this.otherPlayerStatusContainer) {
            this.otherPlayerStatusContainer.destroy({ children: true });
            this.otherPlayerStatusContainer = null;
        }
    }

    private showTokenRewardUI(token: import("../../board/TileDeck").TokenType): void {
        import("../../entities/Item").then(({ getItemsForToken }) => {
            const items = getItemsForToken(token);

            if (items.length === 0) {
                const player = this.options.game.state.players[this.options.getMyPlayerIndex()];
                if (player && player.pendingTokens.length > 0) {
                    player.pendingTokens.shift();
                }
                return;
            }

            this.isTokenRewardVisible = true;
            this.options.tokenRewardLayer.removeChildren();

            const screenW = this.options.app.screen.width;
            const screenH = this.options.app.screen.height;

            const backdrop = new PIXI.Graphics();
            backdrop.rect(0, 0, screenW, screenH);
            backdrop.fill({ color: 0x000000, alpha: 0.7 });
            backdrop.eventMode = "static";
            this.options.tokenRewardLayer.addChild(backdrop);

            const modalW = Math.min(600, screenW - 40);
            const modalH = 400;
            const modalX = (screenW - modalW) / 2;
            const modalY = (screenH - modalH) / 2;

            const modal = new PIXI.Graphics();
            modal.roundRect(modalX, modalY, modalW, modalH, 16);
            modal.fill({ color: 0x1a1a2e });
            modal.stroke({ color: 0x4a90d9, width: 3 });
            this.options.tokenRewardLayer.addChild(modal);

            const tokenEmoji = token === "CommonLoot"
                ? "📦"
                : token === "UncommonLoot"
                    ? "🎁"
                    : token === "SpellToken"
                        ? "✨"
                        : "🏆";
            const title = new PIXI.Text({
                text: `${tokenEmoji} ${token.replace(/([A-Z])/g, " $1").trim()} Reward`,
                style: new PIXI.TextStyle({
                    fontSize: 24,
                    fill: 0xffd700,
                    fontFamily: "Arial",
                    fontWeight: "bold",
                }),
            });
            title.anchor.set(0.5, 0);
            title.position.set(screenW / 2, modalY + 20);
            this.options.tokenRewardLayer.addChild(title);

            const subtitle = new PIXI.Text({
                text: "Choose one item:",
                style: new PIXI.TextStyle({
                    fontSize: 16,
                    fill: 0xaaaaaa,
                }),
            });
            subtitle.anchor.set(0.5, 0);
            subtitle.position.set(screenW / 2, modalY + 55);
            this.options.tokenRewardLayer.addChild(subtitle);

            const cardW = 150;
            const cardH = 220;
            const cardSpacing = 20;
            const totalCardsW = items.length * cardW + (items.length - 1) * cardSpacing;
            const cardsStartX = (screenW - totalCardsW) / 2;
            const cardsY = modalY + 90;

            items.forEach((item, index) => {
                const cardX = cardsStartX + index * (cardW + cardSpacing);

                const card = new PIXI.Graphics();
                card.roundRect(cardX, cardsY, cardW, cardH, 12);

                const bgColor = item.rarity === "legendary"
                    ? 0x4a3000
                    : item.rarity === "uncommon"
                        ? 0x2a3a4a
                        : 0x2a2a3a;
                card.fill({ color: bgColor });

                const borderColor = item.rarity === "legendary"
                    ? 0xffd700
                    : item.rarity === "uncommon"
                        ? 0x4a90d9
                        : 0x5a5a7a;
                card.stroke({ color: borderColor, width: 2 });

                card.eventMode = "static";
                card.cursor = "pointer";
                this.options.tokenRewardLayer.addChild(card);

                const emoji = new PIXI.Text({
                    text: item.emoji,
                    style: new PIXI.TextStyle({ fontSize: 48 }),
                });
                emoji.anchor.set(0.5);
                emoji.position.set(cardX + cardW / 2, cardsY + 45);
                this.options.tokenRewardLayer.addChild(emoji);

                const name = new PIXI.Text({
                    text: item.name,
                    style: new PIXI.TextStyle({
                        fontSize: 14,
                        fill: 0xffffff,
                        fontWeight: "bold",
                        wordWrap: true,
                        wordWrapWidth: cardW - 16,
                        align: "center",
                    }),
                });
                name.anchor.set(0.5, 0);
                name.position.set(cardX + cardW / 2, cardsY + 80);
                this.options.tokenRewardLayer.addChild(name);

                const typeLabel = new PIXI.Text({
                    text: item.type.toUpperCase(),
                    style: new PIXI.TextStyle({
                        fontSize: 10,
                        fill: borderColor,
                    }),
                });
                typeLabel.anchor.set(0.5, 0);
                typeLabel.position.set(cardX + cardW / 2, cardsY + 105);
                this.options.tokenRewardLayer.addChild(typeLabel);

                const desc = new PIXI.Text({
                    text: item.description,
                    style: new PIXI.TextStyle({
                        fontSize: 11,
                        fill: 0xaaaaaa,
                        wordWrap: true,
                        wordWrapWidth: cardW - 16,
                        align: "center",
                    }),
                });
                desc.anchor.set(0.5, 0);
                desc.position.set(cardX + cardW / 2, cardsY + 125);
                this.options.tokenRewardLayer.addChild(desc);

                card.on("pointerover", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: 0x3a3a5a });
                    card.stroke({ color: 0xffffff, width: 3 });
                });

                card.on("pointerout", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: bgColor });
                    card.stroke({ color: borderColor, width: 2 });
                });

                card.on("pointerdown", () => {
                    this.selectTokenReward(item);
                });
            });
        });
    }

    private selectTokenReward(item: import("../../entities/Item").Item): void {
        const player = this.options.game.state.players[this.options.getMyPlayerIndex()];
        if (!player) return;

        if (player.pendingTokens.length > 0) {
            player.pendingTokens.shift();
        }

        if (item.type === "weapon") {
            const emptySlot = player.inventory.weapons.findIndex(w => w === null);
            if (emptySlot >= 0) {
                player.inventory.weapons[emptySlot] = item;
            } else {
                player.inventory.weapons[0] = item;
            }
        } else if (item.type === "spell") {
            const emptySlot = player.inventory.spells.findIndex(s => s === null);
            if (emptySlot >= 0) {
                player.inventory.spells[emptySlot] = item;
            } else {
                player.inventory.spells[0] = item;
            }
        } else if (item.type === "amulet") {
            player.inventory.amulet = item;
        }

        this.options.game.addLog(`${player.id} chose ${item.emoji} ${item.name}`);
        this.options.showToast(`${item.emoji} ${item.name} added to inventory!`, "success");

        this.hideTokenRewardUI();

        this.options.game.finishTokenSelection();

        this.options.onRenderAll();
    }

    private hideTokenRewardUI(): void {
        this.isTokenRewardVisible = false;
        this.options.tokenRewardLayer.removeChildren();
    }

    private showRewardChoiceUI(pending: { playerId: string; monsterTier: number; standardReward: { prestige: number; tokens: string[] } }): void {
        this.isTokenRewardVisible = true;
        this.options.tokenRewardLayer.removeChildren();

        const screenW = this.options.app.screen.width;
        const screenH = this.options.app.screen.height;
        const player = this.options.game.state.players.find(p => p.id === pending.playerId);
        if (!player) return;

        const backdrop = new PIXI.Graphics();
        backdrop.rect(0, 0, screenW, screenH);
        backdrop.fill({ color: 0x000000, alpha: 0.7 });
        backdrop.eventMode = "static";
        this.options.tokenRewardLayer.addChild(backdrop);

        const modalW = Math.min(550, screenW - 40);
        const modalH = 320;
        const modalX = (screenW - modalW) / 2;
        const modalY = (screenH - modalH) / 2;

        const modal = new PIXI.Graphics();
        modal.roundRect(modalX, modalY, modalW, modalH, 16);
        modal.fill({ color: 0x1a1a2e });
        modal.stroke({ color: 0xffd700, width: 3 });
        this.options.tokenRewardLayer.addChild(modal);

        const title = new PIXI.Text({
            text: `🎉 Victory! Tier ${pending.monsterTier} Threat Defeated`,
            style: new PIXI.TextStyle({
                fontSize: 22,
                fill: 0xffd700,
                fontFamily: "Arial",
                fontWeight: "bold",
            }),
        });
        title.anchor.set(0.5, 0);
        title.position.set(screenW / 2, modalY + 20);
        this.options.tokenRewardLayer.addChild(title);

        const subtitle = new PIXI.Text({
            text: "Choose your reward:",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xaaaaaa,
            }),
        });
        subtitle.anchor.set(0.5, 0);
        subtitle.position.set(screenW / 2, modalY + 55);
        this.options.tokenRewardLayer.addChild(subtitle);

        const cardW = 150;
        const cardH = 180;
        const cardSpacing = 20;
        const totalCardsW = 3 * cardW + 2 * cardSpacing;
        const cardsStartX = (screenW - totalCardsW) / 2;
        const cardsY = modalY + 90;

        const canPush = player.prestige < 10;
        const canRecover = player.hp < player.maxHp;

        const options = [
            {
                key: "standard",
                emoji: "🎖",
                label: "Standard",
                desc: `+${pending.standardReward.prestige} Prestige\n${pending.standardReward.tokens.length > 0 ? `+${pending.standardReward.tokens.length} Token(s)` : ""}`,
                color: 0x2563eb,
                enabled: true,
            },
            {
                key: "recover",
                emoji: "❤️",
                label: "Recover",
                desc: "+2 HP\n(Heal wounds)",
                color: 0x22c55e,
                enabled: canRecover,
            },
            {
                key: "push",
                emoji: "⭐",
                label: "Push Forward",
                desc: `+${pending.standardReward.prestige + 1} Prestige\n(No tokens)` ,
                color: 0xfbbf24,
                enabled: canPush,
            },
        ];

        options.forEach((opt, index) => {
            const cardX = cardsStartX + index * (cardW + cardSpacing);

            const card = new PIXI.Graphics();
            card.roundRect(cardX, cardsY, cardW, cardH, 12);
            card.fill({ color: opt.enabled ? opt.color : 0x333344, alpha: opt.enabled ? 1 : 0.5 });
            card.stroke({ color: opt.enabled ? 0xffffff : 0x555555, width: 2 });

            if (opt.enabled) {
                card.eventMode = "static";
                card.cursor = "pointer";
            }
            this.options.tokenRewardLayer.addChild(card);

            const emoji = new PIXI.Text({
                text: opt.emoji,
                style: new PIXI.TextStyle({ fontSize: 40 }),
            });
            emoji.anchor.set(0.5);
            emoji.position.set(cardX + cardW / 2, cardsY + 40);
            emoji.alpha = opt.enabled ? 1 : 0.5;
            this.options.tokenRewardLayer.addChild(emoji);

            const label = new PIXI.Text({
                text: opt.label,
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: opt.enabled ? 0xffffff : 0x888888,
                    fontWeight: "bold",
                }),
            });
            label.anchor.set(0.5, 0);
            label.position.set(cardX + cardW / 2, cardsY + 75);
            this.options.tokenRewardLayer.addChild(label);

            const desc = new PIXI.Text({
                text: opt.desc,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: opt.enabled ? 0xcccccc : 0x666666,
                    align: "center",
                }),
            });
            desc.anchor.set(0.5, 0);
            desc.position.set(cardX + cardW / 2, cardsY + 100);
            this.options.tokenRewardLayer.addChild(desc);

            if (!opt.enabled) {
                const reason = opt.key === "recover" ? "(HP Full)" : "(10+ Prestige)";
                const reasonText = new PIXI.Text({
                    text: reason,
                    style: new PIXI.TextStyle({
                        fontSize: 10,
                        fill: 0xff6666,
                    }),
                });
                reasonText.anchor.set(0.5, 0);
                reasonText.position.set(cardX + cardW / 2, cardsY + cardH - 25);
                this.options.tokenRewardLayer.addChild(reasonText);
            }

            if (opt.enabled) {
                card.on("pointerover", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: 0x4a4a6a });
                    card.stroke({ color: 0xffd700, width: 3 });
                });

                card.on("pointerout", () => {
                    card.clear();
                    card.roundRect(cardX, cardsY, cardW, cardH, 12);
                    card.fill({ color: opt.color });
                    card.stroke({ color: 0xffffff, width: 2 });
                });

                card.on("pointerdown", () => {
                    this.options.game.chooseReward(opt.key as "standard" | "recover" | "push");
                    this.hideTokenRewardUI();
                    this.options.onRenderAll();
                });
            }
        });
    }
}
