import { describe, it, expect, beforeEach } from "vitest";
import { SettlementSystem } from "../../src/systems/SettlementSystem";
import type { Player } from "../../src/entities/Player";

describe("SettlementSystem", () => {
    let settlement: SettlementSystem;
    let player: Player;

    beforeEach(() => {
        settlement = new SettlementSystem();
        player = {
            id: "P1",
            name: "Test Player",
            position: { q: 0, r: 0 },
            hp: 5,
            maxHp: 5,
            biomass: 0,
            materials: 0,
            alloys: 0,
            components: 0,
            prestige: 0,
            actionPoints: 2,
            basePosition: null,
            race: null as any,
            inventory: { weapons: [null, null], amulet: null, items: [] },
            unitSlots: [null, null, null],
            prestigeSpentThisRound: 0,
            completedObjectives: [],
        };
    });

    describe("trade", () => {
        it("should convert 2 biomass to 1 alloys", () => {
            player.biomass = 4;
            player.alloys = 0;

            const result = settlement.trade(player);

            expect(result).toBe(true);
            expect(player.biomass).toBe(2);
            expect(player.alloys).toBe(1);
        });

        it("should convert 2 materials to 1 biomass when no biomass available", () => {
            player.biomass = 0;
            player.materials = 4;

            const result = settlement.trade(player);

            expect(result).toBe(true);
            expect(player.materials).toBe(2);
            expect(player.biomass).toBe(1);
        });

        it("should prioritize biomass to alloys trade", () => {
            player.biomass = 2;
            player.materials = 2;
            player.alloys = 0;

            const result = settlement.trade(player);

            expect(result).toBe(true);
            expect(player.biomass).toBe(0);
            expect(player.alloys).toBe(1);
            // Materials should be unchanged
            expect(player.materials).toBe(2);
        });

        it("should return false when no trade possible", () => {
            player.biomass = 1;
            player.materials = 1;

            const result = settlement.trade(player);

            expect(result).toBe(false);
            expect(player.biomass).toBe(1);
            expect(player.materials).toBe(1);
        });

        it("should return false with zero resources", () => {
            player.biomass = 0;
            player.materials = 0;

            const result = settlement.trade(player);

            expect(result).toBe(false);
        });

        it("should allow multiple trades sequentially", () => {
            player.biomass = 6;
            player.alloys = 0;

            settlement.trade(player);
            settlement.trade(player);
            settlement.trade(player);

            expect(player.biomass).toBe(0);
            expect(player.alloys).toBe(3);
        });
    });
});
