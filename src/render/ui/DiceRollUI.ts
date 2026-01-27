import * as PIXI from "pixi.js";

export class DiceRollUI {
    private diceResult: { swords: number; skulls: number } | null = null;
    private diceCallback: (() => void) | null = null;

    constructor(private app: PIXI.Application, private layer: PIXI.Container) {}

    private getPanelLayout(): {
        panelW: number;
        panelH: number;
        panelX: number;
        panelY: number;
        diceX: number;
        diceY: number;
    } {
        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;
        const panelW = 240;
        const panelH = 240;
        const panelX = screenW - panelW - 48;
        const panelY = screenH - panelH - 72;

        return {
            panelW,
            panelH,
            panelX,
            panelY,
            diceX: panelX + panelW / 2,
            diceY: panelY + 110,
        };
    }

    public showDiceRoll(result: { swords: number; skulls: number }, onComplete?: () => void): void {
        this.diceResult = result;
        this.diceCallback = onComplete || null;

        this.showDiceReadyToRoll();
    }

    private showDiceReadyToRoll(): void {
        this.layer.removeChildren();

        const { panelW, panelH, panelX, panelY, diceX, diceY } = this.getPanelLayout();

        // Semi-transparent panel background
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 14);
        panel.fill({ color: 0x0f172a, alpha: 0.96 });
        panel.stroke({ color: 0x38bdf8, width: 2, alpha: 0.9 });
        this.layer.addChild(panel);

        const header = new PIXI.Graphics();
        header.roundRect(panelX + 6, panelY + 6, panelW - 12, 34, 10);
        header.fill({ color: 0x111827, alpha: 0.95 });
        header.stroke({ color: 0x22d3ee, width: 1, alpha: 0.7 });
        this.layer.addChild(header);

        // Combat title
        const titleText = new PIXI.Text({
            text: "🎲 DICE ROLL",
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xe2e8f0,
                fontWeight: "bold",
            }),
        });
        titleText.anchor.set(0.5);
        titleText.position.set(panelX + panelW / 2, panelY + 23);
        this.layer.addChild(titleText);

        // Dice container
        const diceSize = 86;

        // Static dice with "🎲"
        const dice = new PIXI.Graphics();
        dice.roundRect(diceX - diceSize / 2, diceY - diceSize / 2, diceSize, diceSize, 14);
        dice.fill({ color: 0x1f2937 });
        dice.stroke({ color: 0x38bdf8, width: 3 });
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
            text: "🎯 Click to Roll",
            style: new PIXI.TextStyle({
                fontSize: 13,
                fill: 0x7dd3fc,
                fontWeight: "bold",
            }),
        });
        rollText.anchor.set(0.5);
        rollText.position.set(diceX, panelY + panelH - 28);
        this.layer.addChild(rollText);

        // Hover effect on dice
        dice.on("pointerover", () => {
            dice.clear();
            dice.roundRect(diceX - diceSize / 2, diceY - diceSize / 2, diceSize, diceSize, 14);
            dice.fill({ color: 0x273449 });
            dice.stroke({ color: 0xfbbf24, width: 4 });
        });

        dice.on("pointerout", () => {
            dice.clear();
            dice.roundRect(diceX - diceSize / 2, diceY - diceSize / 2, diceSize, diceSize, 14);
            dice.fill({ color: 0x1f2937 });
            dice.stroke({ color: 0x38bdf8, width: 3 });
        });

        // Click to start rolling
        dice.on("pointerdown", () => {
            this.animateDiceRoll();
        });
    }

    private animateDiceRoll(): void {
        if (!this.diceResult) return;

        this.layer.removeChildren();

        const { panelW, panelH, panelX, panelY, diceX, diceY } = this.getPanelLayout();

        // Semi-transparent panel background
        const panel = new PIXI.Graphics();
        panel.roundRect(panelX, panelY, panelW, panelH, 14);
        panel.fill({ color: 0x0f172a, alpha: 0.96 });
        panel.stroke({ color: 0xfbbf24, width: 2 });
        panel.eventMode = "static"; // Make panel interactive
        this.layer.addChild(panel);

        const header = new PIXI.Graphics();
        header.roundRect(panelX + 6, panelY + 6, panelW - 12, 34, 10);
        header.fill({ color: 0x111827, alpha: 0.95 });
        header.stroke({ color: 0xfbbf24, width: 1, alpha: 0.8 });
        this.layer.addChild(header);

        // Dice container
        const diceSize = 86;

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
                fill: 0xfbbf24,
                fontWeight: "bold",
            }),
        });
        rollingText.anchor.set(0.5);
        rollingText.position.set(diceX, panelY + 23);
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
            dice.roundRect(diceX - actualSize / 2 + wobble, diceY - actualSize / 2, actualSize, actualSize, 14);
            dice.fill({ color: 0x1f2937 });
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
                        fontSize: 20,
                        fill: 0xffffff,
                        fontWeight: "700",
                    }),
                });
                resultText.anchor.set(0.5);
                resultText.position.set(diceX, panelY + panelH - 60);
                this.layer.addChild(resultText);

                // "Click to continue" text
                const continueText = new PIXI.Text({
                    text: "Click to continue...",
                    style: new PIXI.TextStyle({
                        fontSize: 12,
                        fill: 0x888888,
                        fontStyle: "italic",
                    }),
                });
                continueText.anchor.set(0.5);
                continueText.position.set(diceX, panelY + panelH - 28);
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
