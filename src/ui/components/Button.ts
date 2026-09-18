/**
 * Button - Styled menu button component
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { TEXT_STYLES } from '../styles/fonts';
import { tweenTo, TIMING } from '../styles/animations';

export type ButtonStyle = 'primary' | 'secondary' | 'tertiary' | 'ghost';

export interface ButtonOptions {
    text: string;
    icon?: string;
    style?: ButtonStyle;
    width?: number;
    height?: number;
    fontSize?: number;
    disabled?: boolean;
    onClick?: () => void;
}

export class Button extends PIXI.Container {
    private background: PIXI.Graphics;
    private iconText: PIXI.Text | null = null;
    private labelText: PIXI.Text;
    private shineEffect: PIXI.Graphics;
    private shineMask: PIXI.Graphics;
    
    private options: Required<Omit<ButtonOptions, 'onClick'>> & { onClick?: () => void };
    private isHovered = false;
    private isPressed = false;
    private baseY = 0;
    
    constructor(options: ButtonOptions) {
        super();
        
        // Set defaults
        this.options = {
            text: options.text,
            icon: options.icon ?? '',
            style: options.style ?? 'primary',
            width: options.width ?? 320,
            height: options.height ?? 56,
            fontSize: options.fontSize ?? 18,
            disabled: options.disabled ?? false,
            onClick: options.onClick,
        };
        
        // Create components
        this.background = new PIXI.Graphics();
        this.shineEffect = new PIXI.Graphics();
        this.shineMask = new PIXI.Graphics();
        
        // Create label
        this.labelText = new PIXI.Text({
            text: this.options.text.toUpperCase(),
            style: new PIXI.TextStyle({
                ...TEXT_STYLES.button,
                fontSize: this.options.fontSize,
            }),
        });
        this.labelText.anchor.set(0.5);
        
        // Create icon if provided
        if (this.options.icon) {
            this.iconText = new PIXI.Text({
                text: this.options.icon,
                style: new PIXI.TextStyle({
                    fontSize: this.options.fontSize + 4,
                }),
            });
            this.iconText.anchor.set(0.5);
        }
        
        // Add children
        this.addChild(this.background);
        this.addChild(this.shineEffect);
        this.addChild(this.shineMask);
        if (this.iconText) this.addChild(this.iconText);
        this.addChild(this.labelText);
        
        // Setup interaction
        this.eventMode = 'static';
        this.cursor = this.options.disabled ? 'default' : 'pointer';
        this.hitArea = new PIXI.Rectangle(
            -this.options.width / 2,
            -this.options.height / 2,
            this.options.width,
            this.options.height
        );
        
        this.setupEvents();
        this.draw();
        this.layout();
    }
    
    private setupEvents(): void {
        if (this.options.disabled) return;
        
        this.on('pointerover', this.onPointerOver, this);
        this.on('pointerout', this.onPointerOut, this);
        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerup', this.onPointerUp, this);
        this.on('pointerupoutside', this.onPointerUp, this);
    }
    
    private onPointerOver(): void {
        this.isHovered = true;
        this.baseY = this.y;
        
        tweenTo(this, { scaleX: 1.02, scaleY: 1.02, y: this.baseY - 3 }, TIMING.buttonHover);
        this.draw();
        this.playShineAnimation();
    }
    
    private onPointerOut(): void {
        this.isHovered = false;
        this.isPressed = false;
        
        tweenTo(this, { scaleX: 1, scaleY: 1, y: this.baseY }, TIMING.buttonHover);
        this.draw();
    }
    
    private onPointerDown(): void {
        this.isPressed = true;
        tweenTo(this, { scaleX: 0.98, scaleY: 0.98 }, TIMING.buttonClick);
    }
    
    private onPointerUp(): void {
        if (this.isPressed) {
            this.isPressed = false;
            tweenTo(this, { scaleX: this.isHovered ? 1.02 : 1, scaleY: this.isHovered ? 1.02 : 1 }, TIMING.buttonClick);
            this.options.onClick?.();
        }
    }
    
    private getColors(): { bg: number; bgDark: number; shadow: number; shadowAlpha: number } {
        switch (this.options.style) {
            case 'primary':
                return {
                    bg: COLORS.buttonPrimaryGradientStart,
                    bgDark: COLORS.buttonPrimaryGradientEnd,
                    shadow: COLORS.glowPrimary,
                    shadowAlpha: 0.4,
                };
            case 'secondary':
                return {
                    bg: COLORS.buttonSecondaryGradientStart,
                    bgDark: COLORS.buttonSecondaryGradientEnd,
                    shadow: COLORS.glowSecondary,
                    shadowAlpha: 0.3,
                };
            case 'tertiary':
            case 'ghost':
            default:
                return {
                    bg: COLORS.buttonTertiaryBg,
                    bgDark: COLORS.buttonTertiaryBg,
                    shadow: 0x000000,
                    shadowAlpha: 0,
                };
        }
    }
    
    private draw(): void {
        const { width, height, style, disabled } = this.options;
        const colors = this.getColors();
        const radius = 12;
        
        this.background.clear();
        
        // Draw shadow/glow
        if (colors.shadowAlpha > 0 && !disabled) {
            const shadowAlpha = this.isHovered ? colors.shadowAlpha * 1.2 : colors.shadowAlpha;
            
            this.background.roundRect(-width / 2, -height / 2 + 4, width, height, radius);
            this.background.fill({ color: colors.shadow, alpha: shadowAlpha * 0.5 });
        }
        
        // Draw background
        const bgColor = disabled ? 0x3a3a4a : colors.bg;
        const alpha = disabled ? 0.6 : 1;
        
        this.background.roundRect(-width / 2, -height / 2, width, height, radius);
        this.background.fill({ color: bgColor, alpha });
        
        // Draw border for tertiary/ghost
        if (style === 'tertiary' || style === 'ghost') {
            this.background.roundRect(-width / 2, -height / 2, width, height, radius);
            this.background.stroke({ 
                color: disabled ? COLORS.border : (this.isHovered ? COLORS.borderLight : COLORS.border), 
                width: 1 
            });
        }
        
        // Update text opacity
        const textAlpha = disabled ? 0.5 : 1;
        this.labelText.alpha = textAlpha;
        if (this.iconText) this.iconText.alpha = textAlpha;
    }
    
    private layout(): void {
        const { width, height, icon } = this.options;
        
        if (this.iconText && icon) {
            // Position icon and text with gap
            const totalWidth = this.iconText.width + 12 + this.labelText.width;
            this.iconText.position.set(-totalWidth / 2 + this.iconText.width / 2, 0);
            this.labelText.position.set(-totalWidth / 2 + this.iconText.width + 12 + this.labelText.width / 2, 0);
        } else {
            this.labelText.position.set(0, 0);
        }
        
        // Setup shine mask
        this.shineMask.clear();
        this.shineMask.roundRect(-width / 2, -height / 2, width, height, 12);
        this.shineMask.fill({ color: 0xffffff });
        this.shineEffect.mask = this.shineMask;
    }
    
    private playShineAnimation(): void {
        const { width, height } = this.options;
        
        // Draw initial shine position (off-screen left)
        this.shineEffect.clear();
        this.shineEffect.alpha = 0.3;
        
        const shineWidth = 40;
        let shineX = -width / 2 - shineWidth;
        
        // Simple animation using interval (could use ticker instead)
        const animate = () => {
            if (this.destroyed || this.shineEffect.destroyed) return;
            shineX += 15;
            
            this.shineEffect.clear();
            this.shineEffect.moveTo(shineX, -height / 2);
            this.shineEffect.lineTo(shineX + shineWidth, -height / 2);
            this.shineEffect.lineTo(shineX + shineWidth - 20, height / 2);
            this.shineEffect.lineTo(shineX - 20, height / 2);
            this.shineEffect.closePath();
            this.shineEffect.fill({ color: 0xffffff, alpha: 0.3 });
            
            if (shineX < width / 2 + shineWidth && this.isHovered) {
                requestAnimationFrame(animate);
            } else {
                this.shineEffect.clear();
            }
        };
        
        animate();
    }
    
    // Public methods
    setText(text: string): void {
        this.options.text = text;
        this.labelText.text = text.toUpperCase();
        this.layout();
    }
    
    setDisabled(disabled: boolean): void {
        this.options.disabled = disabled;
        this.cursor = disabled ? 'default' : 'pointer';
        
        if (disabled) {
            this.off('pointerover', this.onPointerOver, this);
            this.off('pointerout', this.onPointerOut, this);
            this.off('pointerdown', this.onPointerDown, this);
            this.off('pointerup', this.onPointerUp, this);
        } else {
            this.setupEvents();
        }
        
        this.draw();
    }
    
    setOnClick(callback: () => void): void {
        this.options.onClick = callback;
    }
}
