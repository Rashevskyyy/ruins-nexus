/**
 * Slider - Horizontal slider component
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { createTextStyle } from '../styles/fonts';

export interface SliderOptions {
    min: number;
    max: number;
    value?: number;
    step?: number;
    width?: number;
    height?: number;
    showValue?: boolean;
    formatValue?: (value: number) => string;
    disabled?: boolean;
    onChange?: (value: number) => void;
}

export class Slider extends PIXI.Container {
    private track: PIXI.Graphics;
    private fill: PIXI.Graphics;
    private thumb: PIXI.Graphics;
    private valueText: PIXI.Text | null = null;
    
    private options: Required<Omit<SliderOptions, 'onChange' | 'formatValue'>> & {
        onChange?: (value: number) => void;
        formatValue: (value: number) => string;
    };
    private _value: number;
    private isDragging = false;
    
    constructor(options: SliderOptions) {
        super();
        
        this.options = {
            min: options.min,
            max: options.max,
            value: options.value ?? options.min,
            step: options.step ?? 1,
            width: options.width ?? 200,
            height: options.height ?? 24,
            showValue: options.showValue ?? true,
            formatValue: options.formatValue ?? ((v) => v.toString()),
            disabled: options.disabled ?? false,
            onChange: options.onChange,
        };
        
        this._value = this.options.value;
        
        // Create components
        this.track = new PIXI.Graphics();
        this.fill = new PIXI.Graphics();
        this.thumb = new PIXI.Graphics();
        
        if (this.options.showValue) {
            this.valueText = new PIXI.Text({
                text: this.options.formatValue(this._value),
                style: createTextStyle('bodySmall', { fill: COLORS.textLight }),
            });
            this.valueText.anchor.set(0, 0.5);
        }
        
        this.addChild(this.track);
        this.addChild(this.fill);
        this.addChild(this.thumb);
        if (this.valueText) this.addChild(this.valueText);
        
        // Setup interaction
        this.eventMode = 'static';
        this.cursor = this.options.disabled ? 'default' : 'pointer';
        this.hitArea = new PIXI.Rectangle(0, 0, this.options.width + 100, this.options.height);
        
        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointermove', this.onPointerMove, this);
        this.on('pointerup', this.onPointerUp, this);
        this.on('pointerupoutside', this.onPointerUp, this);
        
        this.draw();
    }
    
    private onPointerDown(e: PIXI.FederatedPointerEvent): void {
        if (this.options.disabled) return;
        this.isDragging = true;
        this.updateValueFromPosition(e.global.x);
    }
    
    private onPointerMove(e: PIXI.FederatedPointerEvent): void {
        if (!this.isDragging || this.options.disabled) return;
        this.updateValueFromPosition(e.global.x);
    }
    
    private onPointerUp(): void {
        this.isDragging = false;
    }
    
    private updateValueFromPosition(globalX: number): void {
        const { min, max, step, width } = this.options;
        const localPos = this.toLocal({ x: globalX, y: 0 });
        
        // Calculate normalized position (0-1)
        const normalized = Math.max(0, Math.min(1, localPos.x / width));
        
        // Calculate value with step
        const range = max - min;
        const rawValue = min + normalized * range;
        const steppedValue = Math.round(rawValue / step) * step;
        const clampedValue = Math.max(min, Math.min(max, steppedValue));
        
        if (clampedValue !== this._value) {
            this._value = clampedValue;
            this.draw();
            this.options.onChange?.(this._value);
        }
    }
    
    private draw(): void {
        const { min, max, width, height, disabled } = this.options;
        const trackHeight = 6;
        const trackY = (height - trackHeight) / 2;
        const thumbRadius = 9;
        
        // Calculate fill width
        const normalized = (this._value - min) / (max - min);
        const fillWidth = normalized * width;
        const thumbX = fillWidth;
        
        this.track.clear();
        this.fill.clear();
        this.thumb.clear();
        
        // Track background
        const trackColor = disabled ? COLORS.border : COLORS.border;
        this.track.roundRect(0, trackY, width, trackHeight, trackHeight / 2);
        this.track.fill({ color: trackColor, alpha: disabled ? 0.3 : 1 });
        
        // Fill
        if (fillWidth > 0) {
            const fillColor = disabled ? COLORS.textMuted : COLORS.primary;
            this.fill.roundRect(0, trackY, fillWidth, trackHeight, trackHeight / 2);
            this.fill.fill({ color: fillColor, alpha: disabled ? 0.5 : 1 });
        }
        
        // Thumb
        const thumbColor = disabled ? COLORS.textMuted : COLORS.primary;
        
        // Thumb glow
        if (!disabled) {
            this.thumb.circle(thumbX, height / 2, thumbRadius + 4);
            this.thumb.fill({ color: thumbColor, alpha: 0.2 });
        }
        
        // Thumb circle
        this.thumb.circle(thumbX, height / 2, thumbRadius);
        this.thumb.fill({ color: thumbColor });
        
        // Value text
        if (this.valueText) {
            this.valueText.text = this.options.formatValue(this._value);
            this.valueText.position.set(width + 15, height / 2);
            this.valueText.alpha = disabled ? 0.5 : 1;
        }
    }
    
    // Public API
    get value(): number {
        return this._value;
    }
    
    setValue(value: number): void {
        const { min, max, step } = this.options;
        const steppedValue = Math.round(value / step) * step;
        const clampedValue = Math.max(min, Math.min(max, steppedValue));
        
        if (clampedValue !== this._value) {
            this._value = clampedValue;
            this.draw();
        }
    }
    
    setDisabled(disabled: boolean): void {
        this.options.disabled = disabled;
        this.cursor = disabled ? 'default' : 'pointer';
        this.draw();
    }
}
