/**
 * TileDeck - Cosmic Frontier tile deck
 * 
 * Order: ALL Tier 1 first → ALL Tier 2 → Final Tile (LAST)
 * Total: 40 T1 + 20 T2 + 1 Final = 61 tiles
 */

export type ResourceMap = {
    biomass?: number;   // 🧬
    materials?: number; // 🧱
    alloys?: number;    // ⚙
};

export type TileTemplate = {
    tier: number;
    resources: ResourceMap;
    enemyHp: number; // Total HP of local threat
    blockedEdges: number[]; // Which edges are blocked (0-5, before rotation)
    isFinalTile?: boolean;
};

export class TileDeck {
    private deck: TileTemplate[] = [];
    private currentIndex = 0;

    constructor() {
        this.initializeDeck();
        this.shuffle();
    }

    private initializeDeck() {
        // ===== TIER 1 (40 tiles) =====
        // Simple tiles: 1 resource, 2 HP threat

        // 🧬 Biomass - 13 tiles
        for (let i = 0; i < 13; i++) {
            this.deck.push({
                tier: 1,
                resources: { biomass: 1 },
                enemyHp: 2,
                blockedEdges: this.randomBlockedEdges(1),
            });
        }

        // 🧱 Materials - 13 tiles
        for (let i = 0; i < 13; i++) {
            this.deck.push({
                tier: 1,
                resources: { materials: 1 },
                enemyHp: 2,
                blockedEdges: this.randomBlockedEdges(1),
            });
        }

        // ⚙ Alloys - 14 tiles
        for (let i = 0; i < 14; i++) {
            this.deck.push({
                tier: 1,
                resources: { alloys: 1 },
                enemyHp: 2,
                blockedEdges: this.randomBlockedEdges(1),
            });
        }

        // ===== TIER 2 (20 tiles) =====
        // Complex tiles: 2-3 resources, 4 HP threat

        // 🧬+🧱 (Biomass + Materials) - 5 tiles
        for (let i = 0; i < 5; i++) {
            this.deck.push({
                tier: 2,
                resources: { biomass: 1, materials: 1 },
                enemyHp: 4,
                blockedEdges: this.randomBlockedEdges(2),
            });
        }

        // 🧬+⚙ (Biomass + Alloys) - 5 tiles
        for (let i = 0; i < 5; i++) {
            this.deck.push({
                tier: 2,
                resources: { biomass: 1, alloys: 1 },
                enemyHp: 4,
                blockedEdges: this.randomBlockedEdges(2),
            });
        }

        // 🧱+⚙ (Materials + Alloys) - 5 tiles
        for (let i = 0; i < 5; i++) {
            this.deck.push({
                tier: 2,
                resources: { materials: 1, alloys: 1 },
                enemyHp: 4,
                blockedEdges: this.randomBlockedEdges(2),
            });
        }

        // Rich deposits (3x single resource) - 5 tiles
        this.deck.push({
            tier: 2,
            resources: { biomass: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { biomass: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { materials: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { materials: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { alloys: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
    }

    private randomBlockedEdges(tier: number): number[] {
        // Tier 1: 0-2 blocked edges
        // Tier 2: 1-3 blocked edges
        const minBlocked = tier === 1 ? 0 : 1;
        const maxBlocked = tier === 1 ? 2 : 3;

        const count = Math.floor(Math.random() * (maxBlocked - minBlocked + 1)) + minBlocked;
        const blocked: number[] = [];

        while (blocked.length < count) {
            const edge = Math.floor(Math.random() * 6);
            if (!blocked.includes(edge)) {
                blocked.push(edge);
            }
        }

        return blocked;
    }

    private shuffle() {
        // Separate Tier 1 and Tier 2
        const tier1 = this.deck.filter(t => t.tier === 1);
        const tier2 = this.deck.filter(t => t.tier === 2 && !t.isFinalTile);

        // Fisher-Yates shuffle for each tier
        this.shuffleArray(tier1);
        this.shuffleArray(tier2);

        // Final Tile - always last!
        const finalTile: TileTemplate = {
            tier: 3,
            resources: {}, // Final Tile has no resources (Final Threat instead)
            enemyHp: 0, // Final Threat is tracked separately (40 HP)
            blockedEdges: [], // No blocked edges - can enter from any side
            isFinalTile: true,
        };

        // Assemble deck: Tier 1, then Tier 2, then Final Tile
        this.deck = [...tier1, ...tier2, finalTile];
    }

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawTile(): TileTemplate | null {
        if (this.currentIndex >= this.deck.length) {
            return null;
        }

        const tile = this.deck[this.currentIndex];
        this.currentIndex++;
        return tile;
    }

    peekNextTile(): TileTemplate | null {
        if (this.currentIndex >= this.deck.length) {
            return null;
        }

        return this.deck[this.currentIndex];
    }

    getRemainingCount(): number {
        return this.deck.length - this.currentIndex;
    }

    getTier1Remaining(): number {
        return this.deck.slice(this.currentIndex).filter(t => t.tier === 1).length;
    }

    getTier2Remaining(): number {
        return this.deck.slice(this.currentIndex).filter(t => t.tier === 2).length;
    }

    hasFinalTile(): boolean {
        return this.deck.slice(this.currentIndex).some(t => t.isFinalTile);
    }
}
