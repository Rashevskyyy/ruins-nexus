import * as PIXI from "pixi.js";
import type { Game } from "../../core/Game";
import type { HexCoord } from "../../board/Hex";
import { neighbors } from "../../board/Hex";
import type { Tile } from "../../board/Tile";
import { TileType } from "../../board/TileTypes";
import { canMoveBetween } from "../../board/BlockedEdges";

export type TileHoverPreviewOptions = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    isMyTurn: () => boolean;
    hexToScreen: (coord: HexCoord) => { x: number; y: number };
    getHexSize: () => number;
    getZoom: () => number;
};

export class TileHoverPreview {
    private hintContainer: PIXI.Container | null = null;

    constructor(private options: TileHoverPreviewOptions) {}

    public show(coord: HexCoord, tile: Tile | undefined): void {
        const hints = this.getHints(coord, tile);

        if (hints.length > 0) {
            this.render(coord, hints);
        } else {
            this.hide();
        }
    }

    public showForFog(coord: HexCoord): void {
        const hasAP = this.options.game.state.actionPoints >= 1;
        const hasTiles = this.options.game.state.tileDeck.getRemainingCount() > 0;

        if (hasAP && hasTiles) {
            this.render(coord, ["🔭"]);
        }
    }

    public hide(): void {
        if (this.hintContainer) {
            this.options.layer.removeChild(this.hintContainer);
            this.hintContainer.destroy({ children: true });
            this.hintContainer = null;
        }
    }

    private render(coord: HexCoord, hints: string[]): void {
        this.hide();

        const { x: screenX, y: screenY } = this.options.hexToScreen(coord);
        const hexSize = this.options.getHexSize();
        const zoom = this.options.getZoom();

        this.hintContainer = new PIXI.Container();
        this.hintContainer.position.set(screenX, screenY - hexSize * zoom * 0.7);
        this.hintContainer.eventMode = "none";

        // Hint text with icons
        const hintText = new PIXI.Text({
            text: hints.join("  "),
            style: new PIXI.TextStyle({
                fontSize: 26,
                fill: 0xffffff,
            }),
        });
        hintText.anchor.set(0.5);

        // Background pill
        const padding = 10;
        const bg = new PIXI.Graphics();
        bg.roundRect(
            -hintText.width / 2 - padding,
            -hintText.height / 2 - padding / 2,
            hintText.width + padding * 2,
            hintText.height + padding,
            16
        );
        bg.fill({ color: 0x000000, alpha: 0.75 });
        bg.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });

        this.hintContainer.addChild(bg);
        this.hintContainer.addChild(hintText);
        this.options.layer.addChild(this.hintContainer);
    }

    private getHints(coord: HexCoord, tile: Tile | undefined): string[] {
        const hints: string[] = [];
        const player = this.options.game.state.players[this.options.game.state.currentPlayerIndex];
        const hasAP = this.options.game.state.actionPoints >= 1;
        const actionUsed = this.options.game.state.actionUsedInCurrentSlot;

        const isOnTile = player.position.q === coord.q && player.position.r === coord.r;
        const isNeighbor = neighbors(player.position).some(n => n.q === coord.q && n.r === coord.r);

        if (!tile || !tile.discovered) {
            return hints;
        }

        // Neighbor tile - can move or attack
        if (!isOnTile && isNeighbor && !actionUsed) {
            const playerTile = this.options.game.state.board.getTile(player.position);
            const canMove = playerTile && canMoveBetween(playerTile, coord, tile);

            if (canMove) {
                if (tile.encounterActive) {
                    hints.push("⚔️");
                } else {
                    hints.push("👆");
                }
            }
            return hints;
        }

        // Player on tile
        if (isOnTile) {
            const isInOwnBase = this.options.game.isInOwnBase();
            const isOwnedByOther = tile.ownerId && tile.ownerId !== player.id;

            // Gather
            const hasResources = tile.resources && (
                (tile.resources.biomass ?? 0) > 0 ||
                (tile.resources.materials ?? 0) > 0 ||
                (tile.resources.alloys ?? 0) > 0
            );

            if (hasResources && !tile.encounterActive && !isOwnedByOther) {
                const onCooldown = tile.cooldownUntilRoundByPlayer?.[player.id]
                    ? tile.cooldownUntilRoundByPlayer[player.id] > this.options.game.state.round
                    : false;

                if (hasAP && !onCooldown) {
                    hints.push("⊕");
                }
            }

            // Heal
            if (player.hp < player.maxHp && hasAP) {
                hints.push("❤️");
            }

            // Trade
            if (tile.type === TileType.LandingHub && hasAP) {
                hints.push("🔄");
            }

            // Build base
            if (this.options.game.canBuildBase() && hasAP && player.materials >= 2) {
                hints.push("🏠");
            }

            // Base actions
            if (isInOwnBase && hasAP) {
                hints.push("🏗️");
                if (this.options.game.canCraft()) {
                    hints.push("🔧");
                }
            }
        }

        return hints;
    }
}
