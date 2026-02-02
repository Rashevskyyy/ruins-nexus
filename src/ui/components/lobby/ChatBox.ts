/**
 * ChatBox - Chat component for lobby with messages area and input
 */

import * as PIXI from 'pixi.js';
import { FONT_FAMILIES } from '../../styles/fonts';
import { COLORS } from '../../styles/colors';

// Player colors for chat avatars
const PLAYER_COLORS = [0xff6b6b, 0x00aaff, 0xffd700, 0x00ff88];

export interface ChatMessage {
    id: string;
    type: 'system' | 'player';
    playerName?: string;
    playerColorIndex?: number;
    text: string;
    timestamp: number;
}

export interface ChatBoxOptions {
    width: number;
    height: number;
    onSendMessage?: (text: string) => void;
}

export class ChatBox extends PIXI.Container {
    private messagesContainer: PIXI.Container;
    private messagesMask: PIXI.Graphics;
    private inputContainer: PIXI.Container;
    private inputBg: PIXI.Graphics;
    private inputText: PIXI.Text;
    private sendButton: PIXI.Container;

    private messages: ChatMessage[] = [];
    private currentInput = '';
    private options: Required<ChatBoxOptions>;

    constructor(options: ChatBoxOptions) {
        super();

        this.options = {
            width: options.width,
            height: options.height,
            onSendMessage: options.onSendMessage ?? (() => {}),
        };

        // Messages area
        this.messagesContainer = new PIXI.Container();
        this.messagesContainer.position.set(12, 12);

        // Mask for messages scrolling
        this.messagesMask = new PIXI.Graphics();
        this.messagesMask.rect(0, 0, this.options.width - 24, this.options.height - 70);
        this.messagesMask.fill({ color: 0xffffff });
        this.messagesMask.position.set(12, 12);
        this.messagesContainer.mask = this.messagesMask;

        this.addChild(this.messagesMask);
        this.addChild(this.messagesContainer);

        // Input area
        this.inputContainer = new PIXI.Container();
        this.inputContainer.position.set(12, this.options.height - 48);
        this.addChild(this.inputContainer);

        this.inputBg = new PIXI.Graphics();
        this.inputText = new PIXI.Text({
            text: 'Type a message...',
            style: new PIXI.TextStyle({
                fontFamily: FONT_FAMILIES.body,
                fontSize: 13,
                fill: 0x555555,
            }),
        });

        this.sendButton = this.createSendButton();

        this.drawInput();
        this.inputContainer.addChild(this.inputBg);
        this.inputContainer.addChild(this.inputText);
        this.inputContainer.addChild(this.sendButton);

        this.setupInteraction();

        // Add some demo messages
        this.addSystemMessage('Welcome to the lobby!');
    }

    private drawInput(): void {
        const inputWidth = this.options.width - 24 - 50; // Subtract padding and button width

        this.inputBg.clear();
        this.inputBg.roundRect(0, 0, inputWidth, 36, 8);
        this.inputBg.fill({ color: 0x000000, alpha: 0.3 });
        this.inputBg.roundRect(0, 0, inputWidth, 36, 8);
        this.inputBg.stroke({ color: 0xffffff, width: 1, alpha: 0.1 });

        this.inputText.position.set(12, (36 - this.inputText.height) / 2);
    }

    private createSendButton(): PIXI.Container {
        const button = new PIXI.Container();
        const inputWidth = this.options.width - 24 - 50;

        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, 42, 36, 8);
        bg.fill({ color: COLORS.primary });
        button.addChild(bg);

        const arrow = new PIXI.Text({
            text: '→',
            style: new PIXI.TextStyle({
                fontSize: 18,
                fontWeight: '700',
                fill: 0xffffff,
            }),
        });
        arrow.anchor.set(0.5);
        arrow.position.set(21, 18);
        button.addChild(arrow);

        button.position.set(inputWidth + 8, 0);
        button.eventMode = 'static';
        button.cursor = 'pointer';
        button.hitArea = new PIXI.Rectangle(0, 0, 42, 36);

        button.on('pointerover', () => {
            bg.clear();
            bg.roundRect(0, 0, 42, 36, 8);
            bg.fill({ color: COLORS.primaryLight });
        });

        button.on('pointerout', () => {
            bg.clear();
            bg.roundRect(0, 0, 42, 36, 8);
            bg.fill({ color: COLORS.primary });
        });

        button.on('pointerdown', () => {
            this.sendCurrentMessage();
        });

        return button;
    }

    private setupInteraction(): void {
        const inputWidth = this.options.width - 24 - 50;

        // Make input clickable
        this.inputBg.eventMode = 'static';
        this.inputBg.cursor = 'text';
        this.inputBg.hitArea = new PIXI.Rectangle(0, 0, inputWidth, 36);

        this.inputBg.on('pointerdown', () => {
            const input = prompt('Enter message:', this.currentInput);
            if (input !== null) {
                this.currentInput = input;
                this.updateInputDisplay();
            }
        });
    }

    private updateInputDisplay(): void {
        if (this.currentInput) {
            this.inputText.text = this.currentInput;
            this.inputText.style.fill = 0xffffff;
        } else {
            this.inputText.text = 'Type a message...';
            this.inputText.style.fill = 0x555555;
        }
    }

    private sendCurrentMessage(): void {
        if (this.currentInput.trim()) {
            this.options.onSendMessage(this.currentInput);
            this.currentInput = '';
            this.updateInputDisplay();
        }
    }

    addSystemMessage(text: string): void {
        this.messages.push({
            id: `sys_${Date.now()}`,
            type: 'system',
            text,
            timestamp: Date.now(),
        });
        this.renderMessages();
    }

    addPlayerMessage(playerName: string, playerColorIndex: number, text: string): void {
        this.messages.push({
            id: `msg_${Date.now()}`,
            type: 'player',
            playerName,
            playerColorIndex,
            text,
            timestamp: Date.now(),
        });
        this.renderMessages();
    }

    private renderMessages(): void {
        this.messagesContainer.removeChildren();

        let y = 0;
        const messageHeight = this.options.height - 70;
        const maxWidth = this.options.width - 40;

        for (const message of this.messages) {
            if (message.type === 'system') {
                // System message - italic, gray
                const text = new PIXI.Text({
                    text: message.text,
                    style: new PIXI.TextStyle({
                        fontFamily: FONT_FAMILIES.body,
                        fontSize: 12,
                        fontStyle: 'italic',
                        fill: 0x888888,
                        wordWrap: true,
                        wordWrapWidth: maxWidth,
                    }),
                });
                text.position.set(0, y);
                this.messagesContainer.addChild(text);
                y += text.height + 8;
            } else {
                // Player message with colored avatar
                const msgContainer = new PIXI.Container();
                msgContainer.position.set(0, y);

                // Color dot
                const dot = new PIXI.Graphics();
                const color = PLAYER_COLORS[message.playerColorIndex! % PLAYER_COLORS.length];
                dot.circle(6, 8, 6);
                dot.fill({ color });
                msgContainer.addChild(dot);

                // Player name
                const nameText = new PIXI.Text({
                    text: message.playerName,
                    style: new PIXI.TextStyle({
                        fontFamily: FONT_FAMILIES.heading,
                        fontSize: 12,
                        fontWeight: '700',
                        fill: color,
                    }),
                });
                nameText.position.set(18, 0);
                msgContainer.addChild(nameText);

                // Message text
                const msgText = new PIXI.Text({
                    text: message.text,
                    style: new PIXI.TextStyle({
                        fontFamily: FONT_FAMILIES.body,
                        fontSize: 13,
                        fill: 0xcccccc,
                        wordWrap: true,
                        wordWrapWidth: maxWidth - 20,
                    }),
                });
                msgText.position.set(18, 16);
                msgContainer.addChild(msgText);

                this.messagesContainer.addChild(msgContainer);
                y += 16 + msgText.height + 12;
            }
        }

        // Auto-scroll to bottom if content exceeds visible area
        const totalHeight = y;
        const visibleHeight = messageHeight;
        if (totalHeight > visibleHeight) {
            this.messagesContainer.y = 12 - (totalHeight - visibleHeight);
        } else {
            this.messagesContainer.y = 12;
        }
    }

    clearMessages(): void {
        this.messages = [];
        this.renderMessages();
    }
}
