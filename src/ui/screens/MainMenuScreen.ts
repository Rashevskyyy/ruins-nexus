/**
 * MainMenuScreen - Beautiful animated main menu
 */

import * as PIXI from 'pixi.js';
import { Background } from '../effects/Background';
import { Button } from '../components/Button';
import { COLORS } from '../styles/colors';
import { TEXT_STYLES, createTextStyle, FONT_FAMILIES } from '../styles/fonts';
import { animator, tweenTo } from '../styles/animations';
import { GAME_VERSION } from '../../assets/AssetLoader';
import { 
    signInWithGoogle, 
    signOut, 
    getCurrentUser, 
    onAuthStateChange,
    isAuthConfigured,
    type UserProfile 
} from '../../auth/supabase';

export interface MainMenuCallbacks {
    onCreateRoom: () => void;
    onJoinRoom: (code?: string) => void;
    onHowToPlay: () => void;
}

export class MainMenuScreen extends PIXI.Container {
    private app: PIXI.Application;
    private background: Background;
    private contentContainer: PIXI.Container;
    
    // UI Elements
    private logo: PIXI.Container;
    private logoIcon: PIXI.Text | null = null;
    private menuButtons: PIXI.Container;
    private quickJoinContainer: PIXI.Container;
    private featuresRow: PIXI.Container;
    private userProfile: PIXI.Container;
    private onlineIndicator: PIXI.Container;
    private footerLinks: PIXI.Container;
    private versionText: PIXI.Text;
    
    // State
    private callbacks: MainMenuCallbacks;
    private currentUser: UserProfile | null = null;
    private authLoading = false;
    private onlineCount = 0;
    private quickJoinCode = '';
    private logoFloatPhase = 0;
    
    constructor(app: PIXI.Application, callbacks: MainMenuCallbacks) {
        super();
        
        this.app = app;
        this.callbacks = callbacks;
        
        // Initialize animation manager with app ticker
        animator.init(app.ticker);
        
        // Create background
        this.background = new Background(app.screen.width, app.screen.height);
        this.addChild(this.background);
        
        // Create content container
        this.contentContainer = new PIXI.Container();
        this.addChild(this.contentContainer);
        
        // Create UI elements
        this.logo = this.createLogo();
        this.menuButtons = this.createMenuButtons();
        this.quickJoinContainer = this.createQuickJoin();
        this.featuresRow = this.createFeaturesRow();
        this.userProfile = this.createUserProfile();
        this.onlineIndicator = this.createOnlineIndicator();
        this.footerLinks = this.createFooterLinks();
        this.versionText = this.createVersionText();
        
        // Add to content container
        this.contentContainer.addChild(this.logo);
        this.contentContainer.addChild(this.menuButtons);
        this.contentContainer.addChild(this.quickJoinContainer);
        this.contentContainer.addChild(this.featuresRow);
        this.contentContainer.addChild(this.userProfile);
        this.contentContainer.addChild(this.onlineIndicator);
        this.contentContainer.addChild(this.footerLinks);
        this.contentContainer.addChild(this.versionText);
        
        // Setup auth
        this.setupAuth();
        
        // Setup update loop
        app.ticker.add(this.update, this);
        
        // Initial layout
        this.layout();
    }
    
    private setupAuth(): void {
        if (!isAuthConfigured()) return;
        
        getCurrentUser().then(user => {
            this.currentUser = user;
            this.updateUserProfile();
        });
        
        onAuthStateChange((user) => {
            this.currentUser = user;
            this.authLoading = false;
            this.updateUserProfile();
        });
    }
    
    private createLogo(): PIXI.Container {
        const container = new PIXI.Container();
        
        // Icon (rocket emoji or could be a sprite)
        this.logoIcon = new PIXI.Text({
            text: '🚀',
            style: TEXT_STYLES.iconLarge,
        });
        this.logoIcon.anchor.set(0.5);
        
        // Title
        const title = new PIXI.Text({
            text: 'COSMIC FRONTIER',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.title,
                fontSize: 56,
                fontWeight: '900',
                fill: COLORS.primaryLight,
                letterSpacing: 4,
                dropShadow: {
                    color: COLORS.glowCyan,
                    blur: 15,
                    alpha: 0.8,
                    distance: 0,
                },
            }),
        });
        title.anchor.set(0.5);
        
        // Subtitle
        const subtitle = new PIXI.Text({
            text: 'MULTIPLAYER EXPEDITION',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.heading,
                fontSize: 18,
                fontWeight: '500',
                fill: COLORS.textMuted,
                letterSpacing: 6,
            }),
        });
        subtitle.anchor.set(0.5);
        
        // Position elements
        this.logoIcon.position.set(0, -60);
        title.position.set(0, 20);
        subtitle.position.set(0, 60);
        
        container.addChild(this.logoIcon);
        container.addChild(title);
        container.addChild(subtitle);
        
        return container;
    }
    
    private createMenuButtons(): PIXI.Container {
        const container = new PIXI.Container();
        
        const buttonWidth = 320;
        const buttonHeight = 56;
        const buttonGap = 16;
        
        // Create Room button (primary)
        const createRoomBtn = new Button({
            text: 'CREATE ROOM',
            icon: '🏠',
            style: 'primary',
            width: buttonWidth,
            height: buttonHeight,
            onClick: () => this.callbacks.onCreateRoom(),
        });
        
        // Join Room button (secondary)
        const joinRoomBtn = new Button({
            text: 'JOIN ROOM',
            icon: '🔗',
            style: 'secondary',
            width: buttonWidth,
            height: buttonHeight,
            onClick: () => this.callbacks.onJoinRoom(),
        });
        
        // How to Play button (tertiary)
        const howToPlayBtn = new Button({
            text: 'HOW TO PLAY',
            icon: '📖',
            style: 'tertiary',
            width: buttonWidth,
            height: buttonHeight,
            onClick: () => this.callbacks.onHowToPlay(),
        });
        
        // Position buttons
        createRoomBtn.position.set(0, 0);
        joinRoomBtn.position.set(0, buttonHeight + buttonGap);
        howToPlayBtn.position.set(0, (buttonHeight + buttonGap) * 2);
        
        container.addChild(createRoomBtn);
        container.addChild(joinRoomBtn);
        container.addChild(howToPlayBtn);
        
        return container;
    }
    
    private createQuickJoin(): PIXI.Container {
        const container = new PIXI.Container();
        
        // Input field
        const inputWidth = 200;
        const buttonSize = 52;
        const gap = 8;
        const totalWidth = inputWidth + gap + buttonSize;
        
        // Background for the group
        const bg = new PIXI.Graphics();
        bg.roundRect(-totalWidth / 2, 0, totalWidth, 52, 10);
        bg.fill({ color: 0x000000, alpha: 0.3 });
        bg.stroke({ color: COLORS.border, width: 1, alpha: 0.3 });
        container.addChild(bg);
        
        // Room code input simulation
        const inputBg = new PIXI.Graphics();
        inputBg.roundRect(-totalWidth / 2 + 4, 4, inputWidth - 8, 44, 8);
        inputBg.fill({ color: 0x000000, alpha: 0.2 });
        container.addChild(inputBg);
        
        const inputText = new PIXI.Text({
            text: 'ROOM CODE',
            style: createTextStyle('placeholder', { letterSpacing: 4, fontSize: 14 }),
        });
        inputText.anchor.set(0.5);
        inputText.position.set(-totalWidth / 2 + inputWidth / 2, 26);
        container.addChild(inputText);
        
        // Make input clickable
        const inputHit = new PIXI.Graphics();
        inputHit.rect(-totalWidth / 2, 0, inputWidth, 52);
        inputHit.fill({ color: 0xffffff, alpha: 0 });
        inputHit.eventMode = 'static';
        inputHit.cursor = 'text';
        inputHit.on('pointerdown', () => {
            const code = prompt('Enter room code:', this.quickJoinCode);
            if (code !== null) {
                this.quickJoinCode = code.toUpperCase().slice(0, 4);
                inputText.text = this.quickJoinCode || 'ROOM CODE';
                inputText.style.fill = this.quickJoinCode ? COLORS.textWhite : COLORS.textDark;
            }
        });
        container.addChild(inputHit);
        
        // Submit button
        const submitBtn = new PIXI.Graphics();
        submitBtn.roundRect(-totalWidth / 2 + inputWidth + gap, 0, buttonSize, 52, 10);
        submitBtn.fill({ color: COLORS.secondary });
        submitBtn.eventMode = 'static';
        submitBtn.cursor = 'pointer';
        
        const arrow = new PIXI.Text({
            text: '→',
            style: new PIXI.TextStyle({
                fontSize: 24,
                fill: COLORS.textWhite,
                fontWeight: '700',
            }),
        });
        arrow.anchor.set(0.5);
        arrow.position.set(-totalWidth / 2 + inputWidth + gap + buttonSize / 2, 26);
        
        submitBtn.on('pointerdown', () => {
            if (this.quickJoinCode.length === 4) {
                this.callbacks.onJoinRoom(this.quickJoinCode);
            }
        });
        submitBtn.on('pointerover', () => {
            submitBtn.clear();
            submitBtn.roundRect(-totalWidth / 2 + inputWidth + gap, 0, buttonSize, 52, 10);
            submitBtn.fill({ color: COLORS.secondaryLight });
        });
        submitBtn.on('pointerout', () => {
            submitBtn.clear();
            submitBtn.roundRect(-totalWidth / 2 + inputWidth + gap, 0, buttonSize, 52, 10);
            submitBtn.fill({ color: COLORS.secondary });
        });
        
        container.addChild(submitBtn);
        container.addChild(arrow);
        
        return container;
    }
    
    private createFeaturesRow(): PIXI.Container {
        const container = new PIXI.Container();
        
        const features = [
            { icon: '👥', text: '2-4 Players' },
            { icon: '⏱️', text: '30-60 min' },
            { icon: '🎲', text: 'Strategy' },
            { icon: '🌐', text: 'Online' },
        ];
        
        const gap = 120;
        const totalWidth = (features.length - 1) * gap;
        
        features.forEach((feature, index) => {
            const x = -totalWidth / 2 + index * gap;
            
            const icon = new PIXI.Text({
                text: feature.icon,
                style: new PIXI.TextStyle({ fontSize: 28 }),
            });
            icon.anchor.set(0.5);
            icon.position.set(x, 0);
            
            const text = new PIXI.Text({
                text: feature.text.toUpperCase(),
                style: TEXT_STYLES.feature,
            });
            text.anchor.set(0.5);
            text.position.set(x, 30);
            
            // Make interactive
            const hitArea = new PIXI.Graphics();
            hitArea.rect(x - 40, -20, 80, 70);
            hitArea.fill({ color: 0xffffff, alpha: 0 });
            hitArea.eventMode = 'static';
            hitArea.cursor = 'pointer';
            
            hitArea.on('pointerover', () => {
                icon.alpha = 1;
                text.alpha = 1;
            });
            hitArea.on('pointerout', () => {
                icon.alpha = 0.8;
                text.alpha = 0.6;
            });
            
            icon.alpha = 0.8;
            text.alpha = 0.6;
            
            container.addChild(hitArea);
            container.addChild(icon);
            container.addChild(text);
        });
        
        return container;
    }
    
    private createUserProfile(): PIXI.Container {
        const container = new PIXI.Container();
        container.name = 'userProfile';
        return container;
    }
    
    private updateUserProfile(): void {
        this.userProfile.removeChildren();
        
        if (!isAuthConfigured()) {
            // Guest mode label
            const guestLabel = new PIXI.Text({
                text: '👤 Guest Mode',
                style: createTextStyle('bodySmall', { fill: COLORS.textMuted }),
            });
            guestLabel.anchor.set(1, 0);
            this.userProfile.addChild(guestLabel);
            return;
        }
        
        if (this.authLoading) {
            const loading = new PIXI.Text({
                text: '⏳ Loading...',
                style: createTextStyle('bodySmall', { fill: COLORS.textLight }),
            });
            loading.anchor.set(1, 0);
            this.userProfile.addChild(loading);
            return;
        }
        
        if (this.currentUser) {
            // User profile card
            const cardWidth = 200;
            const cardHeight = 70;
            
            const bg = new PIXI.Graphics();
            bg.roundRect(-cardWidth, 0, cardWidth, cardHeight, 30);
            bg.fill({ color: 0xffffff, alpha: 0.05 });
            bg.stroke({ color: COLORS.border, width: 1, alpha: 0.3 });
            this.userProfile.addChild(bg);
            
            // Avatar
            const avatar = new PIXI.Graphics();
            avatar.circle(-cardWidth + 28, cardHeight / 2, 18);
            avatar.fill({ color: COLORS.primary });
            this.userProfile.addChild(avatar);
            
            const avatarLetter = new PIXI.Text({
                text: this.currentUser.display_name.charAt(0).toUpperCase(),
                style: new PIXI.TextStyle({
                    fontSize: 16,
                    fill: COLORS.textWhite,
                    fontWeight: '700',
                }),
            });
            avatarLetter.anchor.set(0.5);
            avatarLetter.position.set(-cardWidth + 28, cardHeight / 2);
            this.userProfile.addChild(avatarLetter);
            
            // Name
            const displayName = this.currentUser.display_name.length > 15
                ? this.currentUser.display_name.slice(0, 15) + '...'
                : this.currentUser.display_name;
            
            const name = new PIXI.Text({
                text: displayName,
                style: createTextStyle('body', { fontSize: 14 }),
            });
            name.position.set(-cardWidth + 54, 18);
            this.userProfile.addChild(name);
            
            // Stats
            const stats = new PIXI.Text({
                text: `🎮 ${this.currentUser.total_games}  🏆 ${this.currentUser.wins}`,
                style: createTextStyle('bodySmall', { fontSize: 11, fill: COLORS.textMuted }),
            });
            stats.position.set(-cardWidth + 54, 40);
            this.userProfile.addChild(stats);
            
            // Exit button
            const exitBtn = new PIXI.Graphics();
            exitBtn.roundRect(-50, 20, 40, 28, 6);
            exitBtn.stroke({ color: COLORS.error, width: 1, alpha: 0.3 });
            exitBtn.eventMode = 'static';
            exitBtn.cursor = 'pointer';
            
            const exitText = new PIXI.Text({
                text: 'Exit',
                style: createTextStyle('bodySmall', { fontSize: 11, fill: COLORS.error }),
            });
            exitText.anchor.set(0.5);
            exitText.position.set(-30, 34);
            
            exitBtn.on('pointerdown', async () => {
                await signOut();
                this.currentUser = null;
                this.updateUserProfile();
            });
            exitBtn.on('pointerover', () => {
                exitBtn.clear();
                exitBtn.roundRect(-50, 20, 40, 28, 6);
                exitBtn.fill({ color: COLORS.error, alpha: 0.1 });
                exitBtn.stroke({ color: COLORS.error, width: 1, alpha: 0.5 });
            });
            exitBtn.on('pointerout', () => {
                exitBtn.clear();
                exitBtn.roundRect(-50, 20, 40, 28, 6);
                exitBtn.stroke({ color: COLORS.error, width: 1, alpha: 0.3 });
            });
            
            this.userProfile.addChild(exitBtn);
            this.userProfile.addChild(exitText);
        } else {
            // Sign in button
            const signInBtn = new Button({
                text: 'Sign in',
                icon: '🔐',
                style: 'ghost',
                width: 150,
                height: 40,
                fontSize: 14,
                onClick: async () => {
                    this.authLoading = true;
                    this.updateUserProfile();
                    await signInWithGoogle();
                },
            });
            signInBtn.position.set(-75, 30);
            this.userProfile.addChild(signInBtn);
        }
    }
    
    private createOnlineIndicator(): PIXI.Container {
        const container = new PIXI.Container();
        
        // Background pill
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 120, 32, 16);
        bg.fill({ color: 0x000000, alpha: 0.3 });
        container.addChild(bg);
        
        // Pulsing dot
        const dot = new PIXI.Graphics();
        dot.circle(16, 16, 4);
        dot.fill({ color: COLORS.success });
        container.addChild(dot);
        
        // Text
        const text = new PIXI.Text({
            text: `${this.onlineCount} online`,
            style: createTextStyle('bodySmall', { fontSize: 12, fill: COLORS.textMuted }),
        });
        text.anchor.set(0, 0.5);
        text.position.set(28, 16);
        container.addChild(text);
        
        // Store references for updates
        (container as any).dot = dot;
        (container as any).text = text;
        
        return container;
    }
    
    updateOnlineCount(count: number): void {
        this.onlineCount = count;
        const text = (this.onlineIndicator as any).text as PIXI.Text;
        if (text) {
            text.text = `${count} online`;
        }
    }
    
    private createFooterLinks(): PIXI.Container {
        const container = new PIXI.Container();
        
        const links = ['Discord', 'Changelog', 'Report Bug'];
        const gap = 80;
        const totalWidth = (links.length - 1) * gap;
        
        links.forEach((linkText, index) => {
            const x = -totalWidth / 2 + index * gap;
            
            const link = new PIXI.Text({
                text: linkText,
                style: createTextStyle('bodySmall', { 
                    fontSize: 12, 
                    fill: COLORS.textMuted,
                }),
            });
            link.anchor.set(0.5);
            link.position.set(x, 0);
            link.eventMode = 'static';
            link.cursor = 'pointer';
            
            link.on('pointerover', () => {
                link.style.fill = COLORS.textLight;
            });
            link.on('pointerout', () => {
                link.style.fill = COLORS.textMuted;
            });
            
            container.addChild(link);
        });
        
        return container;
    }
    
    private createVersionText(): PIXI.Text {
        const version = new PIXI.Text({
            text: GAME_VERSION,
            style: TEXT_STYLES.version,
        });
        return version;
    }
    
    private update(ticker: PIXI.Ticker): void {
        const deltaMs = ticker.deltaMS;
        
        // Update background animations
        this.background.update(deltaMs);
        
        // Animate logo icon floating
        this.logoFloatPhase += deltaMs * 0.001;
        if (this.logoIcon) {
            this.logoIcon.y = -60 + Math.sin(this.logoFloatPhase) * 8;
        }
        
        // Pulse online indicator dot
        const dot = (this.onlineIndicator as any).dot as PIXI.Graphics;
        if (dot) {
            dot.alpha = 0.7 + Math.sin(this.logoFloatPhase * 2) * 0.3;
        }
    }
    
    layout(): void {
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        
        // Resize background
        this.background.resize(w, h);
        
        // Position elements
        this.logo.position.set(w / 2, h * 0.22);
        this.menuButtons.position.set(w / 2, h * 0.48);
        this.quickJoinContainer.position.set(w / 2, h * 0.75);
        this.featuresRow.position.set(w / 2, h * 0.85);
        
        // User profile (top right)
        this.userProfile.position.set(w - 20, 15);
        
        // Online indicator (bottom left)
        this.onlineIndicator.position.set(20, h - 50);
        
        // Footer links (bottom center)
        this.footerLinks.position.set(w / 2, h - 30);
        
        // Version (top left)
        this.versionText.position.set(20, 15);
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
    
    destroy(): void {
        this.app.ticker.remove(this.update, this);
        super.destroy({ children: true });
    }
}
