/**
 * TextInput - Text input field component
 * Note: Uses browser prompt for actual input (PixiJS limitation)
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { TEXT_STYLES } from '../styles/fonts';

export interface TextInputOptions {
    placeholder?: string;
    value?: string;
    width?: number;
    height?: number;
    maxLength?: number;
    uppercase?: boolean;
    centered?: boolean;
    onChange?: (value: string) => void;
}

export class TextInput extends PIXI.Container {
    private background: PIXI.Graphics;
    private textDisplay: PIXI.Text;
    private placeholderText: PIXI.Text;
    private cursorLine: PIXI.Graphics;
    
    private options: Required<Omit<TextInputOptions, 'onChange'>> & { onChange?: (value: string) => void };
    private _value = '';
    private isFocused = false;
    private cursorBlinkInterval: number | null = null;
    
    constructor(options: TextInputOptions = {}) {
        super();
        
        this.options = {
            placeholder: options.placeholder ?? 'Enter text...',
            value: options.value ?? '',
            width: options.width ?? 300,
            height: options.height ?? 52,
            maxLength: options.maxLength ?? 40,
            uppercase: options.uppercase ?? false,
            centered: options.centered ?? false,
            onChange: options.onChange,
        };
        
        this._value = this.options.value;
        
        // Create components
        this.background = new PIXI.Graphics();
        
        this.placeholderText = new PIXI.Text({
            text: this.options.placeholder,
            style: new PIXI.TextStyle({
                ...TEXT_STYLES.placeholder,
                letterSpacing: this.options.uppercase ? 4 : 0,
            }),
        });
        
        this.textDisplay = new PIXI.Text({
            text: this._value,
            style: new PIXI.TextStyle({
                ...TEXT_STYLES.input,
                letterSpacing: this.options.uppercase ? 4 : 0,
            }),
        });
        
        this.cursorLine = new PIXI.Graphics();
        this.cursorLine.visible = false;
        
        // Add children
        this.addChild(this.background);
        this.addChild(this.placeholderText);
        this.addChild(this.textDisplay);
        this.addChild(this.cursorLine);
        
        // Setup interaction
        this.eventMode = 'static';
        this.cursor = 'text';
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width, this.options.height);
        
        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerover', () => this.draw(true));
        this.on('pointerout', () => this.draw(false));
        
        this.draw();
        this.layout();
    }
    
    private onPointerDown(): void {
        // Use browser prompt for text input (PixiJS limitation for text editing)
        const result = prompt(this.options.placeholder, this._value);
        if (result !== null) {
            this.setValue(result);
        }
    }
    
    private draw(isHovered = false): void {
        const { width, height } = this.options;
        const radius = 10;
        
        this.background.clear();
        
        // Background
        this.background.roundRect(0, 0, width, height, radius);
        this.background.fill({ color: 0x000000, alpha: 0.3 });
        
        // Border
        const borderColor = this.isFocused 
            ? COLORS.primary 
            : (isHovered ? COLORS.borderLight : COLORS.border);
        this.background.roundRect(0, 0, width, height, radius);
        this.background.stroke({ color: borderColor, width: 1 });
        
        // Glow when focused
        if (this.isFocused) {
            this.background.roundRect(-2, -2, width + 4, height + 4, radius + 2);
            this.background.fill({ color: COLORS.primary, alpha: 0.1 });
        }
    }
    
    private layout(): void {
        const { width, height, centered } = this.options;
        const padding = 18;
        
        if (centered) {
            this.placeholderText.anchor.set(0.5);
            this.placeholderText.position.set(width / 2, height / 2);
            
            this.textDisplay.anchor.set(0.5);
            this.textDisplay.position.set(width / 2, height / 2);
        } else {
            this.placeholderText.anchor.set(0, 0.5);
            this.placeholderText.position.set(padding, height / 2);
            
            this.textDisplay.anchor.set(0, 0.5);
            this.textDisplay.position.set(padding, height / 2);
        }
        
        // Update visibility
        this.placeholderText.visible = this._value.length === 0;
        this.textDisplay.visible = this._value.length > 0;
    }
    
    private startCursorBlink(): void {
        if (this.cursorBlinkInterval) return;
        
        this.cursorBlinkInterval = window.setInterval(() => {
            this.cursorLine.visible = !this.cursorLine.visible;
        }, 530);
    }
    
    private stopCursorBlink(): void {
        if (this.cursorBlinkInterval) {
            clearInterval(this.cursorBlinkInterval);
            this.cursorBlinkInterval = null;
        }
        this.cursorLine.visible = false;
    }
    
    // Public API
    get value(): string {
        return this._value;
    }
    
    setValue(value: string): void {
        let newValue = value.slice(0, this.options.maxLength);
        if (this.options.uppercase) {
            newValue = newValue.toUpperCase();
        }
        
        this._value = newValue;
        this.textDisplay.text = newValue;
        this.layout();
        this.options.onChange?.(newValue);
    }
    
    setPlaceholder(placeholder: string): void {
        this.options.placeholder = placeholder;
        this.placeholderText.text = placeholder;
    }
    
    focus(): void {
        this.isFocused = true;
        this.draw();
        this.startCursorBlink();
    }
    
    blur(): void {
        this.isFocused = false;
        this.draw();
        this.stopCursorBlink();
    }
    
    destroy(): void {
        this.stopCursorBlink();
        super.destroy({ children: true });
    }
}
