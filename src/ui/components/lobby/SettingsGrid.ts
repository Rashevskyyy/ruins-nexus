/**
 * SettingsGrid - 3x2 grid display for game settings
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';

export interface GameSetting {
    icon: string;
    label: string;
    value: string;
}

export interface SettingsGridOptions {
    width: number;
    settings: GameSetting[];
}

export class SettingsGrid extends PIXI.Container {
    private settingItems: PIXI.Container[] = [];
    private options: SettingsGridOptions;

    constructor(options: SettingsGridOptions) {
        super();

        this.options = {
            width: options.width,
            settings: options.settings,
        };

        this.renderSettings();
    }

    private renderSettings(): void {
        // Clear existing items
        this.removeChildren();
        this.settingItems = [];

        const { width, settings } = this.options;

        // 3 columns, 2 rows
        const columns = 3;
        const columnWidth = width / columns;
        const rowHeight = 60;
        const padding = 12;

        settings.forEach((setting, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            const item = this.createSettingItem(setting, columnWidth - padding);
            item.position.set(col * columnWidth + padding / 2, row * rowHeight);
            this.addChild(item);
            this.settingItems.push(item);
        });
    }

    private createSettingItem(setting: GameSetting, itemWidth: number): PIXI.Container {
        const container = new PIXI.Container();

        // Background with subtle border
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, itemWidth, 50, 10);
        bg.fill({ color: 0x000000, alpha: 0.25 });
        bg.roundRect(0, 0, itemWidth, 50, 10);
        bg.stroke({ color: 0xffffff, width: 1, alpha: 0.05 });
        container.addChild(bg);

        // Interactive hover effect
        container.eventMode = 'static';
        container.cursor = 'default';

        container.on('pointerover', () => {
            bg.clear();
            bg.roundRect(0, 0, itemWidth, 50, 10);
            bg.fill({ color: 0x00aaff, alpha: 0.08 });
            bg.roundRect(0, 0, itemWidth, 50, 10);
            bg.stroke({ color: 0x00aaff, width: 1, alpha: 0.2 });
        });

        container.on('pointerout', () => {
            bg.clear();
            bg.roundRect(0, 0, itemWidth, 50, 10);
            bg.fill({ color: 0x000000, alpha: 0.25 });
            bg.roundRect(0, 0, itemWidth, 50, 10);
            bg.stroke({ color: 0xffffff, width: 1, alpha: 0.05 });
        });

        // Icon
        const icon = new PIXI.Text({
            text: setting.icon,
            style: { fontSize: 20 },
        });
        icon.position.set(12, 6);
        container.addChild(icon);

        // Label
        const label = new PIXI.Text({
            text: setting.label.toUpperCase(),
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 9,
                fontWeight: '600',
                fill: 0x5a6a7a,
                letterSpacing: 1,
            }),
        });
        label.position.set(40, 10);
        container.addChild(label);

        // Value
        const value = new PIXI.Text({
            text: setting.value,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 15,
                fontWeight: '700',
                fill: 0xffffff,
            }),
        });
        value.position.set(40, 26);
        container.addChild(value);

        return container;
    }

    updateSettings(settings: GameSetting[]): void {
        this.options.settings = settings;
        this.renderSettings();
    }

    getHeight(): number {
        const rows = Math.ceil(this.options.settings.length / 3);
        return rows * 60;
    }
}
