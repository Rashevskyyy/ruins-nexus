import * as PIXI from "pixi.js";

export type HeroBoardTooltipData = {
    title: string;
    description: string;
    stats?: string[];
    accentColor?: number;
    icon?: string;
};

export class HeroBoardTooltip {
    private container = new PIXI.Container();
    private bg = new PIXI.Graphics();
    private titleText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({ fontSize: 12, fill: 0xffffff, fontWeight: "700" }),
    });
    private descText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
            fontSize: 11,
            fill: 0xb9c0cc,
            wordWrap: true,
            wordWrapWidth: 220,
        }),
    });
    private statItems: Array<{ bg: PIXI.Graphics; text: PIXI.Text }> = [];

    constructor(private layer: PIXI.Container, private app: PIXI.Application) {
        this.container.visible = false;
        this.container.addChild(this.bg);
        this.container.addChild(this.titleText);
        this.container.addChild(this.descText);
        this.layer.addChild(this.container);
    }

    attach(target: PIXI.DisplayObject, data: HeroBoardTooltipData): void {
        target.eventMode = "static";
        target.cursor = "pointer";
        target.on("pointerover", () => this.show(target, data));
        target.on("pointerout", () => this.hide());
    }

    private show(target: PIXI.DisplayObject, data: HeroBoardTooltipData): void {
        const titlePrefix = data.icon ? `${data.icon} ` : "";
        this.titleText.text = `${titlePrefix}${data.title}`;
        this.descText.text = data.description;

        const maxWidth = 220;
        const spacing = 8;
        const stats = data.stats ?? [];
        let contentHeight = this.titleText.height + spacing + this.descText.height;

        this.clearStats();

        if (stats.length > 0) {
            let statY = 0;
            for (const stat of stats) {
                const statText = new PIXI.Text({
                    text: stat,
                    style: new PIXI.TextStyle({ fontSize: 10, fill: 0xe2e8f0, fontWeight: "600" }),
                });
                const statBg = new PIXI.Graphics();
                const statPadding = 6;
                const statWidth = Math.min(statText.width + statPadding * 2, maxWidth - 24);
                statText.anchor.set(0, 0);

                statBg.roundRect(0, 0, statWidth, statText.height + 6, 6);
                statBg.fill({ color: 0x0b1220, alpha: 0.7 });
                statBg.stroke({ color: data.accentColor ?? 0x2a4a6a, width: 1, alpha: 0.6 });

                const item = { bg: statBg, text: statText };
                this.statItems.push(item);
                statY += statText.height + 10;
            }

            contentHeight += spacing + statY;
        }

        const width = maxWidth;
        const height = contentHeight + 18;
        this.bg.clear();
        this.bg.roundRect(0, 0, width, height, 10);
        this.bg.fill({ color: 0x0b1220, alpha: 0.95 });
        this.bg.stroke({ color: data.accentColor ?? 0x2a4a6a, width: 1, alpha: 0.8 });

        this.titleText.position.set(12, 10);
        this.descText.position.set(12, 10 + this.titleText.height + spacing);

        let statsY = this.descText.position.y + this.descText.height + spacing;
        for (const item of this.statItems) {
            item.bg.position.set(0, statsY);
            item.text.position.set(12 + 6, statsY + 3);
            this.container.addChild(item.bg);
            this.container.addChild(item.text);
            statsY += item.text.height + 10;
        }

        const bounds = target.getBounds();
        let x = bounds.x + bounds.width + 12;
        let y = bounds.y;

        if (x + width > this.app.renderer.width) {
            x = bounds.x - width - 12;
        }

        if (y + height > this.app.renderer.height) {
            y = this.app.renderer.height - height - 10;
        }

        this.container.position.set(x, y);
        this.container.visible = true;
    }

    private hide(): void {
        this.container.visible = false;
    }

    private clearStats(): void {
        for (const item of this.statItems) {
            this.container.removeChild(item.bg);
            this.container.removeChild(item.text);
        }
        this.statItems = [];
    }
}
