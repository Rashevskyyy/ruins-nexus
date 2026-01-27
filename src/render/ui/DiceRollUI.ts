import * as PIXI from "pixi.js";

export class DiceRollUI {
    private diceResult: { swords: number; skulls: number } | null = null;
    private diceCallback: (() => void) | null = null;

    constructor(private app: PIXI.Application, private layer: PIXI.Container) {}

    public showDiceRoll(result: { swords: number; skulls: number }, onComplete?: () => void): void {
        this.diceResult = result;
        this.diceCallback = onComplete || null;

        this.showDiceReadyToRoll();
    }

    private showDiceReadyToRoll(): void {
        this.layer.removeChildren();

        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;

        // Panel in bottom-right corner (moved up and left)
        const panelW = 200;
        const panelH = 220;
        const panelX = screenW - panelW - 400;
        const panelY = screenH - panelH - 90;

        // Semi-transparent panel background
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 12);
        panel.fill({ color: 0x1a1a2e, alpha: 0.95 });
        panel.stroke({ color: 0x00ffff, width: 2 });
        this.layer.addChild(panel);

        // Combat title
        const titleText = new PIXI.Text({
            text: "⚔️ COMBAT!",
            style: new PIXI.TextStyle({
                fontSize: 18,
                fill: 0xff6b6b,
                fontWeight: "bold",
            }),
        });
        titleText.anchor.set(0.5);
        titleText.position.set(panelX + panelW / 2, panelY + 25);
        this.layer.addChild(titleText);

        // Dice container
        const diceSize = 80;
        const diceX = panelX + panelW / 2;
        const diceY = panelY + 90;

        // Static dice with "🎲"
        const dice = new PIXI.Graphics();
        dice.roundRect(diceX - diceSize / 2, diceY - diceSize / 2, diceSize, diceSize, 12);
        dice.fill({ color: 0x2a2a4e });
        dice.stroke({ color: 0x00ffff, width: 3 });
        dice.eventMode = "static";
        dice.cursor = "pointer";
        this.layer.addChild(dice);

        // Question mark
        const diceText = new PIXI.Text({
            text: "🎲",
            style: new PIXI.TextStyle({
                fontSize: 36,
            }),
        });
        diceText.anchor.set(0.5);
        diceText.position.set(diceX, diceY);
        this.layer.addChild(diceText);

        // "Click to Roll" text
        const rollText = new PIXI.Text({
            text: "🎯 Click to Roll!",
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: 0x00ffff,
                fontWeight: "bold",
            }),
        });
        rollText.anchor.set(0.5);
        rollText.position.set(diceX, panelY + panelH - 30);
        this.layer.addChild(rollText);

        // Hover effect on dice
        dice.on("pointerover", () => {
            dice.clear();
            dice.roundRect(diceX - diceSize / 2, diceY - diceSize / 2, diceSize, diceSize, 12);
            dice.fill({ color: 0x3a3a5e });
            dice.stroke({ color: 0xffd700, width: 4 });
        });

        dice.on("pointerout", () => {
            dice.clear();
            dice.roundRect(diceX - diceSize / 2, diceY - diceSize / 2, diceSize, diceSize, 12);
            dice.fill({ color: 0x2a2a4e });
            dice.stroke({ color: 0x00ffff, width: 3 });
        });

        // Click to start rolling
        dice.on("pointerdown", () => {
            this.animateDiceRoll();
        });
    }

    private animateDiceRoll(): void {
        if (!this.diceResult) return;

        this.layer.removeChildren();

        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;

        // Panel in bottom-right corner (moved up and left)
        const panelW = 200;
        const panelH = 220;
        const panelX = screenW - panelW - 40;
        const panelY = screenH - panelH - 60;

        // Semi-transparent panel background
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 12);
        panel.fill({ color: 0x1a1a2e, alpha: 0.95 });
        panel.stroke({ color: 0xffd700, width: 2 });
        panel.eventMode = "static"; // Make panel interactive
        this.layer.addChild(panel);

        // Dice container
        const diceSize = 80;
        const diceX = panelX + panelW / 2;
        const diceY = panelY + 90;

        // Animation: show random faces quickly, then settle on result
        const DICE_FACES = [
            { emoji: "🗡️🗡️🗡️", color: 0x00ff00 }, // 3 swords
            { emoji: "🗡️🗡️", color: 0x00dd00 }, // 2 swords
            { emoji: "🗡️", color: 0x00bb00 }, // 1 sword
            { emoji: "🗡️💀", color: 0xffaa00 }, // 1 sword + 1 skull
            { emoji: "💀", color: 0xff4444 }, // 1 skull
            { emoji: "💀💀", color: 0xff0000 }, // 2 skulls
        ];

        // Get the final face based on result
        let finalFaceIdx = 0;
        if (this.diceResult.swords === 3) finalFaceIdx = 0;
        else if (this.diceResult.swords === 2 && this.diceResult.skulls === 0) finalFaceIdx = 1;
        else if (this.diceResult.swords === 1 && this.diceResult.skulls === 0) finalFaceIdx = 2;
        else if (this.diceResult.swords === 1 && this.diceResult.skulls === 1) finalFaceIdx = 3;
        else if (this.diceResult.swords === 0 && this.diceResult.skulls === 1) finalFaceIdx = 4;
        else if (this.diceResult.swords === 0 && this.diceResult.skulls === 2) finalFaceIdx = 5;

        const finalFace = DICE_FACES[finalFaceIdx];

        // Rolling text
        const rollingText = new PIXI.Text({
            text: "🎲 Rolling...",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffd700,
                fontWeight: "bold",
            }),
        });
        rollingText.anchor.set(0.5);
        rollingText.position.set(diceX, panelY + 25);
        this.layer.addChild(rollingText);

        // Animate rolling
        let frame = 0;
        const totalFrames = 20;
        const rollInterval = setInterval(() => {
            frame++;

            // Remove old dice elements (keep panel and rolling text)
            for (let i = this.layer.children.length - 1; i > 1; i--) {
                this.layer.removeChildAt(i);
            }

            // Random face during animation
            const randomFace = DICE_FACES[Math.floor(Math.random() * 6)];
            const currentFace = frame >= totalFrames ? finalFace : randomFace;

            // Draw dice
            const dice = new PIXI.Graphics();
            const wobble = frame < totalFrames ? Math.sin(frame * 0.8) * 5 : 0;
            const scale = frame < totalFrames ? 1 + Math.sin(frame * 0.5) * 0.03 : 1;

            const actualSize = diceSize * scale;
            dice.roundRect(diceX - actualSize / 2 + wobble, diceY - actualSize / 2, actualSize, actualSize, 12);
            dice.fill({ color: 0x2a2a4e });
            dice.stroke({ color: currentFace.color, width: 3 });
            this.layer.addChild(dice);

            // Dice emoji
            const diceText = new PIXI.Text({
                text: currentFace.emoji,
                style: new PIXI.TextStyle({
                    fontSize: 28 * scale,
                    fill: 0xffffff,
                }),
            });
            diceText.anchor.set(0.5);
            diceText.position.set(diceX + wobble, diceY);
            this.layer.addChild(diceText);

            // Result text (show after settling)
            if (frame >= totalFrames) {
                clearInterval(rollInterval);

                // Update rolling text to result
                rollingText.text = this.diceResult!.swords > 0 ? "⚔️ HIT!" : "💀 MISS!";
                rollingText.style.fill = this.diceResult!.swords > 0 ? 0x00ff00 : 0xff4444;

                // Result summary
                const resultText = new PIXI.Text({
                    text: `🗡️${this.diceResult!.swords}  💀${this.diceResult!.skulls}`,
                    style: new PIXI.TextStyle({
                        fontSize: 18,
                        fill: 0xffffff,
                        fontWeight: "700",
                    }),
                });
                resultText.anchor.set(0.5);
                resultText.position.set(diceX, panelY + panelH - 55);
                this.layer.addChild(resultText);

                // "Click to continue" text
                const continueText = new PIXI.Text({
                    text: "Click to continue...",
                    style: new PIXI.TextStyle({
                        fontSize: 11,
                        fill: 0x888888,
                        fontStyle: "italic",
                    }),
                });
                continueText.anchor.set(0.5);
                continueText.position.set(diceX, panelY + panelH - 25);
                this.layer.addChild(continueText);

                // Make dice and panel clickable to dismiss
                dice.eventMode = "static";
                dice.cursor = "pointer";
                panel.cursor = "pointer";

                const dismissDice = () => {
                    // Save callback BEFORE hideDiceRoll clears it!
                    const cb = this.diceCallback;
                    this.hideDiceRoll();
                    if (cb) cb();
                };

                panel.on("pointerdown", dismissDice);
                dice.on("pointerdown", dismissDice);
            }
        }, 70); // 70ms per frame = ~1.4s total animation
    }

    private hideDiceRoll(): void {
        this.layer.removeChildren();
        this.diceResult = null;
        this.diceCallback = null;
    }
}
