import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";

type DeckInfoContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
};

/**
 * v0.6: Tile Deck panel removed - info is now shown in top status bar
 * This panel is kept as empty for backwards compatibility
 */
export class DeckInfoPanel {
    render({ layer }: DeckInfoContext): void {
        layer.removeChildren();
        // v0.6: Tile deck info moved to top status bar progress indicator
        // No separate panel needed
    }
}
