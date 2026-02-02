/**
 * ToggleSwitch - Toggle switch component
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';

export interface ToggleSwitchOptions {
    active?: boolean;
    width?: number;
    height?: number;
    disabled?: boolean;
    onChange?: (active: boolean) => void;
}

export class ToggleSwitch extends PIXI.Container {
    private background: PIXI.Graphics;
    private knob: PIXI.Graphics;
    
    private options: Required<Omit<ToggleSwitchOptions, 'onChange'>> & { onChange?: (active: boolean) => void };
    private _active = false;
    
    constructor(options: ToggleSwitchOptions = {}) {
        super();
        
        this.options = {
            active: options.active ?? false,
            width: options.width ?? 44,
            height: options.height ?? 24,
            disabled: options.disabled ?? false,
            onChange: options.onChange,
        };
        
        this._active = this.options.active;
        
        // Create components
        this.background = new PIXI.Graphics();
        this.knob = new PIXI.Graphics();
        
        this.addChild(this.background);
        this.addChild(this.knob);
        
        // Setup interaction
        this.eventMode = 'static';
        this.cursor = this.options.disabled ? 'default' : 'pointer';
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width, this.options.height);
        
        this.on('pointerdown', this.onPointerDown, this);
        
        this.draw();
    }
    
    private onPointerDown(): void {
        if (this.options.disabled) return;
        this.toggle();
    }
    
    private draw(): void {
        const { width, height, disabled } = this.options;
        const radius = height / 2;
        const knobSize = height - 6;
        const knobX = this._active ? width - knobSize - 3 : 3;
        
        this.background.clear();
        this.knob.clear();
        
        // Background track
        const bgColor = disabled 
            ? COLORS.border 
            : (this._active ? COLORS.secondary : COLORS.border);
        const bgAlpha = disabled ? 0.3 : 1;
        
        this.background.roundRect(0, 0, width, height, radius);
        this.background.fill({ color: bgColor, alpha: bgAlpha });
        
        // Knob
        const knobColor = disabled ? COLORS.textMuted : COLORS.textWhite;
        this.knob.circle(knobX + knobSize / 2, height / 2, knobSize / 2);
        this.knob.fill({ color: knobColor });
        
        // Knob shadow when active
        if (this._active && !disabled) {
            this.knob.circle(knobX + knobSize / 2, height / 2, knobSize / 2 + 2);
            this.knob.fill({ color: COLORS.secondary, alpha: 0.3 });
        }
    }
    
    // Public API
    get active(): boolean {
        return this._active;
    }
    
    toggle(): void {
        this._active = !this._active;
        this.draw();
        this.options.onChange?.(this._active);
    }
    
    setActive(active: boolean): void {
        if (this._active !== active) {
            this._active = active;
            this.draw();
        }
    }
    
    setDisabled(disabled: boolean): void {
        this.options.disabled = disabled;
        this.cursor = disabled ? 'default' : 'pointer';
        this.draw();
    }
}
