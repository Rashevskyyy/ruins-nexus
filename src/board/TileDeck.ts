/**
 * TileDeck - Cosmic Frontier v0.5
 * 
 * Order: ALL Tier 1 first → ALL Tier 2 (with Final Tile shuffled in)
 * Total: 20 T1 + 10 T2 + 1 Final = 31 tiles
 * 
 * Monster Tier = HP (deterministic assignment)
 * 
 * v0.4: Added 3 Risky Tiles (2 T1, 1 T2)
 * v0.5: Risky tiles count configurable via Game Modifiers
 */

export type ResourceMap = {
    biomass?: number;   // 🧬
    materials?: number; // 🧱
    alloys?: number;    // ⚙
};

// Token types for rewards
export type TokenType = "CommonLoot" | "UncommonLoot" | "SpellToken" | "Medkit" | "Legendary";

export type MonsterType = "standard" | "hunter" | "guardian";

// Risky tile effects (v0.4)
export type RiskyEffect = "toxic" | "unstable" | "rift";

// All available risky effects
const RISKY_EFFECTS: RiskyEffect[] = ["toxic", "unstable", "rift"];

export type TileTemplate = {
    tier: number;           // Tile tier (1, 2, or 3 for Final)
    resources: ResourceMap;
    monsterTier: number;    // Monster tier (1-4, determines HP and rewards)
    monsterType: MonsterType;
    enemyHp: number;        // Monster HP = monsterTier
    blockedEdges: number[]; // Which edges are blocked (0-5, before rotation)
    isFinalTile?: boolean;
    rewards?: TokenType[];  // Deterministic rewards for defeating monster
    riskyEffect?: RiskyEffect; // v0.4: Risky tile effect
};

export class TileDeck {
    private deck: TileTemplate[] = [];
    private currentIndex = 0;
    
    // v0.5: Configurable risky tiles count
    private riskyT1Count: number;
    private riskyT2Count: number;

    /**
     * @param riskyT1Count - Number of risky Tier 1 tiles (default: 2)
     * @param riskyT2Count - Number of risky Tier 2 tiles (default: 1)
     */
    constructor(riskyT1Count: number = 2, riskyT2Count: number = 1) {
        this.riskyT1Count = riskyT1Count;
        this.riskyT2Count = riskyT2Count;
        this.initializeDeck();
        this.shuffle();
    }

    private initializeDeck() {
        // ===== TIER 1 TILES (20 total) =====
        // 1 resource each, monster tier 1 or 2
        
        // Calculate normal tiles (total 20 = 12 T1M1 + 8 T1M2, minus risky)
        const normalT1M1Count = 12 - this.riskyT1Count;
        
        // First 12 tiles → Monster Tier 1 (HP 1)
        this.addTier1Tiles(normalT1M1Count, 1, ["CommonLoot"]);
        
        // Risky T1 tiles with Monster Tier 1
        for (let i = 0; i < this.riskyT1Count; i++) {
            const effect = RISKY_EFFECTS[i % RISKY_EFFECTS.length];
            this.addRiskyTier1Tile(effect, 1, ["CommonLoot"]);
        }
        
        // Next 8 tiles → Monster Tier 2 (HP 2)
        this.addTier1Tiles(8, 2, ["CommonLoot", "Medkit"]);

        // ===== TIER 2 TILES (10 total) =====
        // 2-3 resources each, monster tier 3 or 4
        
        // Calculate normal T2M3 tiles (total 6, minus risky)
        const normalT2M3Count = 6 - this.riskyT2Count;
        
        // First 6 tiles → Monster Tier 3 (HP 3)
        this.addTier2Tiles(normalT2M3Count, 3, ["UncommonLoot"]);
        
        // Risky T2 tiles with Monster Tier 3
        for (let i = 0; i < this.riskyT2Count; i++) {
            const effect = RISKY_EFFECTS[(i + this.riskyT1Count) % RISKY_EFFECTS.length];
            this.addRiskyTier2Tile(effect, 3, ["UncommonLoot"]);
        }
        
        // Next 4 tiles → Monster Tier 4 (HP 4)
        this.addTier2Tiles(4, 4, ["UncommonLoot", "SpellToken"]);
    }

    private addTier1Tiles(count: number, monsterTier: number, rewards: TokenType[]) {
        const resourceTypes: Array<keyof ResourceMap> = ["biomass", "materials", "alloys"];
        
        for (let i = 0; i < count; i++) {
            const resourceType = resourceTypes[i % 3];
            const resources: ResourceMap = {};
            resources[resourceType] = 1;
            
            this.deck.push({
                tier: 1,
                resources,
                monsterTier,
                monsterType: this.generateMonsterType(monsterTier),
                enemyHp: monsterTier, // HP = Tier
                blockedEdges: this.randomBlockedEdges(1),
                rewards: [...rewards],
            });
        }
    }

    private addTier2Tiles(count: number, monsterTier: number, rewards: TokenType[]) {
        // Mixed resource combinations for Tier 2
        const resourceCombos: ResourceMap[] = [
            { biomass: 1, materials: 1 },
            { biomass: 1, alloys: 1 },
            { materials: 1, alloys: 1 },
            { biomass: 2, materials: 1 },
            { materials: 2, alloys: 1 },
            { alloys: 2, biomass: 1 },
        ];
        
        for (let i = 0; i < count; i++) {
            const resources = { ...resourceCombos[i % resourceCombos.length] };
            
            this.deck.push({
                tier: 2,
                resources,
                monsterTier,
                monsterType: this.generateMonsterType(monsterTier),
                enemyHp: monsterTier, // HP = Tier
                blockedEdges: this.randomBlockedEdges(2),
                rewards: [...rewards],
            });
        }
    }

    private addRiskyTier1Tile(effect: RiskyEffect, monsterTier: number, rewards: TokenType[]) {
        const resourceTypes: Array<keyof ResourceMap> = ["biomass", "materials", "alloys"];
        const resourceType = resourceTypes[Math.floor(Math.random() * 3)];
        const resources: ResourceMap = {};
        resources[resourceType] = 1;
        
        this.deck.push({
            tier: 1,
            resources,
            monsterTier,
            monsterType: this.generateMonsterType(monsterTier),
            enemyHp: monsterTier,
            blockedEdges: this.randomBlockedEdges(1),
            rewards: [...rewards],
            riskyEffect: effect,
        });
    }

    private addRiskyTier2Tile(effect: RiskyEffect, monsterTier: number, rewards: TokenType[]) {
        const resourceCombos: ResourceMap[] = [
            { biomass: 1, materials: 1 },
            { biomass: 1, alloys: 1 },
            { materials: 1, alloys: 1 },
        ];
        const resources = { ...resourceCombos[Math.floor(Math.random() * 3)] };
        
        this.deck.push({
            tier: 2,
            resources,
            monsterTier,
            monsterType: this.generateMonsterType(monsterTier),
            enemyHp: monsterTier,
            blockedEdges: this.randomBlockedEdges(2),
            rewards: [...rewards],
            riskyEffect: effect,
        });
    }

    private generateMonsterType(monsterTier: number): MonsterType {
        const tier = Math.max(1, Math.min(4, monsterTier));
        const roll = Math.random() * 100;
        const guardianChance = 10 + (tier - 1) * 5; // 10%, 15%, 20%, 25%
        const hunterChance = 20 + (tier - 1) * 5; // 20%, 25%, 30%, 35%

        if (roll < guardianChance) return "guardian";
        if (roll < guardianChance + hunterChance) return "hunter";
        return "standard";
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
        const tier2 = this.deck.filter(t => t.tier === 2);

        // Fisher-Yates shuffle for each tier
        this.shuffleArray(tier1);
        this.shuffleArray(tier2);

        // Final Tile - shuffled INTO Tier 2 (not at the end!)
        // This creates randomness - Final Tile can appear anytime during Tier 2 exploration
        const finalTile: TileTemplate = {
            tier: 3,
            resources: {}, // Final Tile has no resources (Final Threat instead)
            monsterTier: 6, // Final Threat tier
            monsterType: "standard",
            enemyHp: 0, // Final Threat is tracked separately (40 HP)
            blockedEdges: [], // No blocked edges - can enter from any side
            isFinalTile: true,
            rewards: ["Legendary"],
        };

        // Insert Final Tile at random position within Tier 2
        const insertIndex = Math.floor(Math.random() * (tier2.length + 1));
        tier2.splice(insertIndex, 0, finalTile);

        // Assemble deck: ALL Tier 1, then Tier 2 (with Final Tile shuffled in)
        this.deck = [...tier1, ...tier2];
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

    // ========================================
    // SERIALIZATION (for multiplayer sync)
    // ========================================

    serialize(): { deck: TileTemplate[]; currentIndex: number } {
        return {
            deck: this.deck,
            currentIndex: this.currentIndex,
        };
    }

    static deserialize(data: { deck: TileTemplate[]; currentIndex: number }): TileDeck {
        const tileDeck = new TileDeck();
        tileDeck.deck = data.deck;
        tileDeck.currentIndex = data.currentIndex;
        return tileDeck;
    }

    // Restore state from serialized data (mutates this instance)
    restoreFrom(data: { deck: TileTemplate[]; currentIndex: number }): void {
        this.deck = data.deck;
        this.currentIndex = data.currentIndex;
    }
}
