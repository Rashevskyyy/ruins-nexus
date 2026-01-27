import * as PIXI from "pixi.js";

type ToastType = "info" | "success" | "warning" | "error";

export class ToastManager {
    private activeToasts: { container: PIXI.Container; timer: number }[] = [];

    constructor(private app: PIXI.Application, private layer: PIXI.Container) {}

    public showToast(message: string, type: ToastType = "info", duration = 3000): void {
        const colors = {
            info: { bg: 0x2196f3, text: 0xffffff },
            success: { bg: 0x4caf50, text: 0xffffff },
            warning: { bg: 0xff9800, text: 0x000000 },
            error: { bg: 0xf44336, text: 0xffffff },
        };
        const color = colors[type];

        const container = new PIXI.Container();
        const padding = 16;
        const maxWidth = 300;

        // Text
        const text = new PIXI.Text({
            text: message,
            style: new PIXI.TextStyle({
                fontSize: 14,
                fill: color.text,
                fontWeight: "600",
                wordWrap: true,
                wordWrapWidth: maxWidth - padding * 2,
            }),
        });

        // Background
        const bg = new PIXI.Graphics();
        const width = Math.min(text.width + padding * 2, maxWidth + padding * 2);
        const height = text.height + padding * 2;
        bg.roundRect(0, 0, width, height, 8);
        bg.fill({ color: color.bg, alpha: 0.95 });
        bg.stroke({ color: 0x000000, width: 1, alpha: 0.2 });

        text.position.set(padding, padding);

        container.addChild(bg);
        container.addChild(text);

        // Position: stack from top-center (above the map, clearly visible)
        const offsetY = this.activeToasts.reduce((sum, t) => sum + (t.container.height || 60) + 10, 60);
        container.position.set((this.app.screen.width - width) / 2, offsetY);

        // Fade in animation
        container.alpha = 0;

        this.layer.addChild(container);
        this.activeToasts.push({ container, timer: duration });

        // Animate in
        let fadeIn = 0;
        const fadeInInterval = setInterval(() => {
            fadeIn += 0.1;
            container.alpha = Math.min(1, fadeIn);
            if (fadeIn >= 1) clearInterval(fadeInInterval);
        }, 30);

        // Auto dismiss
        setTimeout(() => this.dismissToast(container), duration);
    }

    private dismissToast(container: PIXI.Container): void {
        // Fade out
        let fadeOut = 1;
        const fadeOutInterval = setInterval(() => {
            fadeOut -= 0.1;
            container.alpha = Math.max(0, fadeOut);
            if (fadeOut <= 0) {
                clearInterval(fadeOutInterval);
                this.layer.removeChild(container);
                this.activeToasts = this.activeToasts.filter(t => t.container !== container);
                this.repositionToasts();
            }
        }, 30);
    }

    private repositionToasts(): void {
        let offsetY = 60;
        for (const toast of this.activeToasts) {
            // Center horizontally
            toast.container.x = (this.app.screen.width - toast.container.width) / 2;
            toast.container.y = offsetY;
            offsetY += toast.container.height + 10;
        }
    }
}
