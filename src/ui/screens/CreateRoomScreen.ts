/**
 * CreateRoomScreen - Room creation form with options
 */

import * as PIXI from 'pixi.js';
import { Background } from '../effects/Background';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { SelectionCard } from '../components/SelectionCard';
import { ToggleOption } from '../components/ToggleOption';
import { FormLabel } from '../components/FormLabel';
import { InfoTip } from '../components/InfoTip';
import { COLORS } from '../styles/colors';
import { TEXT_STYLES, createTextStyle, FONT_FAMILIES } from '../styles/fonts';
import { animator, tweenTo } from '../styles/animations';
import { GAME_VERSION } from '../../assets/AssetLoader';

export interface CreateRoomOptions {
    playerName: string;
    playerCount: number;
    gameMode: 'classic' | 'quick' | 'coop';
    randomStart: boolean;
    allowSpectators: boolean;
    privateRoom: boolean;
    turnTimer: boolean;
    mapSize: number;
    turnTimerSeconds: number;
    difficulty: 'easy' | 'normal' | 'hard';
}

export interface CreateRoomCallbacks {
    onBack: () => void;
    onCreate: (options: CreateRoomOptions) => void;
}

export class CreateRoomScreen extends PIXI.Container {
    private app: PIXI.Application;
    private background: Background;
    private contentContainer: PIXI.Container;
    private card: Card;
    private scrollContainer: PIXI.Container;
    
    // Form state
    private options: CreateRoomOptions = {
        playerName: '',
        playerCount: 4,
        gameMode: 'classic',
        randomStart: true,
        allowSpectators: false,
        privateRoom: false,
        turnTimer: true,
        mapSize: 37,
        turnTimerSeconds: 60,
        difficulty: 'normal',
    };
    
    // UI References for updates
    private playerCountCards: SelectionCard[] = [];
    private gameModeCards: SelectionCard[] = [];
    
    private callbacks: CreateRoomCallbacks;
    
    constructor(app: PIXI.Application, callbacks: CreateRoomCallbacks, initialName: string = '') {
        super();
        
        this.app = app;
        this.callbacks = callbacks;
        this.options.playerName = initialName;
        
        // Initialize animation manager
        animator.init(app.ticker);
        
        // Create background
        this.background = new Background(app.screen.width, app.screen.height);
        this.addChild(this.background);
        
        // Create content container
        this.contentContainer = new PIXI.Container();
        this.addChild(this.contentContainer);
        
        // Create header
        this.createHeader();
        
        // Calculate card dimensions - taller to fit all content
        const cardWidth = Math.min(600, app.screen.width - 60);
        const cardHeight = Math.min(800, app.screen.height - 140);
        
        // Create main card
        this.card = new Card({
            width: cardWidth,
            height: cardHeight,
            padding: 30,
            borderColor: COLORS.primary,
            glowAlpha: 0.15,
        });
        this.contentContainer.addChild(this.card);
        
        // Create scroll container for form content
        this.scrollContainer = new PIXI.Container();
        this.card.addContent(this.scrollContainer);
        
        // Build form
        this.buildForm();
        
        // Setup update loop
        app.ticker.add(this.update, this);
        
        // Initial layout
        this.layout();
    }
    
    private createHeader(): void {
        // Logo (smaller version)
        const logoContainer = new PIXI.Container();
        
        const icon = new PIXI.Text({
            text: '🚀',
            style: new PIXI.TextStyle({ fontSize: 36 }),
        });
        icon.anchor.set(0.5);
        icon.position.set(0, 0);
        
        const title = new PIXI.Text({
            text: 'COSMIC FRONTIER',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.title,
                fontSize: 28,
                fontWeight: '700',
                fill: COLORS.primaryLight,
                letterSpacing: 2,
                dropShadow: {
                    color: COLORS.glowCyan,
                    blur: 10,
                    alpha: 0.6,
                    distance: 0,
                },
            }),
        });
        title.anchor.set(0.5);
        title.position.set(0, 35);
        
        const subtitle = new PIXI.Text({
            text: `Multiplayer Expedition • ${GAME_VERSION}`,
            style: createTextStyle('bodySmall', { fill: COLORS.textMuted, fontSize: 12 }),
        });
        subtitle.anchor.set(0.5);
        subtitle.position.set(0, 60);
        
        logoContainer.addChild(icon);
        logoContainer.addChild(title);
        logoContainer.addChild(subtitle);
        logoContainer.name = 'header';
        
        this.contentContainer.addChild(logoContainer);
    }
    
    private buildForm(): void {
        let yOffset = 0;
        const contentWidth = this.card.contentWidth;
        const gap = 30;
        
        // Card title
        const cardTitle = new PIXI.Text({
            text: 'Create New Room',
            style: TEXT_STYLES.h1,
        });
        cardTitle.anchor.set(0.5, 0);
        cardTitle.position.set(contentWidth / 2, yOffset);
        this.scrollContainer.addChild(cardTitle);
        yOffset += 50;
        
        // YOUR NAME section
        const nameLabel = new FormLabel('Your Name');
        nameLabel.position.set(0, yOffset);
        this.scrollContainer.addChild(nameLabel);
        yOffset += 25;
        
        const nameInput = new TextInput({
            placeholder: 'Enter your name',
            value: this.options.playerName,
            width: contentWidth,
            height: 48,
            maxLength: 30,
            onChange: (value) => { this.options.playerName = value; },
        });
        nameInput.position.set(0, yOffset);
        this.scrollContainer.addChild(nameInput);
        yOffset += 48 + gap;
        
        // NUMBER OF PLAYERS section
        const playersLabel = new FormLabel('Number of Players');
        playersLabel.position.set(0, yOffset);
        this.scrollContainer.addChild(playersLabel);
        yOffset += 25;
        
        const playerCountContainer = new PIXI.Container();
        playerCountContainer.position.set(0, yOffset);
        
        const playerOptions = [2, 3, 4];
        const cardWidth = (contentWidth - (playerOptions.length - 1) * 12) / playerOptions.length;
        
        playerOptions.forEach((count, index) => {
            const card = new SelectionCard({
                title: count.toString(),
                subtitle: 'Players',
                width: cardWidth,
                height: 70,
                selected: this.options.playerCount === count,
                onSelect: () => this.selectPlayerCount(count),
            });
            card.position.set(index * (cardWidth + 12), 0);
            playerCountContainer.addChild(card);
            this.playerCountCards.push(card);
        });
        
        this.scrollContainer.addChild(playerCountContainer);
        yOffset += 70 + gap;
        
        // GAME MODE section
        const modeLabel = new FormLabel('Game Mode');
        modeLabel.position.set(0, yOffset);
        this.scrollContainer.addChild(modeLabel);
        yOffset += 25;
        
        const gameModeContainer = new PIXI.Container();
        gameModeContainer.position.set(0, yOffset);
        
        const gameModes = [
            { id: 'classic', icon: '⚔️', title: 'Classic', subtitle: 'Standard' },
            { id: 'quick', icon: '⚡', title: 'Quick', subtitle: 'Faster' },
            { id: 'coop', icon: '🤝', title: 'Co-op', subtitle: 'Team vs AI' },
        ];
        
        gameModes.forEach((mode, index) => {
            const card = new SelectionCard({
                icon: mode.icon,
                title: mode.title,
                subtitle: mode.subtitle,
                width: cardWidth,
                height: 85,
                selected: this.options.gameMode === mode.id,
                onSelect: () => this.selectGameMode(mode.id as CreateRoomOptions['gameMode']),
            });
            card.position.set(index * (cardWidth + 12), 0);
            gameModeContainer.addChild(card);
            this.gameModeCards.push(card);
        });
        
        this.scrollContainer.addChild(gameModeContainer);
        yOffset += 85 + gap;
        
        // OPTIONS section
        const optionsLabel = new FormLabel('Options');
        optionsLabel.position.set(0, yOffset);
        this.scrollContainer.addChild(optionsLabel);
        yOffset += 25;
        
        const optionsContainer = new PIXI.Container();
        optionsContainer.position.set(0, yOffset);
        
        const toggleWidth = (contentWidth - 12) / 2;
        
        const randomStartToggle = new ToggleOption({
            icon: '🎲',
            label: 'Random Start',
            active: this.options.randomStart,
            width: toggleWidth,
            onChange: (active) => { this.options.randomStart = active; },
        });
        randomStartToggle.position.set(0, 0);
        
        const spectatorsToggle = new ToggleOption({
            icon: '👁️',
            label: 'Spectators',
            active: this.options.allowSpectators,
            width: toggleWidth,
            onChange: (active) => { this.options.allowSpectators = active; },
        });
        spectatorsToggle.position.set(toggleWidth + 12, 0);
        
        const privateToggle = new ToggleOption({
            icon: '🔒',
            label: 'Private Room',
            active: this.options.privateRoom,
            width: toggleWidth,
            onChange: (active) => { this.options.privateRoom = active; },
        });
        privateToggle.position.set(0, 56);
        
        const timerToggle = new ToggleOption({
            icon: '⏰',
            label: 'Turn Timer',
            active: this.options.turnTimer,
            width: toggleWidth,
            onChange: (active) => { this.options.turnTimer = active; },
        });
        timerToggle.position.set(toggleWidth + 12, 56);
        
        optionsContainer.addChild(randomStartToggle);
        optionsContainer.addChild(spectatorsToggle);
        optionsContainer.addChild(privateToggle);
        optionsContainer.addChild(timerToggle);
        
        this.scrollContainer.addChild(optionsContainer);
        yOffset += 112 + gap;
        
        // BUTTONS
        const buttonsContainer = new PIXI.Container();
        buttonsContainer.position.set(0, yOffset);
        
        const backBtn = new Button({
            text: 'BACK',
            style: 'ghost',
            width: 120,
            height: 48,
            onClick: () => this.callbacks.onBack(),
        });
        backBtn.position.set(60, 24);
        
        const createBtn = new Button({
            text: 'CREATE ROOM',
            style: 'primary',
            width: 200,
            height: 48,
            onClick: () => this.handleCreate(),
        });
        createBtn.position.set(contentWidth - 100, 24);
        
        buttonsContainer.addChild(backBtn);
        buttonsContainer.addChild(createBtn);
        this.scrollContainer.addChild(buttonsContainer);
        yOffset += 60 + gap;
        
        // INFO TIP
        const infoTip = new InfoTip({
            icon: '💡',
            text: 'Share the room code with friends to invite them',
            width: contentWidth,
        });
        infoTip.position.set(0, yOffset);
        this.scrollContainer.addChild(infoTip);
    }
    
    private selectPlayerCount(count: number): void {
        this.options.playerCount = count;
        this.playerCountCards.forEach((card, index) => {
            card.setSelected([2, 3, 4][index] === count);
        });
    }
    
    private selectGameMode(mode: CreateRoomOptions['gameMode']): void {
        this.options.gameMode = mode;
        const modes = ['classic', 'quick', 'coop'];
        this.gameModeCards.forEach((card, index) => {
            card.setSelected(modes[index] === mode);
        });
    }
    
    private handleCreate(): void {
        if (!this.options.playerName.trim()) {
            // Show error - in a real implementation
            alert('Please enter your name');
            return;
        }
        
        this.callbacks.onCreate(this.options);
    }
    
    private update(ticker: PIXI.Ticker): void {
        const deltaMs = ticker.deltaMS;
        this.background.update(deltaMs);
    }
    
    layout(): void {
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        
        // Resize background
        this.background.resize(w, h);
        
        // Position header
        const header = this.contentContainer.getChildByName('header');
        if (header) {
            header.position.set(w / 2, 35);
        }
        
        // Position card in center - taller to fit all content
        const cardWidth = Math.min(600, w - 60);
        const cardHeight = Math.min(800, h - 100);
        this.card.resize(cardWidth, cardHeight);
        this.card.position.set((w - cardWidth) / 2, 120);
    }
    
    show(): void {
        this.visible = true;
        this.layout();
        
        // Animate in
        this.contentContainer.alpha = 0;
        this.contentContainer.y = 30;
        tweenTo(this.contentContainer, { alpha: 1, y: 0 }, 500);
    }
    
    hide(): void {
        this.visible = false;
    }
    
    setPlayerName(name: string): void {
        this.options.playerName = name;
    }
    
    destroy(): void {
        this.app.ticker.remove(this.update, this);
        super.destroy({ children: true });
    }
}
