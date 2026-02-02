/**
 * GameLobbyScreen - Multiplayer game lobby with 3-column layout
 *
 * Layout:
 * - Left (400px): Race Selection with carousel
 * - Center (flexible): Game Settings + Chat
 * - Right (320px): Room Code + Players List
 * - Bottom: Action bar with Ready/Start/Leave buttons
 */

import * as PIXI from 'pixi.js';
import { Background } from '../effects/Background';
import { TEXT_STYLES } from '../styles/fonts';
import { animator, tweenTo } from '../styles/animations';
import {
    LobbyCard,
    RaceCarousel,
    SettingsGrid,
    ChatBox,
    RoomCodeDisplay,
    PlayerSlot,
    LobbyActionButton,
    WaitingIndicator,
    type PlayerSlotData,
    type GameSetting,
} from '../components/lobby';
import { type RaceId, type RaceOption, RACES } from '../../entities/Race';

// Layout constants - matching mockup proportions (max 1400px width)
const LAYOUT = {
    maxWidth: 1400,
    leftColumnWidth: 380, // Race selection
    rightColumnWidth: 300, // Room code + Players
    columnGap: 20,
    padding: 30,
    headerHeight: 70,
    bottomBarHeight: 90,
};

export interface GameLobbyPlayer {
    id: string;
    name: string;
    colorIndex: number;
    raceId?: RaceId;
    raceOption?: RaceOption;
    isHost: boolean;
    isReady: boolean;
}

export interface GameLobbyCallbacks {
    onRaceSelect: (raceId: RaceId, option: RaceOption) => void;
    onReady: (isReady: boolean) => void;
    onStart: () => void;
    onLeave: () => void;
    onSendMessage: (text: string) => void;
}

export interface GameLobbyState {
    roomCode: string;
    players: GameLobbyPlayer[];
    myPlayerId: string;
    isHost: boolean;
    settings: GameSetting[];
}

export class GameLobbyScreen extends PIXI.Container {
    private app: PIXI.Application;
    private background: Background;
    private contentContainer: PIXI.Container;

    // Header
    private logoContainer: PIXI.Container;
    private logoIcon: PIXI.Text | null = null;

    // Left column - Race Selection
    private leftColumn: PIXI.Container;
    private raceSelectionCard: LobbyCard | null = null;
    private raceCarousel: RaceCarousel | null = null;

    // Center column - Settings & Chat
    private centerColumn: PIXI.Container;
    private settingsCard: LobbyCard | null = null;
    private settingsGrid: SettingsGrid | null = null;
    private chatCard: LobbyCard | null = null;
    private chatBox: ChatBox | null = null;

    // Right column - Room & Players
    private rightColumn: PIXI.Container;
    private roomCodeCard: LobbyCard | null = null;
    private roomCodeDisplay: RoomCodeDisplay | null = null;
    private playersCard: LobbyCard | null = null;
    private playerSlots: PlayerSlot[] = [];

    // Bottom bar
    private bottomBar: PIXI.Container;
    private waitingIndicator: WaitingIndicator | null = null;
    private readyButton: LobbyActionButton | null = null;
    private startButton: LobbyActionButton | null = null;
    private leaveButton: LobbyActionButton | null = null;

    // State
    private callbacks: GameLobbyCallbacks;
    private state: GameLobbyState;
    private selectedOption: RaceOption = 'A';
    private isReady = false;
    private logoFloatPhase = 0;

    constructor(app: PIXI.Application, callbacks: GameLobbyCallbacks, initialState: GameLobbyState) {
        super();

        this.app = app;
        this.callbacks = callbacks;
        this.state = initialState;

        // Initialize animation manager
        animator.init(app.ticker);

        // Create background
        this.background = new Background(app.screen.width, app.screen.height);
        this.addChild(this.background);

        // Create content container
        this.contentContainer = new PIXI.Container();
        this.addChild(this.contentContainer);

        // Create layout columns
        this.logoContainer = new PIXI.Container();
        this.leftColumn = new PIXI.Container();
        this.centerColumn = new PIXI.Container();
        this.rightColumn = new PIXI.Container();
        this.bottomBar = new PIXI.Container();

        this.contentContainer.addChild(this.logoContainer);
        this.contentContainer.addChild(this.leftColumn);
        this.contentContainer.addChild(this.centerColumn);
        this.contentContainer.addChild(this.rightColumn);
        this.contentContainer.addChild(this.bottomBar);

        // Build UI
        this.createHeader();
        this.createLeftColumn();
        this.createCenterColumn();
        this.createRightColumn();
        this.createBottomBar();

        // Setup update loop
        app.ticker.add(this.update, this);

        // Initial layout
        this.layout();
    }

    private createHeader(): void {
        // Main title
        const titleText = new PIXI.Text({
            text: 'COSMIC FRONTIER',
            style: TEXT_STYLES.gameTitle,
        });
        titleText.anchor.set(0.5, 1);
        titleText.position.set(0, 0);
        this.logoContainer.addChild(titleText);

        // Subtitle
        const subtitleText = new PIXI.Text({
            text: 'MULTIPLAYER EXPEDITION • v0.4',
            style: TEXT_STYLES.subtitle,
        });
        subtitleText.anchor.set(0.5, 0);
        subtitleText.position.set(0, 8);
        this.logoContainer.addChild(subtitleText);

        // Logo icon (rocket) - positioned to the left of title
        this.logoIcon = new PIXI.Text({
            text: '🚀',
            style: { fontSize: 42 },
        });
        this.logoIcon.anchor.set(0.5);
        this.logoIcon.position.set(-titleText.width / 2 - 40, -15);
        this.logoContainer.addChild(this.logoIcon);
    }

    private createLeftColumn(): void {
        // Race Selection Card - height will be set in layout
        this.raceSelectionCard = new LobbyCard({
            width: LAYOUT.leftColumnWidth,
            height: 725, // Initial height, will be adjusted
            headerIcon: '🎭',
            headerTitle: 'SELECT RACE',
        });
        this.leftColumn.addChild(this.raceSelectionCard);

        // Race Carousel - portrait height adjusted to fit
        this.raceCarousel = new RaceCarousel({
            width: LAYOUT.leftColumnWidth - 32,
            portraitHeight: 380, // Smaller portrait to fit everything
            onRaceSelect: (raceId, option) => {
                this.selectedOption = option;
                this.callbacks.onRaceSelect(raceId, option);
            },
            onRandomSelect: () => {
                // Random selection
            },
        });
        this.raceCarousel.position.set(16, 5);
        this.raceSelectionCard.body.addChild(this.raceCarousel);
    }

    private createCenterColumn(): void {
        // Settings Card
        this.settingsCard = new LobbyCard({
            width: 0, // Will be calculated in layout
            height: 180,
            headerIcon: '⚙️',
            headerTitle: 'GAME SETTINGS',
        });
        this.centerColumn.addChild(this.settingsCard);

        // Settings Grid
        this.settingsGrid = new SettingsGrid({
            width: 0, // Will be set in layout
            settings: this.state.settings,
        });
        this.settingsGrid.position.set(16, 10);
        this.settingsCard.body.addChild(this.settingsGrid);

        // Chat Card
        this.chatCard = new LobbyCard({
            width: 0, // Will be calculated in layout
            height: 0, // Will be calculated in layout
            headerIcon: '💬',
            headerTitle: 'CHAT',
        });
        this.centerColumn.addChild(this.chatCard);

        // Chat Box
        this.chatBox = new ChatBox({
            width: 0, // Will be set in layout
            height: 0, // Will be set in layout
            onSendMessage: (text) => {
                this.callbacks.onSendMessage(text);
            },
        });
        this.chatCard.body.addChild(this.chatBox);
    }

    private createRightColumn(): void {
        // Room Code Card - green neon border
        this.roomCodeCard = new LobbyCard({
            width: LAYOUT.rightColumnWidth,
            height: 130,
            borderColor: 0x00ff88, // Green neon border
            borderGlow: true,
        });
        this.rightColumn.addChild(this.roomCodeCard);

        // Room Code Display
        this.roomCodeDisplay = new RoomCodeDisplay({
            code: this.state.roomCode,
        });
        this.roomCodeDisplay.position.set(LAYOUT.rightColumnWidth / 2, 15);
        this.roomCodeCard.body.addChild(this.roomCodeDisplay);

        // Players Card
        this.playersCard = new LobbyCard({
            width: LAYOUT.rightColumnWidth,
            height: 575,
            headerIcon: '👥',
            headerTitle: 'PLAYERS',
            headerRight: `${this.state.players.length}/4`,
            borderColor: 0x00aaff, // Cyan neon border
        });
        this.playersCard.position.set(0, 150);
        this.rightColumn.addChild(this.playersCard);

        // Player Slots
        this.createPlayerSlots();
    }

    private createPlayerSlots(): void {
        // Clear existing slots
        this.playerSlots.forEach(slot => slot.destroy());
        this.playerSlots = [];

        const slotWidth = LAYOUT.rightColumnWidth - 32;
        const slotHeight = 52;
        const slotGap = 8;

        // Create 4 slots (filled or empty)
        for (let i = 0; i < 4; i++) {
            const player = this.state.players[i];
            const slotData: PlayerSlotData | null = player
                ? {
                      id: player.id,
                      name: player.name,
                      colorIndex: player.colorIndex,
                      race: player.raceId ? RACES[player.raceId]?.name : undefined,
                      raceIcon: player.raceId ? RACES[player.raceId]?.emoji : undefined,
                      isHost: player.isHost,
                      isReady: player.isReady,
                      isYou: player.id === this.state.myPlayerId,
                  }
                : null;

            const slot = new PlayerSlot({
                data: slotData,
                width: slotWidth,
                height: slotHeight,
            });
            slot.position.set(16, i * (slotHeight + slotGap) + 8);
            this.playersCard!.body.addChild(slot);
            this.playerSlots.push(slot);
        }
    }

    private createBottomBar(): void {
        // Waiting Indicator
        this.waitingIndicator = new WaitingIndicator({
            message: 'Waiting for players...',
        });
        this.bottomBar.addChild(this.waitingIndicator);

        // Ready Button
        this.readyButton = new LobbyActionButton({
            icon: '✓',
            label: 'READY',
            style: 'ready',
            width: 160,
            height: 52,
            onClick: () => {
                this.isReady = !this.isReady;
                this.updateReadyButton();
                this.callbacks.onReady(this.isReady);
            },
        });
        this.bottomBar.addChild(this.readyButton);

        // Start Button
        this.startButton = new LobbyActionButton({
            icon: '🚀',
            label: 'START',
            style: 'primary',
            width: 160,
            height: 52,
            disabled: true,
            onClick: () => {
                this.callbacks.onStart();
            },
        });
        this.bottomBar.addChild(this.startButton);

        // Leave Button
        this.leaveButton = new LobbyActionButton({
            icon: '←',
            label: 'LEAVE',
            style: 'danger',
            width: 120,
            height: 52,
            onClick: () => {
                this.callbacks.onLeave();
            },
        });
        this.bottomBar.addChild(this.leaveButton);

        this.updateBottomBar();
    }

    private updateReadyButton(): void {
        if (this.readyButton) {
            if (this.isReady) {
                this.readyButton.setIcon('✗');
                this.readyButton.setLabel('NOT READY');
            } else {
                this.readyButton.setIcon('✓');
                this.readyButton.setLabel('READY');
            }
        }
    }

    private updateBottomBar(): void {
        // Check if all players are ready
        const allReady = this.state.players.length >= 2 && this.state.players.every(p => p.isReady || p.isHost);
        const allRacesSelected = this.state.players.every(p => p.raceId);

        // Update start button state
        if (this.startButton) {
            this.startButton.setDisabled(!allReady || !allRacesSelected);
        }

        // Show/hide waiting indicator
        if (this.waitingIndicator) {
            this.waitingIndicator.visible = !allReady;
            if (!allReady) {
                const waitingCount = this.state.players.filter(p => !p.isReady && !p.isHost).length;
                this.waitingIndicator.setMessage(
                    waitingCount > 0 ? `Waiting for ${waitingCount} player(s)...` : 'Waiting for players...'
                );
            }
        }

        // Show ready button only for non-hosts
        if (this.readyButton) {
            this.readyButton.visible = !this.state.isHost;
        }

        // Show start button only for host
        if (this.startButton) {
            this.startButton.visible = this.state.isHost;
        }
    }

    private update(ticker: PIXI.Ticker): void {
        const deltaMs = ticker.deltaMS;

        // Update background
        this.background.update(deltaMs);

        // Animate logo floating
        this.logoFloatPhase += deltaMs * 0.001;
        if (this.logoIcon) {
            this.logoIcon.y = Math.sin(this.logoFloatPhase) * 8;
        }

        // Update waiting indicator animation
        if (this.waitingIndicator && this.waitingIndicator.visible) {
            this.waitingIndicator.update(deltaMs);
        }
    }

    layout(): void {
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        // Resize background
        this.background.resize(w, h);

        // Calculate layout width (constrained to maxWidth)
        const layoutWidth = Math.min(w, LAYOUT.maxWidth);
        const layoutOffset = (w - layoutWidth) / 2;

        // Calculate center column width
        const centerWidth = layoutWidth - LAYOUT.leftColumnWidth - LAYOUT.rightColumnWidth - LAYOUT.columnGap * 2 - LAYOUT.padding * 2;

        // Header - centered title
        this.logoContainer.position.set(w / 2, LAYOUT.padding + 30);

        // Content area
        const contentTop = LAYOUT.headerHeight + LAYOUT.padding;
        const contentHeight = h - contentTop - LAYOUT.bottomBarHeight - LAYOUT.padding;

        // Left column
        this.leftColumn.position.set(layoutOffset + LAYOUT.padding, contentTop);

        // Center column
        const centerX = layoutOffset + LAYOUT.padding + LAYOUT.leftColumnWidth + LAYOUT.columnGap;
        this.centerColumn.position.set(centerX, contentTop);

        // Update center column card widths
        if (this.settingsCard) {
            // Recreate settings card with correct width
            this.centerColumn.removeChild(this.settingsCard);
            this.settingsCard = new LobbyCard({
                width: centerWidth,
                height: 180,
                headerIcon: '⚙️',
                headerTitle: 'GAME SETTINGS',
            });
            this.centerColumn.addChild(this.settingsCard);

            // Recreate settings grid
            if (this.settingsGrid) {
                this.settingsGrid.destroy();
            }
            this.settingsGrid = new SettingsGrid({
                width: centerWidth - 32,
                settings: this.state.settings,
            });
            this.settingsGrid.position.set(16, 10);
            this.settingsCard.body.addChild(this.settingsGrid);
        }

        if (this.chatCard) {
            // Calculate chat card height
            const chatHeight = contentHeight - 180 - LAYOUT.columnGap;

            this.centerColumn.removeChild(this.chatCard);
            this.chatCard = new LobbyCard({
                width: centerWidth,
                height: chatHeight,
                headerIcon: '💬',
                headerTitle: 'CHAT',
            });
            this.chatCard.position.set(0, 180 + LAYOUT.columnGap);
            this.centerColumn.addChild(this.chatCard);

            // Recreate chat box
            if (this.chatBox) {
                this.chatBox.destroy();
            }
            this.chatBox = new ChatBox({
                width: centerWidth - 24,
                height: chatHeight - 60,
                onSendMessage: (text) => {
                    this.callbacks.onSendMessage(text);
                },
            });
            this.chatBox.position.set(12, 0);
            this.chatCard.body.addChild(this.chatBox);
        }

        // Right column
        const rightX = layoutOffset + layoutWidth - LAYOUT.padding - LAYOUT.rightColumnWidth;
        this.rightColumn.position.set(rightX, contentTop);


        // Bottom bar
        const barY = h - LAYOUT.bottomBarHeight + 20;
        this.bottomBar.position.set(0, barY);

        // Position bottom bar items centered
        const barCenterX = w / 2;
        let buttonX = barCenterX - 240;

        if (this.waitingIndicator) {
            this.waitingIndicator.position.set(buttonX - 120, 0);
        }

        if (this.readyButton) {
            this.readyButton.position.set(buttonX, 0);
            buttonX += 180;
        }

        if (this.startButton) {
            this.startButton.position.set(buttonX, 0);
            buttonX += 180;
        }

        if (this.leaveButton) {
            this.leaveButton.position.set(buttonX, 0);
        }
    }

    // Public methods for updating state

    updateState(state: Partial<GameLobbyState>): void {
        this.state = { ...this.state, ...state };

        if (state.roomCode !== undefined && this.roomCodeDisplay) {
            this.roomCodeDisplay.setCode(state.roomCode);
        }

        if (state.players !== undefined) {
            this.createPlayerSlots();
            if (this.playersCard) {
                this.playersCard.setHeaderRight(`${this.state.players.length}/4`);
            }
        }

        this.updateBottomBar();
    }

    addChatMessage(playerName: string, playerColorIndex: number, text: string): void {
        this.chatBox?.addPlayerMessage(playerName, playerColorIndex, text);
    }

    addSystemMessage(text: string): void {
        this.chatBox?.addSystemMessage(text);
    }

    setSelectedRace(raceId: RaceId, option?: RaceOption): void {
        this.raceCarousel?.setSelectedRace(raceId);
        if (option) {
            this.selectedOption = option;
            this.raceCarousel?.setSelectedOption(option);
        }
    }

    getSelectedOption(): RaceOption {
        return this.selectedOption;
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
