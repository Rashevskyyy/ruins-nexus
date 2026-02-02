/**
 * LobbyActionButton - Styled action buttons for lobby bottom bar
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';
import { tweenTo, TIMING } from '../../styles/animations';

export type LobbyButtonStyle = 'primary' | 'secondary' | 'ready' | 'danger';

export interface LobbyActionButtonOptions {
    icon: string;
    label: string;
    style: LobbyButtonStyle;
    width?: number;
    height?: number;
    disabled?: boolean;
    onClick?: () => void;
}

// Button style configurations
const BUTTON_STYLES = {
    primary: {
        gradientStart: 0x00aa66,
        gradientEnd: 0x008855,
        shadowColor: 0x00aa66,
        textColor: 0xffffff,
        isOutline: false,
    },
    secondary: {
        gradientStart: 0x0088ff,
        gradientEnd: 0x0066cc,
        shadowColor: 0x0088ff,
        textColor: 0xffffff,
        isOutline: false,
    },
    ready: {
        gradientStart: 0x0088ff,
        gradientEnd: 0x0066cc,
        shadowColor: 0x0088ff,
        textColor: 0xffffff,
        isOutline: false,
    },
    danger: {
        fill: 0xff6b6b,
        fillAlpha: 0.15,
        border: 0xff6b6b,
        borderAlpha: 0.3,
        textColor: 0xff6b6b,
        isOutline: true,
    },
};

export class LobbyActionButton extends PIXI.Container {
    private bg: PIXI.Graphics;
    private iconText: PIXI.Text;
    private labelText: PIXI.Text;

    private options: Required<LobbyActionButtonOptions>;
    private styleConfig: typeof BUTTON_STYLES.primary | typeof BUTTON_STYLES.danger;
    private isHovered = false;
    private baseY = 0;

    constructor(options: LobbyActionButtonOptions) {
        super();

        this.options = {
            icon: options.icon,
            label: options.label,
            style: options.style,
            width: options.width ?? 160,
            height: options.height ?? 52,
            disabled: options.disabled ?? false,
            onClick: options.onClick ?? (() => {}),
        };

        this.styleConfig = BUTTON_STYLES[this.options.style];

        // Background
        this.bg = new PIXI.Graphics();
        this.addChild(this.bg);

        // Icon
        this.iconText = new PIXI.Text({
            text: this.options.icon,
            style: { fontSize: 18 },
        });
        this.addChild(this.iconText);

        // Label
        this.labelText = new PIXI.Text({
            text: this.options.label,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 16,
                fontWeight: '700',
                fill: this.styleConfig.textColor,
                letterSpacing: 2,
            }),
        });
        this.addChild(this.labelText);

        this.drawNormal();
        this.layoutContent();
        this.setupInteraction();
    }

    private drawNormal(): void {
        const { width, height, disabled } = this.options;
        const radius = 12;

        this.bg.clear();

        if (disabled) {
            this.bg.roundRect(0, 0, width, height, radius);
            this.bg.fill({ color: 0x444444, alpha: 0.5 });
            this.iconText.alpha = 0.5;
            this.labelText.alpha = 0.5;
            return;
        }

        this.iconText.alpha = 1;
        this.labelText.alpha = 1;

        if (this.styleConfig.isOutline) {
            // Outline style (danger)
            const config = this.styleConfig as typeof BUTTON_STYLES.danger;
            this.bg.roundRect(0, 0, width, height, radius);
            this.bg.fill({ color: config.fill, alpha: config.fillAlpha });
            this.bg.roundRect(0, 0, width, height, radius);
            this.bg.stroke({ color: config.border, width: 1, alpha: config.borderAlpha });
        } else {
            // Gradient style (solid buttons)
            const config = this.styleConfig as typeof BUTTON_STYLES.primary;

            // Main fill
            this.bg.roundRect(0, 0, width, height, radius);
            this.bg.fill({ color: config.gradientStart });

            // Darker bottom half for gradient effect
            this.bg.roundRect(0, height / 2, width, height / 2, radius);
            this.bg.fill({ color: config.gradientEnd, alpha: 0.5 });
        }
    }

    private drawHover(): void {
        this.drawNormal();

        if (!this.options.disabled) {
            const { width, height } = this.options;
            // Add subtle highlight
            this.bg.roundRect(0, 0, width, height, 12);
            this.bg.fill({ color: 0xffffff, alpha: 0.1 });
        }
    }

    private layoutContent(): void {
        const { width, height } = this.options;

        // Calculate total width of icon + gap + label
        const gap = 10;
        const totalWidth = this.iconText.width + gap + this.labelText.width;
        const startX = (width - totalWidth) / 2;

        this.iconText.position.set(startX, (height - this.iconText.height) / 2);
        this.labelText.position.set(startX + this.iconText.width + gap, (height - this.labelText.height) / 2);
    }

    private setupInteraction(): void {
        this.eventMode = 'static';
        this.cursor = this.options.disabled ? 'not-allowed' : 'pointer';
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width, this.options.height);

        this.on('pointerover', () => {
            if (this.options.disabled) return;
            this.isHovered = true;
            this.baseY = this.y;
            this.drawHover();
            tweenTo(this, { scaleX: 1.02, scaleY: 1.02, y: this.baseY - 2 }, TIMING.buttonHover);
        });

        this.on('pointerout', () => {
            this.isHovered = false;
            this.drawNormal();
            tweenTo(this, { scaleX: 1, scaleY: 1, y: this.baseY }, TIMING.buttonHover);
        });

        this.on('pointerdown', () => {
            if (this.options.disabled) return;
            tweenTo(this, { scaleX: 0.98, scaleY: 0.98 }, TIMING.buttonClick);
        });

        this.on('pointerup', () => {
            if (this.options.disabled) return;
            tweenTo(this, { scaleX: this.isHovered ? 1.02 : 1, scaleY: this.isHovered ? 1.02 : 1 }, TIMING.buttonClick);
            this.options.onClick();
        });
    }

    setDisabled(disabled: boolean): void {
        this.options.disabled = disabled;
        this.cursor = disabled ? 'not-allowed' : 'pointer';
        this.drawNormal();
    }

    setLabel(label: string): void {
        this.options.label = label;
        this.labelText.text = label;
        this.layoutContent();
    }

    setIcon(icon: string): void {
        this.options.icon = icon;
        this.iconText.text = icon;
        this.layoutContent();
    }
}
