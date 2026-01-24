// Система колоды тайлов (как в Караке)
// 40 Tier 1 (простые) + 20 Tier 2 (сложные) + 1 Final Tile

export type ResourceMap = {
    Provisions?: number;
    Timber?: number;
    Iron?: number;
};

export type TileTemplate = {
    tier: number;
    resources: ResourceMap;
    enemyHp: number; // Total HP монстров на тайле
    blockedEdges: number[]; // Какие грани заблокированы (0-5, до rotation)
    isFinalTile?: boolean; // Финальный тайл - триггерит Final Phase
};

export class TileDeck {
    private deck: TileTemplate[] = [];
    private currentIndex = 0;

    constructor() {
        this.initializeDeck();
        this.shuffle();
    }

    private initializeDeck() {
        // ===== TIER 1 (40 тайлов) =====
        // Простые тайлы: 1 ресурс, 1 монстр (2 HP)
        
        // Farm (🍖) - 13 штук
        for (let i = 0; i < 13; i++) {
            this.deck.push({
                tier: 1,
                resources: { Provisions: 1 },
                enemyHp: 2,
                blockedEdges: this.randomBlockedEdges(1), // 0-2 горы
            });
        }

        // Forest (🪵) - 13 штук
        for (let i = 0; i < 13; i++) {
            this.deck.push({
                tier: 1,
                resources: { Timber: 1 },
                enemyHp: 2,
                blockedEdges: this.randomBlockedEdges(1),
            });
        }

        // Rock (⚙️) - 14 штук
        for (let i = 0; i < 14; i++) {
            this.deck.push({
                tier: 1,
                resources: { Iron: 1 },
                enemyHp: 2,
                blockedEdges: this.randomBlockedEdges(1),
            });
        }

        // ===== TIER 2 (20 тайлов) =====
        // Сложные тайлы: 2-3 ресурса, 2 монстра (4 HP)

        // Farm + Forest (🍖+🪵) - 5 штук
        for (let i = 0; i < 5; i++) {
            this.deck.push({
                tier: 2,
                resources: { Provisions: 1, Timber: 1 },
                enemyHp: 4,
                blockedEdges: this.randomBlockedEdges(2),
            });
        }

        // Farm + Rock (🍖+⚙️) - 5 штук
        for (let i = 0; i < 5; i++) {
            this.deck.push({
                tier: 2,
                resources: { Provisions: 1, Iron: 1 },
                enemyHp: 4,
                blockedEdges: this.randomBlockedEdges(2),
            });
        }

        // Forest + Rock (🪵+⚙️) - 5 штук
        for (let i = 0; i < 5; i++) {
            this.deck.push({
                tier: 2,
                resources: { Timber: 1, Iron: 1 },
                enemyHp: 4,
                blockedEdges: this.randomBlockedEdges(2),
            });
        }

        // Big Resources (3x) - 5 штук (распределены равномерно)
        this.deck.push({
            tier: 2,
            resources: { Provisions: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { Provisions: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { Timber: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { Timber: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
        this.deck.push({
            tier: 2,
            resources: { Iron: 3 },
            enemyHp: 4,
            blockedEdges: this.randomBlockedEdges(2),
        });
    }

    private randomBlockedEdges(tier: number): number[] {
        // Tier 1: 0-2 заблокированные грани
        // Tier 2: 1-3 заблокированные грани
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
        // Разделяем на Tier 1 и Tier 2
        const tier1 = this.deck.filter(t => t.tier === 1);
        const tier2 = this.deck.filter(t => t.tier === 2 && !t.isFinalTile);
        
        // Fisher-Yates shuffle для каждого tier отдельно
        this.shuffleArray(tier1);
        this.shuffleArray(tier2);
        
        // Final Tile - всегда последний в колоде!
        const finalTile: TileTemplate = {
            tier: 3, // Tier 3 = финальный
            resources: { Provisions: 2, Timber: 2, Iron: 2 }, // Богатый тайл
            enemyHp: 6, // Сильный монстр
            blockedEdges: [], // Нет гор - можно зайти с любой стороны
            isFinalTile: true,
        };
        
        // Собираем колоду: Tier 1, потом Tier 2, потом Final Tile
        this.deck = [...tier1, ...tier2, finalTile];
    }
    
    private shuffleArray<T>(array: T[]): void {
        // Fisher-Yates shuffle in-place
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawTile(): TileTemplate | null {
        if (this.currentIndex >= this.deck.length) {
            return null; // Колода кончилась
        }
        
        const tile = this.deck[this.currentIndex];
        this.currentIndex++;
        return tile;
    }

    /**
     * Подсмотреть следующий тайл без вытягивания
     * Для preview при размещении
     */
    peekNextTile(): TileTemplate | null {
        if (this.currentIndex >= this.deck.length) {
            return null; // Колода кончилась
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
}
