import * as PIXI from "pixi.js";

export type ActionButtonCallback = (action: "craft" | "build") => void;

type ActionsContext = {
    layer: PIXI.Container;
    leftX: number;
    panelW: number;
    y: number;
    onAction?: ActionButtonCallback;
};

export class HeroBoardActionsSection {
    getSectionHeight(): number {
        return 64;
    }

    render({ layer, leftX, panelW, y, onAction }: ActionsContext): number {
        const sectionWidth = panelW - 28;
        const buttonGap = 12;
        const buttonHeight = 46;
        const buttonWidth = (sectionWidth - buttonGap) / 2;

        // Section background
        const sectionBg = new PIXI.Graphics();
        sectionBg.roundRect(leftX - 2, y, sectionWidth + 4, 58, 0);
        sectionBg.fill({ color: 0x0a0f14, alpha: 0.8 });
        layer.addChild(sectionBg);

        // Divider line at top
        const divider = new PIXI.Graphics();
        divider.rect(leftX, y, sectionWidth, 1);
        divider.fill({ color: 0x1a2a3a, alpha: 0.8 });
        layer.addChild(divider);

        y += 8;

        // Craft Button
        const craftBtn = this.createButton({
            x: leftX,
            y,
            width: buttonWidth,
            height: buttonHeight,
            label: "⚒️ CRAFT",
            gradientTop: 0x2a4a6a,
            gradientBottom: 0x1a3a5a,
            borderColor: 0x00aaff,
            textColor: 0x00ddff,
        });
        layer.addChild(craftBtn);

        craftBtn.eventMode = "static";
        craftBtn.cursor = "pointer";
        craftBtn.on("pointerover", () => this.onButtonHover(craftBtn, 0x3a5a7a, 0x2a4a6a));
        craftBtn.on("pointerout", () => this.onButtonHover(craftBtn, 0x2a4a6a, 0x1a3a5a));
        craftBtn.on("pointerdown", () => onAction?.("craft"));

        // Build Button
        const buildBtn = this.createButton({
            x: leftX + buttonWidth + buttonGap,
            y,
            width: buttonWidth,
            height: buttonHeight,
            label: "🏗️ BUILD",
            gradientTop: 0x2a4a3a,
            gradientBottom: 0x1a3a2a,
            borderColor: 0x4ade80,
            textColor: 0x4ade80,
        });
        layer.addChild(buildBtn);

        buildBtn.eventMode = "static";
        buildBtn.cursor = "pointer";
        buildBtn.on("pointerover", () => this.onButtonHover(buildBtn, 0x3a5a4a, 0x2a4a3a));
        buildBtn.on("pointerout", () => this.onButtonHover(buildBtn, 0x2a4a3a, 0x1a3a2a));
        buildBtn.on("pointerdown", () => onAction?.("build"));

        return y + buttonHeight + 10;
    }

    private createButton(opts: {
        x: number;
        y: number;
        width: number;
        height: number;
        label: string;
        gradientTop: number;
        gradientBottom: number;
        borderColor: number;
        textColor: number;
    }): PIXI.Container {
        const container = new PIXI.Container();

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, opts.width, opts.height, 8);
        // Simple gradient approximation using a fill
        bg.fill({ color: opts.gradientTop });
        bg.stroke({ color: opts.borderColor, width: 1 });
        container.addChild(bg);

        // Store colors for hover effect
        (container as PIXI.Container & { _bgColors: { top: number; bottom: number } })._bgColors = {
            top: opts.gradientTop,
            bottom: opts.gradientBottom,
        };

        const text = new PIXI.Text({
            text: opts.label,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: opts.textColor,
                fontWeight: "700",
                letterSpacing: 0.5,
            }),
        });
        text.anchor.set(0.5);
        text.position.set(opts.width / 2, opts.height / 2);
        container.addChild(text);

        container.position.set(opts.x, opts.y);

        return container;
    }

    private onButtonHover(
        container: PIXI.Container,
        hoverTop: number,
        _hoverBottom: number
    ): void {
        const bg = container.children[0] as PIXI.Graphics;
        if (!bg) return;

        const bounds = bg.getBounds();
        const width = bounds.width;
        const height = bounds.height;

        bg.clear();
        bg.roundRect(0, 0, width, height, 8);
        bg.fill({ color: hoverTop });

        // Get border color from original - approximate by using a slightly lighter version
        const stored = (container as PIXI.Container & { _bgColors?: { top: number } })._bgColors;
        if (stored) {
            bg.stroke({ color: hoverTop === stored.top ? 0x00aaff : 0x4ade80, width: 1 });
        }
    }
}
