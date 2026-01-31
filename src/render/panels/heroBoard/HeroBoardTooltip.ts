import * as PIXI from "pixi.js";

export type TooltipStatType = "positive" | "negative" | "neutral";

export type TooltipStat = {
    text: string;
    type?: TooltipStatType;
};

export type HeroBoardTooltipData = {
    title: string;
    description: string;
    stats?: (string | TooltipStat)[];
    accentColor?: number;
    icon?: string;
    itemType?: string; // e.g., "Weapon", "Passive", "Active", "Amulet", "Base Module", "Unit"
};

export class HeroBoardTooltip {
    private container = new PIXI.Container();
    private bg = new PIXI.Graphics();
    private headerContainer = new PIXI.Container();
    private iconText = new PIXI.Text({ text: "", style: new PIXI.TextStyle({ fontSize: 20 }) });
    private titleText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({ fontSize: 15, fill: 0xffffff, fontWeight: "700" }),
    });
    private typeBadge = new PIXI.Container();
    private typeBadgeBg = new PIXI.Graphics();
    private typeBadgeText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: "600" }),
    });
    private headerDivider = new PIXI.Graphics();
    private descText = new PIXI.Text({
        text: "",
        style: new PIXI.TextStyle({
            fontSize: 13,
            fill: 0xbbbbbb,
            wordWrap: true,
            wordWrapWidth: 212,
            lineHeight: 20,
        }),
    });
    private statItems: Array<{ bg: PIXI.Graphics; text: PIXI.Text }> = [];
    private boardX: number = 0;
    private boardW: number = 300;

    constructor(private layer: PIXI.Container, private app: PIXI.Application) {
        this.container.visible = false;

        // Build header
        this.headerContainer.addChild(this.iconText);
        this.headerContainer.addChild(this.titleText);
        this.typeBadge.addChild(this.typeBadgeBg);
        this.typeBadge.addChild(this.typeBadgeText);
        this.headerContainer.addChild(this.typeBadge);

        this.container.addChild(this.bg);
        this.container.addChild(this.headerContainer);
        this.container.addChild(this.headerDivider);
        this.container.addChild(this.descText);
        this.layer.addChild(this.container);
    }

    setBoardBounds(x: number, _y: number, w: number): void {
        this.boardX = x;
        this.boardW = w;
    }

    attach(target: PIXI.Container, data: HeroBoardTooltipData): void {
        target.eventMode = "static";
        target.cursor = "pointer";
        target.on("pointerover", () => this.show(target, data));
        target.on("pointerout", () => this.hide());
    }

    private show(target: PIXI.Container, data: HeroBoardTooltipData): void {
        const maxWidth = 240;
        const padding = 12;
        const spacing = 8;

        // Setup icon
        this.iconText.text = data.icon ?? "📋";
        this.iconText.position.set(0, 0);

        // Setup title with accent color
        this.titleText.text = data.title;
        this.titleText.style.fill = data.accentColor ?? 0xffffff;
        this.titleText.position.set(30, 2);

        // Setup type badge
        if (data.itemType) {
            const badgeColor = this.getTypeColor(data.itemType);
            this.typeBadgeText.text = data.itemType.toUpperCase();
            this.typeBadgeText.style.fill = badgeColor;

            this.typeBadgeBg.clear();
            const badgePadX = 6;
            const badgePadY = 2;
            const badgeW = this.typeBadgeText.width + badgePadX * 2;
            const badgeH = this.typeBadgeText.height + badgePadY * 2;
            this.typeBadgeBg.roundRect(0, 0, badgeW, badgeH, 4);
            this.typeBadgeBg.fill({ color: badgeColor, alpha: 0.2 });

            this.typeBadgeText.position.set(badgePadX, badgePadY);
            this.typeBadge.position.set(maxWidth - padding - badgeW - 30, 0);
            this.typeBadge.visible = true;
        } else {
            this.typeBadge.visible = false;
        }

        // Header divider position
        const headerHeight = Math.max(this.iconText.height, this.titleText.height);

        this.headerDivider.clear();
        this.headerDivider.rect(padding, headerHeight + spacing, maxWidth - padding * 2, 1);
        this.headerDivider.fill({ color: 0x2a3a4a, alpha: 0.8 });

        // Description
        this.descText.text = data.description;
        this.descText.position.set(padding, headerHeight + spacing + 8);

        let contentHeight = headerHeight + spacing + 8 + this.descText.height;

        // Clear and rebuild stats
        this.clearStats();

        const stats = data.stats ?? [];
        if (stats.length > 0) {
            // Add stats divider
            const statsDividerY = contentHeight + spacing;
            const statsDivider = new PIXI.Graphics();
            statsDivider.rect(padding, statsDividerY, maxWidth - padding * 2, 1);
            statsDivider.fill({ color: 0x2a3a4a, alpha: 0.8 });
            this.container.addChild(statsDivider);
            this.statItems.push({ bg: statsDivider, text: new PIXI.Text({ text: "" }) });

            contentHeight = statsDividerY + spacing + 4;

            // Layout stats in a flex row
            let statX = padding;
            let statY = contentHeight;
            const statGap = 8;
            const maxStatRowWidth = maxWidth - padding * 2;
            let rowHeight = 0;

            for (const stat of stats) {
                const statData = typeof stat === "string" ? { text: stat, type: "neutral" as TooltipStatType } : stat;
                const statType = this.inferStatType(statData.text, statData.type);
                const statColor = this.getStatColor(statType);

                const statText = new PIXI.Text({
                    text: statData.text,
                    style: new PIXI.TextStyle({ fontSize: 11, fill: statColor, fontWeight: "600" }),
                });

                const statPadX = 8;
                const statPadY = 4;
                const statW = statText.width + statPadX * 2;
                const statH = statText.height + statPadY * 2;

                // Wrap to next row if needed
                if (statX + statW > maxStatRowWidth + padding && statX > padding) {
                    statX = padding;
                    statY += rowHeight + statGap;
                    rowHeight = 0;
                }

                const statBg = new PIXI.Graphics();
                statBg.roundRect(0, 0, statW, statH, 4);
                statBg.fill({ color: 0x000000, alpha: 0.3 });

                statBg.position.set(statX, statY);
                statText.position.set(statX + statPadX, statY + statPadY);

                this.container.addChild(statBg);
                this.container.addChild(statText);
                this.statItems.push({ bg: statBg, text: statText });

                statX += statW + statGap;
                rowHeight = Math.max(rowHeight, statH);
            }

            contentHeight = statY + rowHeight;
        }

        // Draw background
        const width = maxWidth;
        const height = contentHeight + padding;
        this.bg.clear();
        
        // Shadow effect
        this.bg.roundRect(-2, -2, width + 4, height + 4, 12);
        this.bg.fill({ color: 0x000000, alpha: 0.5 });
        
        // Main background with gradient effect
        this.bg.roundRect(0, 0, width, height, 10);
        this.bg.fill({ color: 0x0d1520, alpha: 0.98 });
        this.bg.stroke({ color: 0x2a4a6a, width: 1 });

        this.headerContainer.position.set(padding, padding);

        // Position tooltip - TO THE LEFT of the hero board panel (outside)
        const bounds = target.getBounds();
        let x: number;
        let y: number;

        // Horizontal: position to the LEFT of the hero board panel
        x = this.boardX - width - 12;
        
        // If doesn't fit on the left, show on the right of the board
        if (x < 10) {
            x = this.boardX + this.boardW + 12;
        }

        // Vertical: align with the hovered element
        y = bounds.y;
        
        // Make sure tooltip doesn't go above the screen
        if (y < 10) {
            y = 10;
        }
        
        // Make sure tooltip doesn't go below the screen
        if (y + height > this.app.renderer.height - 10) {
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
            if (item.text.text) this.container.removeChild(item.text);
        }
        this.statItems = [];
    }

    private getTypeColor(itemType: string): number {
        const typeColors: Record<string, number> = {
            weapon: 0xff6666,
            passive: 0x00aaff,
            active: 0xffaa00,
            consumable: 0x00ff88,
            amulet: 0xcc66ff,
            "base module": 0x4ade80,
            stat: 0x00ddff,
            race: 0x00ff88,
            "race ability": 0x00ff88,
            unit: 0xff6b6b,
        };
        return typeColors[itemType.toLowerCase()] ?? 0x888888;
    }

    private getStatColor(type: TooltipStatType): number {
        switch (type) {
            case "positive":
                return 0x00ff88;
            case "negative":
                return 0xff6666;
            default:
                return 0xaaaaaa;
        }
    }

    private inferStatType(text: string, explicitType?: TooltipStatType): TooltipStatType {
        if (explicitType) return explicitType;

        const lower = text.toLowerCase();

        // Positive indicators
        if (
            (text.includes("+") && !lower.includes("cost")) ||
            lower.includes("heal") ||
            lower.includes("passive") ||
            lower.includes("bonus") ||
            (lower.includes("-") && lower.includes("💀")) // -💀 is good
        ) {
            return "positive";
        }

        // Negative indicators
        if (lower.includes("cost") || lower.includes("lose") || lower.includes("damage taken")) {
            return "negative";
        }

        return "neutral";
    }
}
