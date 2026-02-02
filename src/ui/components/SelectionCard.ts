/**
 * SelectionCard - Selectable card for options like player count, game mode
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { createTextStyle } from '../styles/fonts';

export interface SelectionCardOptions {
    icon?: string;
    title: string;
    subtitle?: string;
    width?: number;
    height?: number;
    selected?: boolean;
    disabled?: boolean;
    onSelect?: () => void;
}

export class SelectionCard extends PIXI.Container {
    private background: PIXI.Graphics;
    private iconText: PIXI.Text | null = null;
    private titleText: PIXI.Text;
    private subtitleText: PIXI.Text | null = null;
    private glowEffect: PIXI.Graphics;
    
    private options: Required<Omit<SelectionCardOptions, 'onSelect'>> & { onSelect?: () => void };
    private _selected = false;
    private isHovered = false;
    
    constructor(options: SelectionCardOptions) {
        super();
        
        this.options = {
            icon: options.icon ?? '',
            title: options.title,
            subtitle: options.subtitle ?? '',
            width: options.width ?? 120,
            height: options.height ?? 100,
            selected: options.selected ?? false,
            disabled: options.disabled ?? false,
            onSelect: options.onSelect,
        };
        
        this._selected = this.options.selected;
        
        // Create components
        this.background = new PIXI.Graphics();
        this.glowEffect = new PIXI.Graphics();
        
        // Create icon if provided
        if (this.options.icon) {
            this.iconText = new PIXI.Text({
                text: this.options.icon,
                style: new PIXI.TextStyle({ fontSize: 28 }),
            });
            this.iconText.anchor.set(0.5);
        }
        
        // Create title
        this.titleText = new PIXI.Text({
            text: this.options.title,
            style: createTextStyle('body', { fontWeight: '600' }),
        });
        this.titleText.anchor.set(0.5);
        
        // Create subtitle if provided
        if (this.options.subtitle) {
            this.subtitleText = new PIXI.Text({
                text: this.options.subtitle,
                style: createTextStyle('bodySmall', { fontSize: 12, fill: COLORS.textMuted }),
            });
            this.subtitleText.anchor.set(0.5);
        }
        
        // Add children
        this.addChild(this.glowEffect);
        this.addChild(this.background);
        if (this.iconText) this.addChild(this.iconText);
        this.addChild(this.titleText);
        if (this.subtitleText) this.addChild(this.subtitleText);
        
        // Setup interaction
        this.eventMode = 'static';
        this.cursor = this.options.disabled ? 'default' : 'pointer';
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width, this.options.height);
        
        this.setupEvents();
        this.draw();
        this.layout();
    }
    
    private setupEvents(): void {
        if (this.options.disabled) return;
        
        this.on('pointerover', this.onPointerOver, this);
        this.on('pointerout', this.onPointerOut, this);
        this.on('pointerdown', this.onPointerDown, this);
    }
    
    private onPointerOver(): void {
        if (this.options.disabled) return;
        this.isHovered = true;
        this.draw();
    }
    
    private onPointerOut(): void {
        this.isHovered = false;
        this.draw();
    }
    
    private onPointerDown(): void {
        if (this.options.disabled) return;
        this.options.onSelect?.();
    }
    
    private draw(): void {
        const { width, height, disabled } = this.options;
        const radius = 12;
        
        this.background.clear();
        this.glowEffect.clear();
        
        // Determine colors
        let bgColor: number = 0x000000;
        let bgAlpha: number = 0.3;
        let borderColor: number = COLORS.border;
        let borderWidth: number = 2;
        
        if (disabled) {
            bgAlpha = 0.2;
            borderColor = COLORS.border;
        } else if (this._selected) {
            bgColor = COLORS.primary;
            bgAlpha = 0.15;
            borderColor = COLORS.primary;
            borderWidth = 2;
            
            // Draw glow
            this.glowEffect.roundRect(-2, -2, width + 4, height + 4, radius + 2);
            this.glowEffect.fill({ color: COLORS.primary, alpha: 0.2 });
        } else if (this.isHovered) {
            bgColor = COLORS.primary;
            bgAlpha = 0.05;
            borderColor = COLORS.primary;
            borderWidth = 1;
        }
        
        // Background
        this.background.roundRect(0, 0, width, height, radius);
        this.background.fill({ color: bgColor, alpha: bgAlpha });
        
        // Border
        this.background.roundRect(0, 0, width, height, radius);
        this.background.stroke({ color: borderColor, width: borderWidth, alpha: disabled ? 0.3 : (this._selected || this.isHovered ? 1 : 0.4) });
        
        // Update text colors
        const titleColor = this._selected ? COLORS.primaryLight : (disabled ? COLORS.textDark : COLORS.textWhite);
        (this.titleText.style as PIXI.TextStyle).fill = titleColor;
        this.titleText.alpha = disabled ? 0.5 : 1;
        
        if (this.iconText) {
            this.iconText.alpha = disabled ? 0.5 : 1;
        }
        if (this.subtitleText) {
            this.subtitleText.alpha = disabled ? 0.5 : 1;
        }
    }
    
    private layout(): void {
        const { width, height, icon, subtitle } = this.options;
        const centerX = width / 2;
        
        if (icon && subtitle) {
            // Icon + title + subtitle layout
            this.iconText!.position.set(centerX, height * 0.25);
            this.titleText.position.set(centerX, height * 0.55);
            this.subtitleText!.position.set(centerX, height * 0.75);
        } else if (icon) {
            // Icon + title layout
            this.iconText!.position.set(centerX, height * 0.35);
            this.titleText.position.set(centerX, height * 0.7);
        } else if (subtitle) {
            // Title + subtitle layout
            this.titleText.position.set(centerX, height * 0.4);
            this.subtitleText!.position.set(centerX, height * 0.65);
        } else {
            // Title only layout
            this.titleText.position.set(centerX, height / 2);
        }
    }
    
    // Public API
    get selected(): boolean {
        return this._selected;
    }
    
    setSelected(selected: boolean): void {
        this._selected = selected;
        this.draw();
    }
    
    setDisabled(disabled: boolean): void {
        this.options.disabled = disabled;
        this.cursor = disabled ? 'default' : 'pointer';
        this.draw();
    }
}
