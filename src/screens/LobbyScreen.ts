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
import { AssetLoader, GAME_VERSION } from "../assets/AssetLoader";
import { RACE_LIST, RACES, type RaceId, type RaceOption } from "../entities/Race";

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
    
    // Race selection (v0.5 - now with option)
    private selectedRace: RaceId | null = null;
    private selectedOption: RaceOption = "A"; // Default to option A
    private heroCarouselIndex = 0;

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

        // Background with gradient effect
        const bg = new PIXI.Graphics();
        bg.rect(0, 0, w, h);
        bg.fill({ color: 0x0a0a1a });
        this.container.addChild(bg);
        
        // Decorative top bar
        const topBar = new PIXI.Graphics();
        topBar.rect(0, 0, w, 4);
        topBar.fill({ color: 0x00ffff });
        this.container.addChild(topBar);

        // Title with enhanced glow
        const title = new PIXI.Text({
            text: "🚀 COSMIC FRONTIER",
            style: new PIXI.TextStyle({
                fontSize: 52,
                fill: 0x00ffff,
                fontWeight: "700",
                dropShadow: {
                    color: 0x00ffff,
                    blur: 15,
                    alpha: 0.8,
                    distance: 0,
                },
            }),
        });
        title.anchor.set(0.5);
        title.position.set(w / 2, 70);
        this.container.addChild(title);

        // Subtitle with version (better styling)
        const subtitle = new PIXI.Text({
            text: `Multiplayer Expedition  •  ${GAME_VERSION}`,
            style: new PIXI.TextStyle({
                fontSize: 18,
                fill: 0x888888,
                letterSpacing: 2,
            }),
        });
        subtitle.anchor.set(0.5);
        subtitle.position.set(w / 2, 120);
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
        // Room Code Panel - IMPROVED with Click to Copy
        const rightColX = w - 530;
        const roomPanel = new PIXI.Graphics();
        roomPanel.roundRect(rightColX, 170, 500, 180, 12);
        roomPanel.fill({ color: 0x1a1a2e });
        roomPanel.stroke({ color: 0x00ff88, width: 2 });
        roomPanel.eventMode = "static";
        roomPanel.cursor = "pointer";
        this.container.addChild(roomPanel);
        
        const codeLabel = new PIXI.Text({
            text: "Room Code: (click to copy)",
            style: new PIXI.TextStyle({ 
                fontSize: 16, 
                fill: 0x888888,
                fontWeight: "600"
            }),
        });
        codeLabel.position.set(rightColX + 20, 190);
        this.container.addChild(codeLabel);

        const codeText = new PIXI.Text({
            text: socketClient.roomCode || "????",
            style: new PIXI.TextStyle({
                fontSize: 56,
                fill: 0x00ff88,
                fontWeight: "700",
                letterSpacing: 12,
                dropShadow: {
                    color: 0x00ff88,
                    blur: 12,
                    alpha: 0.6,
                    distance: 0,
                },
            }),
        });
        codeText.anchor.set(0.5);
        codeText.position.set(rightColX + 250, 260);
        this.container.addChild(codeText);

        const shareInfo = new PIXI.Text({
            text: "Share this code with friends to join!",
            style: new PIXI.TextStyle({ 
                fontSize: 14, 
                fill: 0x666666,
                fontStyle: "italic"
            }),
        });
        shareInfo.anchor.set(0.5);
        shareInfo.position.set(rightColX + 250, 320);
        this.container.addChild(shareInfo);
        
        // Click to copy functionality
        let copyFeedback: PIXI.Text | null = null;
        roomPanel.on("pointerdown", async () => {
            const code = socketClient.roomCode;
            if (!code) return;
            
            try {
                await navigator.clipboard.writeText(code);
                
                // Show "Copied!" feedback
                if (copyFeedback) copyFeedback.destroy();
                copyFeedback = new PIXI.Text({
                    text: "✓ Copied!",
                    style: new PIXI.TextStyle({ 
                        fontSize: 16, 
                        fill: 0x00ff88,
                        fontWeight: "700"
                    }),
                });
                copyFeedback.anchor.set(0.5);
                copyFeedback.position.set(rightColX + 250, 310);
                this.container.addChild(copyFeedback);
                
                // Fade out after 1.5 seconds
                setTimeout(() => {
                    if (copyFeedback) {
                        copyFeedback.destroy();
                        copyFeedback = null;
                    }
                }, 1500);
            } catch (err) {
                console.error("Failed to copy:", err);
            }
        });
        
        // Hover effect
        roomPanel.on("pointerover", () => {
            roomPanel.clear();
            roomPanel.roundRect(rightColX, 170, 500, 180, 12);
            roomPanel.fill({ color: 0x1e2e3e });
            roomPanel.stroke({ color: 0x00ffaa, width: 3 });
        });
        roomPanel.on("pointerout", () => {
            roomPanel.clear();
            roomPanel.roundRect(rightColX, 170, 500, 180, 12);
            roomPanel.fill({ color: 0x1a1a2e });
            roomPanel.stroke({ color: 0x00ff88, width: 2 });
        });

        // Race selection (for current player)
        this.renderRaceSelection(w, h);

        // Players Panel - IMPROVED
        const playersY = 380;
        const playersPanel = new PIXI.Graphics();
        const playersPanelHeight = 90 + this.players.length * 70;
        playersPanel.roundRect(rightColX, playersY, 500, playersPanelHeight, 12);
        playersPanel.fill({ color: 0x1a1a2e });
        playersPanel.stroke({ color: 0x2a2a4e, width: 2 });
        this.container.addChild(playersPanel);
        
        const playersTitle = new PIXI.Text({
            text: `👥 Players (${this.players.length}/4)`,
            style: new PIXI.TextStyle({ 
                fontSize: 20, 
                fill: 0x00ffff, 
                fontWeight: "700" 
            }),
        });
        playersTitle.position.set(rightColX + 20, playersY + 20);
        this.container.addChild(playersTitle);

        const playerColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];

        this.players.forEach((player, i) => {
            const y = playersY + 65 + i * 70;

            // Player card with better styling
            const card = new PIXI.Graphics();
            card.roundRect(rightColX + 20, y, 460, 60, 10);
            card.fill({ color: 0x252540 });
            card.stroke({ color: playerColors[i], width: 3 });
            this.container.addChild(card);
            
            // Color indicator bar
            const colorBar = new PIXI.Graphics();
            colorBar.roundRect(rightColX + 20, y, 8, 60, 4);
            colorBar.fill({ color: playerColors[i] });
            this.container.addChild(colorBar);

            // Player color dot (larger)
            const dot = new PIXI.Graphics();
            dot.circle(rightColX + 50, y + 30, 12);
            dot.fill({ color: playerColors[i] });
            this.container.addChild(dot);

            // Player name with ellipsis for long names
            const isYou = player.id === socketClient.playerId;
            const maxNameWidth = 180; // Max width before ellipsis
            
            const nameText = new PIXI.Text({
                text: player.name,
                style: new PIXI.TextStyle({ 
                    fontSize: 18, 
                    fill: 0xffffff,
                    fontWeight: isYou ? "700" : "600"
                }),
            });
            
            // Truncate with ellipsis if too long
            if (nameText.width > maxNameWidth) {
                let truncated = player.name;
                nameText.text = truncated;
                
                while (nameText.width > maxNameWidth - 20 && truncated.length > 0) {
                    truncated = truncated.slice(0, -1);
                    nameText.text = truncated + "...";
                }
            }
            
            nameText.position.set(rightColX + 75, y + 13);
            this.container.addChild(nameText);
            
            // "You" badge
            if (isYou) {
                const youBadge = new PIXI.Text({
                    text: "YOU",
                    style: new PIXI.TextStyle({ 
                        fontSize: 11, 
                        fill: 0x00ff88,
                        fontWeight: "700",
                        letterSpacing: 1
                    }),
                });
                youBadge.position.set(rightColX + 75, y + 38);
                this.container.addChild(youBadge);
            }

            // Player race (larger emoji only - saves space)
            const playerRace = player.id === socketClient.playerId 
                ? this.selectedRace 
                : player.raceId;
            const raceData = RACE_LIST.find(r => r.id === playerRace);
            if (raceData) {
                const raceEmoji = new PIXI.Text({
                    text: raceData.emoji,
                    style: new PIXI.TextStyle({ fontSize: 32 }), // Larger emoji
                });
                raceEmoji.position.set(rightColX + 320, y + 14);
                this.container.addChild(raceEmoji);
            }

            // Admin crown + Ready status side by side
            if (player.isAdmin) {
                const badge = new PIXI.Text({
                    text: "👑",
                    style: new PIXI.TextStyle({ fontSize: 24 }),
                });
                badge.position.set(rightColX + 375, y + 18);
                this.container.addChild(badge);
            }
            
            // Ready status (larger)
            const ready = new PIXI.Text({
                text: player.ready ? "✅" : "⏳",
                style: new PIXI.TextStyle({ fontSize: 28 }),
            });
            ready.position.set(rightColX + (player.isAdmin ? 410 : 385), y + 16);
            this.container.addChild(ready);
        });

        // Bottom buttons - IMPROVED
        const buttonY = h - 80;

        // Ready button (for non-admin)
        if (!socketClient.isAdmin) {
            const me = this.players.find((p) => p.id === socketClient.playerId);
            this.createButton(
                me?.ready ? "✗ NOT READY" : "✓ READY",
                w / 2 - 120,
                buttonY,
                200,
                55,
                me?.ready ? 0xef4444 : 0x22c55e,
                () => {
                    const me = this.players.find((p) => p.id === socketClient.playerId);
                    socketClient.setReady(!me?.ready);
                }
            );
        }

        // Start button (admin only)
        if (socketClient.isAdmin) {
            const allRacesSelected = this.players.every(player => player.raceId && player.raceOption);
            const canStart = this.players.length >= 2 && allRacesSelected;
            this.createButton(
                "🚀 START GAME",
                w / 2 - 120,
                buttonY,
                200,
                55,
                canStart ? 0x22c55e : 0x4b5563,
                () => {
                    if (!canStart) {
                        if (this.players.length < 2) {
                            this.errorMessage = "Need at least 2 players";
                        } else {
                            this.errorMessage = "All players must select a race and option";
                        }
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
            w / 2 + 120,
            buttonY,
            140,
            55,
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

    private renderRaceSelection(_w: number, h: number): void {
        const panelX = 30;
        const panelY = 170;
        const panelW = 520;
        const panelH = Math.max(260, Math.min(360, h - panelY - 260));

        const raceTitle = new PIXI.Text({
            text: "🧬 Select Race",
            style: new PIXI.TextStyle({ 
                fontSize: 22, // Larger title
                fill: 0x00ffff,
                fontWeight: "700" 
            }),
        });
        raceTitle.position.set(panelX, panelY);
        this.container.addChild(raceTitle);

        const raceIndex = this.getRaceCarouselIndex();
        const race = RACE_LIST[raceIndex];

        const frameY = panelY + 40;
        const frame = new PIXI.Graphics();
        frame.roundRect(panelX, frameY, panelW, panelH, 12);
        frame.fill({ color: 0x0f172a });
        frame.stroke({ color: 0x3b82f6, width: 2, alpha: 0.8 });
        frame.eventMode = "static";
        frame.cursor = "pointer";
        this.container.addChild(frame);

        const texture = AssetLoader.getTexture(`hero-${race.id}`);
        if (texture) {
            const heroSettings: Record<string, { scale: number; anchorY: number }> = {
                "bioform":  { scale: 0.7, anchorY: 0.30 },
                "chrono":   { scale: 1, anchorY: 0.25 },
                "forge":    { scale: 0.9, anchorY: 0.24 },
                "nomad":    { scale: 0.55, anchorY: 0.35 },
                "void":     { scale: 0.5, anchorY: 0.40 },
                "warbound": { scale: 0.7, anchorY: 0.30 },
            };
            const settings = heroSettings[race.id] || { scale: 1.0, anchorY: 0.35 };
            
            const sprite = new PIXI.Sprite(texture);
            const baseScale = Math.max(panelW / texture.width, panelH / texture.height);
            sprite.scale.set(baseScale * settings.scale);
            sprite.anchor.set(0.5, settings.anchorY);
            sprite.position.set(panelX + panelW / 2, frameY + panelH / 2);

            // Mask must be filled in PIXI v8
            const mask = new PIXI.Graphics();
            mask.roundRect(panelX, frameY, panelW, panelH, 12);
            mask.fill({ color: 0xffffff }); // Fill is required for mask to work
            
            sprite.mask = mask;
            this.container.addChild(sprite);
            this.container.addChild(mask); // Mask added after sprite
        } else {
            const placeholder = new PIXI.Text({
                text: "Hero art loading...",
                style: new PIXI.TextStyle({ fontSize: 16, fill: 0x94a3b8 }),
            });
            placeholder.anchor.set(0.5);
            placeholder.position.set(panelX + panelW / 2, frameY + panelH / 2);
            this.container.addChild(placeholder);
        }

        frame.on("pointerdown", () => {
            this.setSelectedRace(race.id);
        });

        this.createSmallButton(
            "◀",
            panelX + 30,
            frameY + panelH / 2,
            38,
            32,
            0x1e293b,
            () => this.shiftRaceCarousel(-1)
        );

        this.createSmallButton(
            "▶",
            panelX + panelW - 30,
            frameY + panelH / 2,
            38,
            32,
            0x1e293b,
            () => this.shiftRaceCarousel(1)
        );

        const nameTag = new PIXI.Text({
            text: `${race.emoji} ${race.name}`,
            style: new PIXI.TextStyle({ fontSize: 20, fill: 0xffffff, fontWeight: "700" }),
        });
        nameTag.anchor.set(0.5);
        nameTag.position.set(panelX + panelW / 2, frameY + panelH - 30);
        this.container.addChild(nameTag);

        const descText = new PIXI.Text({
            text: race.description,
            style: new PIXI.TextStyle({ fontSize: 13, fill: 0x9ca3af }),
        });
        descText.anchor.set(0.5);
        descText.position.set(panelX + panelW / 2, frameY + panelH + 18);
        this.container.addChild(descText);

        const passiveText = new PIXI.Text({
            text: `Passive: ${race.passiveDescription}`,
            style: new PIXI.TextStyle({ fontSize: 12, fill: 0xa7f3d0 }),
        });
        passiveText.anchor.set(0.5);
        passiveText.position.set(panelX + panelW / 2, frameY + panelH + 38);
        this.container.addChild(passiveText);

        if (!this.selectedRace) {
            const selectHint = new PIXI.Text({
                text: "Click the art to lock in your hero",
                style: new PIXI.TextStyle({ fontSize: 12, fill: 0xfacc15, fontWeight: "700" }),
            });
            selectHint.anchor.set(0.5);
            selectHint.position.set(panelX + panelW / 2, frameY + panelH - 55);
            this.container.addChild(selectHint);
        }

        // Random button (larger)
        const randomY = frameY + panelH + 75;
        this.createButton(
            "🎲 Random Race",
            panelX + panelW / 2,
            randomY + 10,
            panelW - 20,
            45, // Taller button
            0x4a4a6a,
            () => {
                const randomRace = RACE_LIST[Math.floor(Math.random() * RACE_LIST.length)];
                this.selectedRace = randomRace.id;
                this.heroCarouselIndex = RACE_LIST.findIndex(r => r.id === randomRace.id);
                this.selectedOption = Math.random() < 0.5 ? "A" : "B";
                socketClient.updatePlayerData({ raceId: randomRace.id, raceOption: this.selectedOption });
                this.render();
            }
        );
        
        // Option A/B selection (only when race is selected) - IMPROVED UI
        if (this.selectedRace) {
            const race = RACES[this.selectedRace];
            const optionY = randomY + 70;
            
            // Option title (larger)
            const optTitle = new PIXI.Text({
                text: "⚡ Choose Ability:",
                style: new PIXI.TextStyle({ 
                    fontSize: 18, // Larger
                    fill: 0x00ffff,
                    fontWeight: "700" 
                }),
            });
            optTitle.position.set(panelX, optionY);
            this.container.addChild(optTitle);
            
            // Option A button (taller, more detail)
            const optASelected = this.selectedOption === "A";
            const btnA = new PIXI.Container();
            btnA.position.set(panelX, optionY + 35);
            btnA.eventMode = "static";
            btnA.cursor = "pointer";
            btnA.hitArea = new PIXI.Rectangle(0, 0, panelW, 55); // Taller
            
            const bgA = new PIXI.Graphics();
            bgA.roundRect(0, 0, panelW, 55, 8);
            bgA.fill({ color: optASelected ? 0x2d5a2d : 0x1a1a2e });
            bgA.stroke({ color: optASelected ? 0x00ff00 : 0x3a3a5a, width: optASelected ? 3 : 1 });
            btnA.addChild(bgA);
            
            // Option A badge
            const badgeA = new PIXI.Text({
                text: "A",
                style: new PIXI.TextStyle({ 
                    fontSize: 24,
                    fill: optASelected ? 0x00ff00 : 0x555555,
                    fontWeight: "700"
                }),
            });
            badgeA.position.set(15, 15);
            btnA.addChild(badgeA);
            
            const txtA = new PIXI.Text({
                text: race.optionA.name,
                style: new PIXI.TextStyle({ 
                    fontSize: 14, // Larger
                    fill: optASelected ? 0x00ff00 : 0xcccccc,
                    fontWeight: optASelected ? "700" : "600"
                }),
            });
            txtA.position.set(50, 8);
            btnA.addChild(txtA);
            
            const descA = new PIXI.Text({
                text: race.optionA.description,
                style: new PIXI.TextStyle({ 
                    fontSize: 12, // Larger
                    fill: optASelected ? 0xaaffaa : 0x888888,
                    wordWrap: true,
                    wordWrapWidth: panelW - 60
                }),
            });
            descA.position.set(50, 28);
            btnA.addChild(descA);
            
            btnA.on("pointerdown", () => {
                this.selectedOption = "A";
                socketClient.updatePlayerData({ raceId: this.selectedRace!, raceOption: "A" });
                this.render();
            });
            
            // Hover effect for A
            btnA.on("pointerover", () => {
                if (!optASelected) {
                    bgA.clear();
                    bgA.roundRect(0, 0, panelW, 55, 8);
                    bgA.fill({ color: 0x1e3a1e });
                    bgA.stroke({ color: 0x4a8a4a, width: 2 });
                }
            });
            btnA.on("pointerout", () => {
                if (!optASelected) {
                    bgA.clear();
                    bgA.roundRect(0, 0, panelW, 55, 8);
                    bgA.fill({ color: 0x1a1a2e });
                    bgA.stroke({ color: 0x3a3a5a, width: 1 });
                }
            });
            
            this.container.addChild(btnA);
            
            // Option B button (taller, more detail)
            const optBSelected = this.selectedOption === "B";
            const btnB = new PIXI.Container();
            btnB.position.set(panelX, optionY + 100); // More spacing
            btnB.eventMode = "static";
            btnB.cursor = "pointer";
            btnB.hitArea = new PIXI.Rectangle(0, 0, panelW, 55); // Taller
            
            const bgB = new PIXI.Graphics();
            bgB.roundRect(0, 0, panelW, 55, 8);
            bgB.fill({ color: optBSelected ? 0x4a2d5a : 0x1a1a2e });
            bgB.stroke({ color: optBSelected ? 0xff00ff : 0x3a3a5a, width: optBSelected ? 3 : 1 });
            btnB.addChild(bgB);
            
            // Option B badge
            const badgeB = new PIXI.Text({
                text: "B",
                style: new PIXI.TextStyle({ 
                    fontSize: 24,
                    fill: optBSelected ? 0xff00ff : 0x555555,
                    fontWeight: "700"
                }),
            });
            badgeB.position.set(15, 15);
            btnB.addChild(badgeB);
            
            const txtB = new PIXI.Text({
                text: race.optionB.name,
                style: new PIXI.TextStyle({ 
                    fontSize: 14, // Larger
                    fill: optBSelected ? 0xff00ff : 0xcccccc,
                    fontWeight: optBSelected ? "700" : "600"
                }),
            });
            txtB.position.set(50, 8);
            btnB.addChild(txtB);
            
            const descB = new PIXI.Text({
                text: race.optionB.description,
                style: new PIXI.TextStyle({ 
                    fontSize: 12, // Larger
                    fill: optBSelected ? 0xffaaff : 0x888888,
                    wordWrap: true,
                    wordWrapWidth: panelW - 60
                }),
            });
            descB.position.set(50, 28);
            btnB.addChild(descB);
            
            btnB.on("pointerdown", () => {
                this.selectedOption = "B";
                socketClient.updatePlayerData({ raceId: this.selectedRace!, raceOption: "B" });
                this.render();
            });
            
            // Hover effect for B
            btnB.on("pointerover", () => {
                if (!optBSelected) {
                    bgB.clear();
                    bgB.roundRect(0, 0, panelW, 55, 8);
                    bgB.fill({ color: 0x3a1e3a });
                    bgB.stroke({ color: 0x8a4a8a, width: 2 });
                }
            });
            btnB.on("pointerout", () => {
                if (!optBSelected) {
                    bgB.clear();
                    bgB.roundRect(0, 0, panelW, 55, 8);
                    bgB.fill({ color: 0x1a1a2e });
                    bgB.stroke({ color: 0x3a3a5a, width: 1 });
                }
            });
            
            this.container.addChild(btnB);
        }
    }

    private getRaceCarouselIndex(): number {
        if (this.selectedRace) {
            const selectedIndex = RACE_LIST.findIndex(race => race.id === this.selectedRace);
            if (selectedIndex >= 0) {
                this.heroCarouselIndex = selectedIndex;
                return selectedIndex;
            }
        }
        return Math.max(0, Math.min(this.heroCarouselIndex, RACE_LIST.length - 1));
    }

    private shiftRaceCarousel(direction: number): void {
        const nextIndex = (this.getRaceCarouselIndex() + direction + RACE_LIST.length) % RACE_LIST.length;
        this.heroCarouselIndex = nextIndex;
        this.setSelectedRace(RACE_LIST[nextIndex].id);
    }

    private setSelectedRace(raceId: RaceId): void {
        this.selectedRace = raceId;
        socketClient.updatePlayerData({ raceId, raceOption: this.selectedOption });
        this.render();
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
                fontSize: 18, // Larger font
                fill: 0xffffff,
                fontWeight: "700",
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
