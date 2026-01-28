import type { HexCoord } from "./Hex";
import { hexKey, addHex } from "./Hex";
import { EDGE_DIRECTIONS } from "./HexEdges";
import type { Tile } from "./Tile";
import { TileType } from "./TileTypes";
import type { ResourceMap } from "./TileDeck";

/**
 * Random resource for starting sectors
 */
function getRandomStartingResource(): ResourceMap {
    const roll = Math.random();
    if (roll < 0.4) {
        return { biomass: 1 };
    } else if (roll < 0.8) {
        return { materials: 1 };
    } else {
        return { alloys: 1 };
    }
}

type StartingSectorConfig = {
    resources: ResourceMap;
    encounterActive?: boolean;
    monsterTier?: number;
    enemyHp?: number;
    componentBonus?: number;
};

function getStartingSectorConfig(): StartingSectorConfig {
    const roll = Math.random();
    const resources = getRandomStartingResource();

    if (roll < 0.25) {
        const richResourceKey = Object.keys(resources)[0] as keyof ResourceMap;
        const richResources: ResourceMap = {};
        richResources[richResourceKey] = 2;
        return { resources: richResources };
    }

    if (roll < 0.4) {
        return {
            resources: { biomass: 1, materials: 1, alloys: 1 },
            encounterActive: true,
            monsterTier: 2,
            enemyHp: 2,
        };
    }

    if (roll < 0.5) {
        return {
            resources,
            componentBonus: 1,
        };
    }

    return { resources };
}

/**
 * Fisher-Yates shuffle for randomizing positions
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Get random edge indices for player count
 * Players are placed evenly around the hub, but which specific edges are randomized
 */
function getRandomSectorEdges(playerCount: number): number[] {
    // All 6 possible edge positions
    const allEdges = [0, 1, 2, 3, 4, 5];
    const shuffled = shuffleArray(allEdges);
    // Take first N edges for N players
    return shuffled.slice(0, playerCount);
}

export class Board {
    private tiles = new Map<string, Tile>();

    getTile(coord: HexCoord): Tile | undefined {
        return this.tiles.get(hexKey(coord));
    }

    setTile(tile: Tile): void {
        this.tiles.set(hexKey(tile.coord), tile);
    }

    getAllTiles(): Tile[] {
        return [...this.tiles.values()];
    }

    /**
     * Replace all tiles with the given array (for server sync)
     */
    replaceAllTiles(tiles: Tile[]): void {
        this.tiles.clear();
        for (const tile of tiles) {
            this.tiles.set(hexKey(tile.coord), tile);
        }
    }

    /**
     * Legacy: Create board with just Landing Hub (for backward compatibility)
     */
    static createInitial(): Board {
        return Board.createForGame(4); // Default to 4 players
    }

    /**
     * v0.5: Create initial board with:
     * - Landing Hub in center (shared)
     * - Starting Sectors around Hub (1 per player, randomized positions)
     * - NO fog tiles at start (only player sectors + hub)
     */
    static createForGame(playerCount: number): Board {
        const board = new Board();
        const center: HexCoord = { q: 0, r: 0 };

        // 1. Landing Hub in center (shared trading hub)
        board.setTile({
            coord: center,
            discovered: true,
            type: TileType.LandingHub,
            // No resources on hub - it's for trading only
        });

        // 2. Get RANDOM edge indices for this player count
        const sectorEdges = getRandomSectorEdges(playerCount);

        // 3. Place Starting Sectors for each player (randomized positions!)
        for (let i = 0; i < playerCount; i++) {
            const edgeIndex = sectorEdges[i];
            const direction = EDGE_DIRECTIONS[edgeIndex];
            const sectorCoord = addHex(center, direction);
            const startingSector = getStartingSectorConfig();

            board.setTile({
                coord: sectorCoord,
                discovered: true,
                type: TileType.StartingSector,
                sectorPlayerId: `P${i + 1}`, // Home zone for this player (NOT a base!)
                resources: startingSector.resources,
                componentBonus: startingSector.componentBonus,
                encounterActive: startingSector.encounterActive ?? false,
                monsterTier: startingSector.monsterTier,
                enemyHp: startingSector.enemyHp,
            });
        }

        // No fog tiles at start - only hub + player sectors
        // Fog appears dynamically when players explore

        return board;
    }

    /**
     * Get starting positions from an existing board (reads sectorPlayerId from tiles)
     * Must be called AFTER createForGame() to get the same random positions
     */
    static getStartingPositions(playerCount: number, board?: Board): HexCoord[] {
        // If board provided, extract positions from StartingSector tiles
        if (board) {
            const positions: HexCoord[] = new Array(playerCount).fill(null);
            
            for (const tile of board.getAllTiles()) {
                if (tile.type === TileType.StartingSector && tile.sectorPlayerId) {
                    // Extract player index from "P1", "P2", etc.
                    const playerIndex = parseInt(tile.sectorPlayerId.replace("P", "")) - 1;
                    if (playerIndex >= 0 && playerIndex < playerCount) {
                        positions[playerIndex] = tile.coord;
                    }
                }
            }
            
            return positions;
        }
        
        // Fallback: generate new random positions (for legacy calls)
        const center: HexCoord = { q: 0, r: 0 };
        const sectorEdges = getRandomSectorEdges(playerCount);
        
        const positions: HexCoord[] = [];
        for (let i = 0; i < playerCount; i++) {
            const edgeIndex = sectorEdges[i];
            const direction = EDGE_DIRECTIONS[edgeIndex];
            positions.push(addHex(center, direction));
        }
        
        return positions;
    }
}
