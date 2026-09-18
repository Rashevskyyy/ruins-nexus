/**
 * RaceCarousel - Race selection carousel with portrait, arrows, and dots
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';
import { COLORS } from '../../styles/colors';
import { tweenTo } from '../../styles/animations';
import { CarouselArrow } from './CarouselArrow';
import { AssetLoader } from '../../../assets/AssetLoader';
import { RACE_LIST, type RaceId, type Race, type RaceOption } from '../../../entities/Race';

export interface RaceCarouselOptions {
    width: number;
    portraitHeight?: number;
    onRaceSelect?: (raceId: RaceId, option: RaceOption) => void;
    onRandomSelect?: () => void;
}

export class RaceCarousel extends PIXI.Container {
    private portraitContainer!: PIXI.Container;
    private portraitMask!: PIXI.Graphics;
    private portraitBorder!: PIXI.Graphics;
    private portraitSprite: PIXI.Sprite | null = null;
    private leftArrow!: CarouselArrow;
    private rightArrow!: CarouselArrow;
    private raceNameText!: PIXI.Text;
    private raceNameBg!: PIXI.Graphics;
    private taglineText!: PIXI.Text;
    private passiveBadge!: PIXI.Container;
    private dotsContainer!: PIXI.Container;
    private optionContainer!: PIXI.Container;
    private optionButtonA!: PIXI.Container;
    private optionButtonB!: PIXI.Container;
    private randomButton!: PIXI.Container;

    private options: Required<RaceCarouselOptions>;
    private currentIndex = 0;
    private selectedRaceId: RaceId | null = null;
    private selectedOption: RaceOption = 'A';

    constructor(options: RaceCarouselOptions) {
        super();

        this.options = {
            width: options.width,
            portraitHeight: options.portraitHeight ?? 400,
            onRaceSelect: options.onRaceSelect ?? (() => {}),
            onRandomSelect: options.onRandomSelect ?? (() => {}),
        };

        this.createPortrait();
        this.createArrows();
        this.createNameOverlay();
        this.createDots();
        this.createOptionButtons();
        this.createRandomButton();

        this.updateDisplay();
    }

    private createPortrait(): void {
        const { width, portraitHeight } = this.options;

        // Portrait container for masking
        this.portraitContainer = new PIXI.Container();
        this.portraitContainer.position.set((width - 300) / 2, 0);
        this.addChild(this.portraitContainer);

        // Border glow
        this.portraitBorder = new PIXI.Graphics();
        this.portraitBorder.roundRect(-4, -4, 308, portraitHeight + 8, 16);
        this.portraitBorder.fill({ color: COLORS.primary, alpha: 0.2 });
        this.portraitBorder.roundRect(0, 0, 300, portraitHeight, 12);
        this.portraitBorder.stroke({ color: COLORS.primary, width: 2, alpha: 0.5 });
        this.portraitContainer.addChild(this.portraitBorder);

        // Portrait mask
        this.portraitMask = new PIXI.Graphics();
        this.portraitMask.roundRect(0, 0, 300, portraitHeight, 12);
        this.portraitMask.fill({ color: 0xffffff });
        this.portraitContainer.addChild(this.portraitMask);

        // Dark background for portrait
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 300, portraitHeight, 12);
        bg.fill({ color: 0x0f172a });
        bg.mask = this.portraitMask;
        this.portraitContainer.addChild(bg);

        // Make portrait clickable
        this.portraitBorder.eventMode = 'static';
        this.portraitBorder.cursor = 'pointer';
        this.portraitBorder.hitArea = new PIXI.Rectangle(0, 0, 300, portraitHeight);

        this.portraitBorder.on('pointerdown', () => {
            this.selectCurrentRace();
        });

        this.portraitBorder.on('pointerover', () => {
            this.portraitBorder.clear();
            this.portraitBorder.roundRect(-4, -4, 308, portraitHeight + 8, 16);
            this.portraitBorder.fill({ color: COLORS.primary, alpha: 0.3 });
            this.portraitBorder.roundRect(0, 0, 300, portraitHeight, 12);
            this.portraitBorder.stroke({ color: COLORS.primaryLight, width: 2, alpha: 0.8 });
        });

        this.portraitBorder.on('pointerout', () => {
            this.portraitBorder.clear();
            this.portraitBorder.roundRect(-4, -4, 308, portraitHeight + 8, 16);
            this.portraitBorder.fill({ color: COLORS.primary, alpha: 0.2 });
            this.portraitBorder.roundRect(0, 0, 300, portraitHeight, 12);
            this.portraitBorder.stroke({ color: COLORS.primary, width: 2, alpha: 0.5 });
        });
    }

    private createArrows(): void {
        const { width, portraitHeight } = this.options;
        const portraitX = (width - 300) / 2;

        // Left arrow - positioned to the left of portrait
        this.leftArrow = new CarouselArrow({
            direction: 'left',
            size: 40,
            onClick: () => this.navigate(-1),
        });
        this.leftArrow.position.set(portraitX - 25, portraitHeight / 2 - 20);
        this.addChild(this.leftArrow);

        // Right arrow - positioned to the right of portrait
        this.rightArrow = new CarouselArrow({
            direction: 'right',
            size: 40,
            onClick: () => this.navigate(1),
        });
        this.rightArrow.position.set(portraitX + 275 + 10, portraitHeight / 2 - 20);
        this.addChild(this.rightArrow);
    }

    private createNameOverlay(): void {
        const { width, portraitHeight } = this.options;
        const portraitX = (width - 300) / 2;

        // Name background gradient at bottom of portrait
        this.raceNameBg = new PIXI.Graphics();
        // Create a gradient-like effect with multiple fills
        for (let i = 0; i < 5; i++) {
            const alpha = i * 0.15;
            this.raceNameBg.rect(0, portraitHeight - 60 + i * 12, 300, 12);
            this.raceNameBg.fill({ color: 0x000000, alpha });
        }
        this.raceNameBg.rect(0, portraitHeight - 60, 300, 60);
        this.raceNameBg.fill({ color: 0x000000, alpha: 0.7 });
        this.raceNameBg.position.set(portraitX, 0);
        this.raceNameBg.mask = this.portraitMask;
        this.addChild(this.raceNameBg);

        // Race name
        this.raceNameText = new PIXI.Text({
            text: '',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.title,
                fontSize: 24,
                fontWeight: '900',
                fill: 0x00ddff,
            }),
        });
        this.raceNameText.anchor.set(0.5, 0);
        this.raceNameText.position.set(portraitX + 150, portraitHeight - 45);
        this.addChild(this.raceNameText);

        // Tagline text below portrait
        this.taglineText = new PIXI.Text({
            text: '',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.body,
                fontSize: 13,
                fill: 0x9ca3af,
            }),
        });
        this.taglineText.anchor.set(0.5, 0);
        this.taglineText.position.set(width / 2, portraitHeight + 15);
        this.addChild(this.taglineText);

        // Passive ability badge
        this.passiveBadge = this.createPassiveBadge();
        this.passiveBadge.position.set(width / 2, portraitHeight + 60);
        this.addChild(this.passiveBadge);
    }

    private createPassiveBadge(): PIXI.Container {
        const container = new PIXI.Container();

        const bg = new PIXI.Graphics();
        container.addChild(bg);

        const text = new PIXI.Text({
            text: '',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 11,
                fontWeight: '600',
                fill: 0x00ff88,
            }),
        });
        text.anchor.set(0.5, 0.5);
        text.name = 'text';
        container.addChild(text);

        return container;
    }

    private updatePassiveBadge(passiveText: string): void {
        const text = this.passiveBadge.getChildByName('text') as PIXI.Text;
        if (text) {
            text.text = `Passive: ${passiveText}`;
            text.position.set(0, 0);

            // Redraw background to fit text
            const bg = this.passiveBadge.getChildAt(0) as PIXI.Graphics;
            const padding = 16;
            const width = text.width + padding * 2;
            const height = 32;

            bg.clear();
            bg.roundRect(-width / 2, -height / 2, width, height, 12);
            bg.fill({ color: 0x00ff88, alpha: 0.15 });
            bg.roundRect(-width / 2, -height / 2, width, height, 12);
            bg.stroke({ color: 0x00ff88, width: 1, alpha: 0.3 });
        }
    }

    private createDots(): void {
        const { width, portraitHeight } = this.options;

        this.dotsContainer = new PIXI.Container();
        this.dotsContainer.position.set(width / 2, portraitHeight + 100);
        this.addChild(this.dotsContainer);
    }

    private createOptionButtons(): void {
        const { width, portraitHeight } = this.options;

        this.optionContainer = new PIXI.Container();
        this.optionContainer.position.set(width / 2, portraitHeight + 130);
        this.addChild(this.optionContainer);

        // Option A button
        this.optionButtonA = this.createOptionButton('A', -85);
        this.optionContainer.addChild(this.optionButtonA);

        // Option B button
        this.optionButtonB = this.createOptionButton('B', 85);
        this.optionContainer.addChild(this.optionButtonB);

        // Update visual state
        this.updateOptionButtons();
    }

    private createOptionButton(option: 'A' | 'B', xOffset: number): PIXI.Container {
        const button = new PIXI.Container();
        button.position.set(xOffset, 25);

        const buttonWidth = 155;
        const buttonHeight = 65;

        // Background
        const bg = new PIXI.Graphics();
        bg.name = 'bg';
        button.addChild(bg);

        // Option label (A or B)
        const optionLabel = new PIXI.Text({
            text: `OPTION ${option}`,
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 11,
                fontWeight: '700',
                fill: option === 'A' ? 0x00ff88 : 0x00aaff,
                letterSpacing: 1,
            }),
        });
        optionLabel.anchor.set(0.5, 0);
        optionLabel.position.set(0, -buttonHeight / 2 + 8);
        optionLabel.name = 'label';
        button.addChild(optionLabel);

        // Ability name (will be updated)
        const nameText = new PIXI.Text({
            text: '',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 13,
                fontWeight: '700',
                fill: 0xffffff,
            }),
        });
        nameText.anchor.set(0.5, 0);
        nameText.position.set(0, -buttonHeight / 2 + 22);
        nameText.name = 'name';
        button.addChild(nameText);

        // Description (will be updated)
        const descText = new PIXI.Text({
            text: '',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.body,
                fontSize: 10,
                fill: 0x888888,
                wordWrap: true,
                wordWrapWidth: buttonWidth - 16,
                align: 'center',
            }),
        });
        descText.anchor.set(0.5, 0);
        descText.position.set(0, -buttonHeight / 2 + 38);
        descText.name = 'desc';
        button.addChild(descText);

        // Interaction
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.hitArea = new PIXI.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);

        button.on('pointerdown', () => {
            this.selectedOption = option;
            this.updateOptionButtons();
            this.selectCurrentRace();
        });

        button.on('pointerover', () => {
            if (this.selectedOption !== option) {
                this.drawOptionButtonBg(bg, buttonWidth, buttonHeight, option, false, true);
            }
        });

        button.on('pointerout', () => {
            this.drawOptionButtonBg(bg, buttonWidth, buttonHeight, option, this.selectedOption === option, false);
        });

        // Initial draw
        this.drawOptionButtonBg(bg, buttonWidth, buttonHeight, option, false, false);

        return button;
    }

    private drawOptionButtonBg(
        bg: PIXI.Graphics,
        width: number,
        height: number,
        option: 'A' | 'B',
        isSelected: boolean,
        isHover: boolean
    ): void {
        const color = option === 'A' ? 0x00ff88 : 0x00aaff;
        bg.clear();

        if (isSelected) {
            bg.roundRect(-width / 2, -height / 2, width, height, 8);
            bg.fill({ color, alpha: 0.2 });
            bg.roundRect(-width / 2, -height / 2, width, height, 8);
            bg.stroke({ color, width: 2, alpha: 0.8 });
        } else if (isHover) {
            bg.roundRect(-width / 2, -height / 2, width, height, 8);
            bg.fill({ color: 0x333344, alpha: 0.8 });
            bg.roundRect(-width / 2, -height / 2, width, height, 8);
            bg.stroke({ color, width: 1, alpha: 0.5 });
        } else {
            bg.roundRect(-width / 2, -height / 2, width, height, 8);
            bg.fill({ color: 0x222233, alpha: 0.6 });
            bg.roundRect(-width / 2, -height / 2, width, height, 8);
            bg.stroke({ color: 0x444455, width: 1, alpha: 0.5 });
        }
    }

    private updateOptionButtons(): void {
        const race = RACE_LIST[this.currentIndex];
        const buttonWidth = 155;
        const buttonHeight = 65;

        // Update Option A
        const nameA = this.optionButtonA.getChildByName('name') as PIXI.Text;
        const descA = this.optionButtonA.getChildByName('desc') as PIXI.Text;
        const bgA = this.optionButtonA.getChildByName('bg') as PIXI.Graphics;
        if (nameA) nameA.text = race.optionA.name;
        if (descA) descA.text = race.optionA.description;
        this.drawOptionButtonBg(bgA, buttonWidth, buttonHeight, 'A', this.selectedOption === 'A', false);

        // Update Option B
        const nameB = this.optionButtonB.getChildByName('name') as PIXI.Text;
        const descB = this.optionButtonB.getChildByName('desc') as PIXI.Text;
        const bgB = this.optionButtonB.getChildByName('bg') as PIXI.Graphics;
        if (nameB) nameB.text = race.optionB.name;
        if (descB) descB.text = race.optionB.description;
        this.drawOptionButtonBg(bgB, buttonWidth, buttonHeight, 'B', this.selectedOption === 'B', false);
    }

    private updateDots(): void {
        this.dotsContainer.removeChildren();

        const totalRaces = RACE_LIST.length;
        const dotSize = 8;
        const dotGap = 16;
        const totalWidth = totalRaces * dotSize + (totalRaces - 1) * (dotGap - dotSize);
        let x = -totalWidth / 2;

        for (let i = 0; i < totalRaces; i++) {
            const dot = new PIXI.Graphics();
            const isActive = i === this.currentIndex;

            if (isActive) {
                dot.circle(0, 0, dotSize / 2);
                dot.fill({ color: 0x00ddff });
            } else {
                dot.circle(0, 0, dotSize / 2);
                dot.fill({ color: 0x444444 });
            }

            dot.position.set(x + dotSize / 2, 0);
            this.dotsContainer.addChild(dot);

            // Make dots clickable
            dot.eventMode = 'static';
            dot.cursor = 'pointer';
            dot.hitArea = new PIXI.Circle(0, 0, dotSize);
            const index = i;
            dot.on('pointerdown', () => {
                this.goToIndex(index);
            });

            x += dotGap;
        }
    }

    private createRandomButton(): void {
        const { width, portraitHeight } = this.options;

        this.randomButton = new PIXI.Container();
        this.randomButton.position.set((width - 200) / 2, portraitHeight + 215);

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 200, 40, 10);
        bg.fill({ color: 0x4a4a6a });
        this.randomButton.addChild(bg);

        const icon = new PIXI.Text({
            text: '🎲',
            style: { fontSize: 18 },
        });
        icon.position.set(50, 10);
        this.randomButton.addChild(icon);

        const text = new PIXI.Text({
            text: 'RANDOM',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 14,
                fontWeight: '700',
                fill: 0xffffff,
                letterSpacing: 2,
            }),
        });
        text.position.set(80, 11);
        this.randomButton.addChild(text);

        this.randomButton.eventMode = 'static';
        this.randomButton.cursor = 'pointer';
        this.randomButton.hitArea = new PIXI.Rectangle(0, 0, 200, 40);

        this.randomButton.on('pointerover', () => {
            bg.clear();
            bg.roundRect(0, 0, 200, 40, 10);
            bg.fill({ color: 0x5a5a7a });
        });

        this.randomButton.on('pointerout', () => {
            bg.clear();
            bg.roundRect(0, 0, 200, 40, 10);
            bg.fill({ color: 0x4a4a6a });
        });

        this.randomButton.on('pointerdown', () => {
            this.selectRandom();
        });

        this.addChild(this.randomButton);
    }

    private updateDisplay(): void {
        const race = RACE_LIST[this.currentIndex];
        this.updatePortraitSprite(race);
        this.raceNameText.text = `${race.emoji} ${race.name}`;
        this.taglineText.text = race.description;
        this.updatePassiveBadge(race.passiveDescription);
        this.updateDots();
        this.updateOptionButtons();
    }

    private updatePortraitSprite(race: Race): void {
        // Remove old sprite
        if (this.portraitSprite) {
            this.portraitContainer.removeChild(this.portraitSprite);
            this.portraitSprite = null;
        }

        const texture = AssetLoader.getTexture(`hero-${race.id}`);
        if (texture) {
            // Hero settings for different races
            const heroSettings: Record<string, { scale: number; anchorY: number }> = {
                bioform: { scale: 0.7, anchorY: 0.3 },
                chrono: { scale: 1, anchorY: 0.25 },
                forge: { scale: 0.9, anchorY: 0.24 },
                nomad: { scale: 0.55, anchorY: 0.35 },
                void: { scale: 0.5, anchorY: 0.4 },
                warbound: { scale: 0.7, anchorY: 0.3 },
            };

            const settings = heroSettings[race.id] || { scale: 1.0, anchorY: 0.35 };

            this.portraitSprite = new PIXI.Sprite(texture);
            const baseScale = Math.max(400 / texture.width, this.options.portraitHeight / texture.height);
            this.portraitSprite.scale.set(baseScale * settings.scale);
            this.portraitSprite.anchor.set(0.5, settings.anchorY);
            this.portraitSprite.position.set(150, this.options.portraitHeight / 2);
            this.portraitSprite.mask = this.portraitMask;
            this.portraitContainer.addChild(this.portraitSprite);
        } else {
            // Placeholder text if texture not loaded
            const placeholder = new PIXI.Text({
                text: race.emoji,
                style: { fontSize: 100 },
            });
            placeholder.anchor.set(0.5);
            placeholder.position.set(150, this.options.portraitHeight / 2);
            this.portraitContainer.addChild(placeholder);
        }
    }

    navigate(direction: number): void {
        this.currentIndex = (this.currentIndex + direction + RACE_LIST.length) % RACE_LIST.length;
        this.updateDisplay();
    }

    goToIndex(index: number): void {
        this.currentIndex = Math.max(0, Math.min(index, RACE_LIST.length - 1));
        this.updateDisplay();
    }

    private selectCurrentRace(): void {
        const race = RACE_LIST[this.currentIndex];
        this.selectedRaceId = race.id;
        this.options.onRaceSelect(race.id, this.selectedOption);

        // Visual feedback
        tweenTo(this.portraitBorder, { scaleX: 0.98, scaleY: 0.98 }, 100);
        setTimeout(() => {
            tweenTo(this.portraitBorder, { scaleX: 1, scaleY: 1 }, 100);
        }, 100);
    }

    private selectRandom(): void {
        const randomIndex = Math.floor(Math.random() * RACE_LIST.length);
        this.currentIndex = randomIndex;
        this.updateDisplay();
        this.selectCurrentRace();
        this.options.onRandomSelect();
    }

    setSelectedRace(raceId: RaceId): void {
        this.selectedRaceId = raceId;
        const index = RACE_LIST.findIndex(r => r.id === raceId);
        if (index >= 0) {
            this.currentIndex = index;
            this.updateDisplay();
        }
    }

    getSelectedRaceId(): RaceId | null {
        return this.selectedRaceId;
    }

    getCurrentRace(): Race {
        return RACE_LIST[this.currentIndex];
    }

    getSelectedOption(): RaceOption {
        return this.selectedOption;
    }

    setSelectedOption(option: RaceOption): void {
        this.selectedOption = option;
        this.updateOptionButtons();
    }

    getHeight(): number {
        return this.options.portraitHeight + 210;
    }
}
