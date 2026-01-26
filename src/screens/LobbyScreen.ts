/**
 * LobbyScreen - Multiplayer lobby UI
 * 
 * - Create room
 * - Join room by code
 * - See players in room
 * - Start game (admin only)
 * - Google Auth (optional)
 */

import * as PIXI from "pixi.js";
import { socketClient, type LobbyPlayer } from "../network/SocketClient";
import { 
    signInWithGoogle, 
    signOut, 
    getCurrentUser, 
    onAuthStateChange,
    isAuthConfigured,
    type UserProfile 
} from "../auth/supabase";
import { GAME_VERSION } from "../assets/AssetLoader";
import { RACE_LIST, type RaceId } from "../entities/Race";

type LobbyState = "menu" | "creating" | "joining" | "in-lobby";

export class LobbyScreen {
    private container = new PIXI.Container();
    private state: LobbyState = "menu";
    private playerName = "";
    private joinCode = "";
    private players: LobbyPlayer[] = [];
    private errorMessage = "";
    
    // Auth state
    private currentUser: UserProfile | null = null;
    private authLoading = false;
    
    // Race selection (v0.4)
    private selectedRace: RaceId | null = null;

    // Callbacks - now includes initialState for server-authoritative
    public onGameStart: ((playerCount: number, myPlayerId: string, initialState?: any) => void) | null = null;
    public onRequestStart: (() => void) | null = null; // Admin wants to start

    constructor(private app: PIXI.Application) {
        this.setupSocketCallbacks();
        this.setupAuthCallbacks();
    }
    
    private setupAuthCallbacks(): void {
        if (!isAuthConfigured()) return;
        
        // Check for existing session
        getCurrentUser().then(user => {
            this.currentUser = user;
            if (user) {
                this.playerName = user.display_name;
            }
            this.render();
        });
        
        // Listen to auth changes
        onAuthStateChange((user) => {
            this.currentUser = user;
            this.authLoading = false;
            if (user) {
                this.playerName = user.display_name;
            }
            this.render();
        });
    }

    private setupSocketCallbacks(): void {
        socketClient.onPlayersUpdate = (players) => {
            this.players = players;
            if (this.state === "in-lobby") {
                this.render();
            }
        };

        socketClient.onGameStart = (data) => {
            console.log("[Lobby] Game starting!", data);
            this.hide();
            // Pass initialState from server
            this.onGameStart?.(data.playerCount, socketClient.playerId!, data.initialState);
        };

        socketClient.onStateChange = () => {
            if (this.container.parent) {
                this.render();
            }
        };
    }

    show(): void {
        // Clear all other elements from stage (game renderer, etc.)
        this.app.stage.removeChildren();
        this.app.stage.addChild(this.container);
        this.state = "menu";
        this.render();
    }

    /**
     * Show lobby directly (for reconnect)
     */
    showLobby(players: LobbyPlayer[]): void {
        // Clear all other elements from stage
        this.app.stage.removeChildren();
        this.app.stage.addChild(this.container);
        this.players = players;
        this.state = "in-lobby";
        this.render();
    }

    hide(): void {
        this.container.removeFromParent();
    }

    private render(): void {
        this.container.removeChildren();

        const w = this.app.renderer.width;
        const h = this.app.renderer.height;

        // Background
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x0a0a1a });
        this.container.addChild(bg);

        // Title
        const title = new PIXI.Text({
            text: "🚀 COSMIC FRONTIER",
            style: new PIXI.TextStyle({
                fontSize: 48,
                fill: 0x00ffff,
                fontWeight: "700",
                dropShadow: {
                    color: 0x00ffff,
                    blur: 10,
                    distance: 0,
                },
            }),
        });
        title.anchor.set(0.5);
        title.position.set(w / 2, 80);
        this.container.addChild(title);

        // Subtitle with version
        const subtitle = new PIXI.Text({
            text: `Multiplayer Expedition  •  ${GAME_VERSION}`,
            style: new PIXI.TextStyle({
                fontSize: 20,
                fill: 0x888888,
            }),
        });
        subtitle.anchor.set(0.5);
        subtitle.position.set(w / 2, 130);
        this.container.addChild(subtitle);

        // Render based on state
        switch (this.state) {
            case "menu":
                this.renderMenu(w, h);
                break;
            case "creating":
            case "joining":
                this.renderInputForm(w, h);
                break;
            case "in-lobby":
                this.renderLobby(w, h);
                break;
        }

        // Error message
        if (this.errorMessage) {
            const error = new PIXI.Text({
                text: this.errorMessage,
                style: new PIXI.TextStyle({
                    fontSize: 16,
                    fill: 0xff4444,
                }),
            });
            error.anchor.set(0.5);
            error.position.set(w / 2, h - 50);
            this.container.addChild(error);
        }
    }

    private renderMenu(w: number, h: number): void {
        const centerY = h / 2;
        
        // User profile section (top right)
        this.renderUserSection(w);

        // Create Room button
        this.createButton(
            "🏠 CREATE ROOM",
            w / 2,
            centerY - 40,
            200,
            50,
            0x2563eb,
            () => {
                this.state = "creating";
                this.render();
            }
        );

        // Join Room button
        this.createButton(
            "🔗 JOIN ROOM",
            w / 2,
            centerY + 40,
            200,
            50,
            0x059669,
            () => {
                this.state = "joining";
                this.render();
            }
        );
    }
    
    private renderUserSection(w: number): void {
        const authEnabled = isAuthConfigured();
        
        if (!authEnabled) {
            // Show "Guest Mode" label
            const guestLabel = new PIXI.Text({
                text: "👤 Guest Mode",
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0x888888,
                }),
            });
            guestLabel.position.set(w - 120, 20);
            this.container.addChild(guestLabel);
            return;
        }
        
        if (this.authLoading) {
            const loadingText = new PIXI.Text({
                text: "⏳ Loading...",
                style: new PIXI.TextStyle({
                    fontSize: 14,
                    fill: 0xaaaaaa,
                }),
            });
            loadingText.position.set(w - 120, 20);
            this.container.addChild(loadingText);
            return;
        }
        
        if (this.currentUser) {
            // User profile card - wider to fit name
            const cardWidth = 280;
            const cardX = w - cardWidth - 15;
            
            const cardBg = new PIXI.Graphics();
            cardBg.roundRect(cardX, 15, cardWidth, 70, 10);
            cardBg.fill({ color: 0x1e293b, alpha: 0.9 });
            cardBg.stroke({ color: 0x3b82f6, width: 1 });
            this.container.addChild(cardBg);
            
            // Avatar placeholder
            const avatar = new PIXI.Graphics();
            avatar.circle(cardX + 30, 50, 22);
            avatar.fill({ color: 0x3b82f6 });
            this.container.addChild(avatar);
            
            const avatarText = new PIXI.Text({
                text: this.currentUser.display_name.charAt(0).toUpperCase(),
                style: new PIXI.TextStyle({
                    fontSize: 18,
                    fill: 0xffffff,
                    fontWeight: "700",
                }),
            });
            avatarText.anchor.set(0.5);
            avatarText.position.set(cardX + 30, 50);
            this.container.addChild(avatarText);
            
            // User name - truncate if too long
            const maxNameLength = 20;
            const displayName = this.currentUser.display_name.length > maxNameLength
                ? this.currentUser.display_name.slice(0, maxNameLength) + "..."
                : this.currentUser.display_name;
            
            const userName = new PIXI.Text({
                text: displayName,
                style: new PIXI.TextStyle({
                    fontSize: 13,
                    fill: 0xffffff,
                    fontWeight: "600",
                }),
            });
            userName.position.set(cardX + 60, 28);
            this.container.addChild(userName);
            
            // Stats
            const stats = new PIXI.Text({
                text: `🎮 ${this.currentUser.total_games}  🏆 ${this.currentUser.wins}`,
                style: new PIXI.TextStyle({
                    fontSize: 11,
                    fill: 0x94a3b8,
                }),
            });
            stats.position.set(cardX + 60, 50);
            this.container.addChild(stats);
            
            // Sign out button
            this.createSmallButton(
                "Exit",
                cardX + cardWidth - 40,
                50,
                55,
                24,
                0x64748b,
                async () => {
                    await signOut();
                    this.currentUser = null;
                    this.playerName = "";
                    this.render();
                }
            );
        } else {
            // Sign in with Google button
            this.createButton(
                "🔐 Sign in with Google",
                w - 130,
                40,
                180,
                40,
                0x4285f4,
                async () => {
                    this.authLoading = true;
                    this.render();
                    await signInWithGoogle();
                }
            );
        }
    }
    
    private createSmallButton(
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color: number,
        onClick: () => void
    ): void {
        const container = new PIXI.Container();
        container.position.set(x - width / 2, y - height / 2);
        container.eventMode = "static";
        container.cursor = "pointer";
        container.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, width, height, 4);
        bg.fill({ color });
        
        const label = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({
                fontSize: 10,
                fill: 0xffffff,
            }),
        });
        label.anchor.set(0.5);
        label.position.set(width / 2, height / 2);
        
        container.addChild(bg);
        container.addChild(label);
        
        container.on("pointerdown", onClick);
        container.on("pointerover", () => {
            bg.clear();
            bg.roundRect(0, 0, width, height, 4);
            bg.fill({ color: color + 0x222222 });
        });
        container.on("pointerout", () => {
            bg.clear();
            bg.roundRect(0, 0, width, height, 4);
            bg.fill({ color });
        });
        
        this.container.addChild(container);
    }

    private renderInputForm(w: number, h: number): void {
        const centerY = h / 2 - 50;
        const isCreating = this.state === "creating";
        const inputWidth = 350; // Wider inputs for long names

        // Form title
        const formTitle = new PIXI.Text({
            text: isCreating ? "Create New Room" : "Join Room",
            style: new PIXI.TextStyle({
                fontSize: 32,
                fill: 0xffffff,
                fontWeight: "700",
                fontFamily: "Arial, sans-serif",
            }),
        });
        formTitle.anchor.set(0.5);
        formTitle.position.set(w / 2, centerY - 80);
        this.container.addChild(formTitle);

        // Name input label - positioned above input
        this.createLabel("Your Name:", w / 2 - inputWidth / 2, centerY - 50);

        // Truncate display name for input
        const displayName = this.playerName.length > 28 
            ? this.playerName.slice(0, 28) + "..." 
            : this.playerName;

        // Name input (simulated with prompt for MVP)
        this.createInputButton(
            displayName || "Click to enter name...",
            w / 2,
            centerY,
            inputWidth,
            44,
            () => {
                const name = prompt("Enter your name:", this.playerName || "Player");
                if (name) {
                    this.playerName = name.slice(0, 40); // Allow longer names
                    this.render();
                }
            }
        );

        // Room code input (join only)
        if (!isCreating) {
            this.createLabel("Room Code:", w / 2 - inputWidth / 2, centerY + 55);
            this.createInputButton(
                this.joinCode || "Click to enter code...",
                w / 2,
                centerY + 90,
                inputWidth,
                44,
                () => {
                    const code = prompt("Enter 4-letter room code:", this.joinCode);
                    if (code) {
                        this.joinCode = code.toUpperCase().slice(0, 4);
                        this.render();
                    }
                }
            );
        }

        // Action buttons
        const buttonY = isCreating ? centerY + 70 : centerY + 160;

        this.createButton(
            isCreating ? "CREATE" : "JOIN",
            w / 2 - 60,
            buttonY,
            100,
            40,
            0x22c55e,
            async () => {
                if (!this.playerName) {
                    this.errorMessage = "Please enter your name";
                    this.render();
                    return;
                }

                this.errorMessage = "";

                if (isCreating) {
                    const result = await socketClient.createRoom(this.playerName, 4);
                    if (result.success) {
                        this.state = "in-lobby";
                        this.players = socketClient.players;
                    } else {
                        this.errorMessage = result.error || "Failed to create room";
                    }
                } else {
                    if (!this.joinCode || this.joinCode.length < 4) {
                        this.errorMessage = "Please enter a valid room code";
                        this.render();
                        return;
                    }
                    const result = await socketClient.joinRoom(this.joinCode, this.playerName);
                    if (result.success) {
                        this.state = "in-lobby";
                        this.players = socketClient.players;
                    } else {
                        this.errorMessage = result.error || "Failed to join room";
                    }
                }
                this.render();
            }
        );

        this.createButton(
            "BACK",
            w / 2 + 60,
            buttonY,
            100,
            40,
            0x64748b,
            () => {
                this.state = "menu";
                this.errorMessage = "";
                this.render();
            }
        );
    }

    private renderLobby(w: number, h: number): void {
        // Room code display
        const codeLabel = new PIXI.Text({
            text: "Room Code:",
            style: new PIXI.TextStyle({ fontSize: 18, fill: 0x888888 }),
        });
        codeLabel.anchor.set(0.5);
        codeLabel.position.set(w / 2, 180);
        this.container.addChild(codeLabel);

        const codeText = new PIXI.Text({
            text: socketClient.roomCode || "????",
            style: new PIXI.TextStyle({
                fontSize: 48,
                fill: 0x00ff88,
                fontWeight: "700",
                letterSpacing: 8,
            }),
        });
        codeText.anchor.set(0.5);
        codeText.position.set(w / 2, 220);
        this.container.addChild(codeText);

        // Share info
        const shareInfo = new PIXI.Text({
            text: "Share this code with friends to join!",
            style: new PIXI.TextStyle({ fontSize: 14, fill: 0x666666 }),
        });
        shareInfo.anchor.set(0.5);
        shareInfo.position.set(w / 2, 260);
        this.container.addChild(shareInfo);

        // Race selection (for current player)
        this.renderRaceSelection(w, h);

        // Players list
        const playersTitle = new PIXI.Text({
            text: `Players (${this.players.length}/4)`,
            style: new PIXI.TextStyle({ fontSize: 22, fill: 0xffffff, fontWeight: "600" }),
        });
        playersTitle.anchor.set(0.5);
        playersTitle.position.set(w / 2, 310);
        this.container.addChild(playersTitle);

        const playerColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];

        this.players.forEach((player, i) => {
            const y = 350 + i * 50;

            // Player card
            const card = new PIXI.Graphics();
            card.roundRect(w / 2 - 180, y, 360, 40, 8);
            card.fill({ color: 0x1a1a2e });
            card.stroke({ color: playerColors[i], width: 2 });
            this.container.addChild(card);

            // Player color dot
            const dot = new PIXI.Graphics();
            dot.circle(w / 2 - 160, y + 20, 8);
            dot.fill({ color: playerColors[i] });
            this.container.addChild(dot);

            // Player name
            const nameText = new PIXI.Text({
                text: player.name + (player.id === socketClient.playerId ? " (you)" : ""),
                style: new PIXI.TextStyle({ fontSize: 16, fill: 0xffffff }),
            });
            nameText.position.set(w / 2 - 140, y + 10);
            this.container.addChild(nameText);

            // Player race (show emoji)
            const playerRace = player.id === socketClient.playerId 
                ? this.selectedRace 
                : (player as any).raceId;
            const raceData = RACE_LIST.find(r => r.id === playerRace);
            if (raceData) {
                const raceText = new PIXI.Text({
                    text: raceData.emoji,
                    style: new PIXI.TextStyle({ fontSize: 20 }),
                });
                raceText.position.set(w / 2 + 60, y + 8);
                this.container.addChild(raceText);
            }

            // Admin badge
            if (player.isAdmin) {
                const badge = new PIXI.Text({
                    text: "👑",
                    style: new PIXI.TextStyle({ fontSize: 14 }),
                });
                badge.position.set(w / 2 + 100, y + 10);
                this.container.addChild(badge);
            }

            // Ready status
            const ready = new PIXI.Text({
                text: player.ready ? "✅" : "⏳",
                style: new PIXI.TextStyle({ fontSize: 18 }),
            });
            ready.position.set(w / 2 + 140, y + 10);
            this.container.addChild(ready);
        });

        // Bottom buttons
        const buttonY = h - 100;

        // Ready button (for non-admin)
        if (!socketClient.isAdmin) {
            const me = this.players.find((p) => p.id === socketClient.playerId);
            this.createButton(
                me?.ready ? "NOT READY" : "READY",
                w / 2 - 80,
                buttonY,
                140,
                45,
                me?.ready ? 0xef4444 : 0x22c55e,
                () => {
                    const me = this.players.find((p) => p.id === socketClient.playerId);
                    socketClient.setReady(!me?.ready);
                }
            );
        }

        // Start button (admin only)
        if (socketClient.isAdmin) {
            const canStart = this.players.length >= 2;
            this.createButton(
                "🚀 START GAME",
                w / 2,
                buttonY,
                180,
                50,
                canStart ? 0x22c55e : 0x4b5563,
                () => {
                    if (!canStart) {
                        this.errorMessage = "Need at least 2 players";
                        this.render();
                        return;
                    }
                    // Signal to main.ts to start the game
                    this.onRequestStart?.();
                }
            );
        }

        // Leave button
        this.createButton(
            "LEAVE",
            socketClient.isAdmin ? w / 2 + 120 : w / 2 + 80,
            buttonY,
            80,
            45,
            0x64748b,
            () => {
                socketClient.disconnect();
                this.state = "menu";
                this.players = [];
                this.render();
            }
        );
    }

    // ========================================
    // RACE SELECTION (v0.4)
    // ========================================

    private renderRaceSelection(_w: number, _h: number): void {
        // Race selection panel (left side)
        const panelX = 20;
        const panelY = 180;
        const panelW = 200;
        
        const raceTitle = new PIXI.Text({
            text: "🧬 Select Race",
            style: new PIXI.TextStyle({ 
                fontSize: 16, 
                fill: 0x00ffff,
                fontWeight: "600" 
            }),
        });
        raceTitle.position.set(panelX, panelY);
        this.container.addChild(raceTitle);

        RACE_LIST.forEach((race, i) => {
            const y = panelY + 30 + i * 50;
            const isSelected = this.selectedRace === race.id;
            
            // Race card
            const card = new PIXI.Container();
            card.position.set(panelX, y);
            card.eventMode = "static";
            card.cursor = "pointer";
            card.hitArea = new PIXI.Rectangle(0, 0, panelW, 45);
            
            const cardBg = new PIXI.Graphics();
            cardBg.roundRect(0, 0, panelW, 45, 6);
            cardBg.fill({ color: isSelected ? 0x1e3a5f : 0x1a1a2e });
            cardBg.stroke({ color: isSelected ? 0x00ffff : 0x3a3a5a, width: isSelected ? 2 : 1 });
            card.addChild(cardBg);
            
            // Race emoji
            const emoji = new PIXI.Text({
                text: race.emoji,
                style: new PIXI.TextStyle({ fontSize: 20 }),
            });
            emoji.position.set(10, 12);
            card.addChild(emoji);
            
            // Race name
            const name = new PIXI.Text({
                text: race.name,
                style: new PIXI.TextStyle({ 
                    fontSize: 12, 
                    fill: isSelected ? 0x00ffff : 0xffffff,
                    fontWeight: isSelected ? "700" : "400"
                }),
            });
            name.position.set(40, 8);
            card.addChild(name);
            
            // Passive description
            const desc = new PIXI.Text({
                text: race.passiveDescription.slice(0, 25) + (race.passiveDescription.length > 25 ? "..." : ""),
                style: new PIXI.TextStyle({ 
                    fontSize: 9, 
                    fill: 0x888888,
                }),
            });
            desc.position.set(40, 26);
            card.addChild(desc);
            
            // Click handler
            card.on("pointerdown", () => {
                this.selectedRace = race.id;
                socketClient.updatePlayerData({ raceId: race.id });
                this.render();
            });
            
            // Hover effect
            card.on("pointerover", () => {
                if (!isSelected) {
                    cardBg.clear();
                    cardBg.roundRect(0, 0, panelW, 45, 6);
                    cardBg.fill({ color: 0x2a2a4e });
                    cardBg.stroke({ color: 0x5a5a7a, width: 1 });
                }
            });
            card.on("pointerout", () => {
                if (!isSelected) {
                    cardBg.clear();
                    cardBg.roundRect(0, 0, panelW, 45, 6);
                    cardBg.fill({ color: 0x1a1a2e });
                    cardBg.stroke({ color: 0x3a3a5a, width: 1 });
                }
            });
            
            this.container.addChild(card);
        });
        
        // Random button
        const randomY = panelY + 30 + RACE_LIST.length * 50;
        this.createButton(
            "🎲 Random",
            panelX + panelW / 2,
            randomY + 10,
            panelW - 20,
            35,
            0x4a4a6a,
            () => {
                const randomRace = RACE_LIST[Math.floor(Math.random() * RACE_LIST.length)];
                this.selectedRace = randomRace.id;
                socketClient.updatePlayerData({ raceId: randomRace.id });
                this.render();
            }
        );
    }

    // ========================================
    // UI HELPERS
    // ========================================

    private createButton(
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color: number,
        onClick: () => void
    ): void {
        const btn = new PIXI.Graphics();
        btn.roundRect(-width / 2, -height / 2, width, height, 8);
        btn.fill({ color });
        btn.position.set(x, y);
        btn.eventMode = "static";
        btn.cursor = "pointer";

        btn.on("pointerover", () => {
            btn.alpha = 0.8;
        });
        btn.on("pointerout", () => {
            btn.alpha = 1;
        });
        btn.on("pointerdown", onClick);

        const label = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({
                fontSize: 16,
                fill: 0xffffff,
                fontWeight: "600",
            }),
        });
        label.anchor.set(0.5);
        btn.addChild(label);

        this.container.addChild(btn);
    }

    private createInputButton(
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        onClick: () => void
    ): void {
        // Use Container to avoid deprecation warning
        const container = new PIXI.Container();
        container.position.set(x - width / 2, y - height / 2);
        container.eventMode = "static";
        container.cursor = "pointer";
        container.hitArea = new PIXI.Rectangle(0, 0, width, height);
        
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, width, height, 8);
        bg.fill({ color: 0x1e293b });
        bg.stroke({ color: 0x475569, width: 2 });
        
        container.addChild(bg);

        container.on("pointerdown", onClick);
        container.on("pointerover", () => {
            bg.clear();
            bg.roundRect(0, 0, width, height, 8);
            bg.fill({ color: 0x2d3748 });
            bg.stroke({ color: 0x60a5fa, width: 2 });
        });
        container.on("pointerout", () => {
            bg.clear();
            bg.roundRect(0, 0, width, height, 8);
            bg.fill({ color: 0x1e293b });
            bg.stroke({ color: 0x475569, width: 2 });
        });

        const label = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({
                fontSize: 15,
                fill: text.includes("Click") ? 0x6b7280 : 0xffffff,
                fontFamily: "Arial, sans-serif",
            }),
        });
        label.anchor.set(0.5);
        label.position.set(width / 2, height / 2);
        container.addChild(label);

        this.container.addChild(container);
    }

    private createLabel(text: string, x: number, y: number): void {
        const label = new PIXI.Text({
            text,
            style: new PIXI.TextStyle({
                fontSize: 13,
                fill: 0x9ca3af,
                fontFamily: "Arial, sans-serif",
            }),
        });
        label.position.set(x, y);
        this.container.addChild(label);
    }
}
