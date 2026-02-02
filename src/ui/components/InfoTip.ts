/**
 * InfoTip - Information tip/hint component
 */

import * as PIXI from 'pixi.js';
import { COLORS } from '../styles/colors';
import { createTextStyle } from '../styles/fonts';

export interface InfoTipOptions {
    icon?: string;
    text: string;
    width?: number;
    variant?: 'info' | 'warning' | 'success';
}

export class InfoTip extends PIXI.Container {
    private background: PIXI.Graphics;
    private iconText: PIXI.Text | null = null;
    private messageText: PIXI.Text;
    
    constructor(options: InfoTipOptions) {
        super();
        
        const width = options.width ?? 400;
        const icon = options.icon ?? '💡';
        const variant = options.variant ?? 'info';
        
        // Determine colors based on variant
        let bgColor: number;
        let borderColor: number;
        let textColor: number;
        
        switch (variant) {
            case 'warning':
                bgColor = COLORS.warning;
                borderColor = COLORS.warning;
                textColor = COLORS.warning;
                break;
            case 'success':
                bgColor = COLORS.secondary;
                borderColor = COLORS.secondary;
                textColor = COLORS.secondary;
                break;
            case 'info':
            default:
                bgColor = COLORS.primary;
                borderColor = COLORS.primary;
                textColor = 0x77aaaa;
                break;
        }
        
        // Create components
        this.background = new PIXI.Graphics();
        
        this.iconText = new PIXI.Text({
            text: icon,
            style: new PIXI.TextStyle({ fontSize: 18 }),
        });
        this.iconText.anchor.set(0, 0.5);
        
        this.messageText = new PIXI.Text({
            text: options.text,
            style: createTextStyle('info', {
                fill: textColor,
                wordWrap: true,
                wordWrapWidth: width - 50,
            }),
        });
        this.messageText.anchor.set(0, 0.5);
        
        // Calculate height based on text
        const padding = 12;
        const height = Math.max(44, this.messageText.height + padding * 2);
        
        // Draw background
        this.background.roundRect(0, 0, width, height, 10);
        this.background.fill({ color: bgColor, alpha: 0.1 });
        this.background.roundRect(0, 0, width, height, 10);
        this.background.stroke({ color: borderColor, width: 1, alpha: 0.2 });
        
        // Position elements
        this.iconText.position.set(padding, height / 2);
        this.messageText.position.set(padding + 26, height / 2);
        
        // Add children
        this.addChild(this.background);
        this.addChild(this.iconText);
        this.addChild(this.messageText);
    }
    
    setText(text: string): void {
        this.messageText.text = text;
    }
}
