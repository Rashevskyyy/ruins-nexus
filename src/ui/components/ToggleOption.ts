/**
 * ToggleOption - Option row with label, icon and toggle switch
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { createTextStyle } from '../styles/fonts';
import { ToggleSwitch } from './ToggleSwitch';

export interface ToggleOptionOptions {
    icon?: string;
    label: string;
    active?: boolean;
    width?: number;
    disabled?: boolean;
    onChange?: (active: boolean) => void;
}

export class ToggleOption extends PIXI.Container {
    private background: PIXI.Graphics;
    private iconText: PIXI.Text | null = null;
    private labelText: PIXI.Text;
    private toggle: ToggleSwitch;
    
    constructor(options: ToggleOptionOptions) {
        super();
        
        const width = options.width ?? 220;
        const height = 48;
        const padding = 14;
        
        // Create background
        this.background = new PIXI.Graphics();
        this.background.roundRect(0, 0, width, height, 10);
        this.background.fill({ color: 0x000000, alpha: 0.2 });
        this.background.roundRect(0, 0, width, height, 10);
        this.background.stroke({ color: COLORS.border, width: 1, alpha: 0.3 });
        
        // Create icon if provided
        if (options.icon) {
            this.iconText = new PIXI.Text({
                text: options.icon,
                style: new PIXI.TextStyle({ fontSize: 18 }),
            });
            this.iconText.anchor.set(0, 0.5);
            this.iconText.position.set(padding, height / 2);
        }
        
        // Create label
        this.labelText = new PIXI.Text({
            text: options.label,
            style: createTextStyle('body', { fontSize: 14 }),
        });
        this.labelText.anchor.set(0, 0.5);
        this.labelText.position.set(options.icon ? padding + 28 : padding, height / 2);
        
        // Create toggle
        this.toggle = new ToggleSwitch({
            active: options.active,
            disabled: options.disabled,
            onChange: options.onChange,
        });
        this.toggle.position.set(width - 44 - padding, (height - 24) / 2);
        
        // Add children
        this.addChild(this.background);
        if (this.iconText) this.addChild(this.iconText);
        this.addChild(this.labelText);
        this.addChild(this.toggle);
        
        // Make entire row clickable
        this.eventMode = 'static';
        this.cursor = options.disabled ? 'default' : 'pointer';
        this.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        this.on('pointerdown', () => {
            if (!options.disabled) {
                this.toggle.toggle();
            }
        });
    }
    
    get active(): boolean {
        return this.toggle.active;
    }
    
    setActive(active: boolean): void {
        this.toggle.setActive(active);
    }
}
