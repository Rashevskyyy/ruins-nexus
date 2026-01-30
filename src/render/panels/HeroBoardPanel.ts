import * as PIXI from "pixi.js";
import { HeroBoardHeaderSection } from "./heroBoard/HeroBoardHeaderSection";
import { HeroBoardModulesSection } from "./heroBoard/HeroBoardModulesSection";
import { HeroBoardPrestigeSection } from "./heroBoard/HeroBoardPrestigeSection";
import { HeroBoardResourcesSection } from "./heroBoard/HeroBoardResourcesSection";
import { HeroBoardEquipmentSection } from "./heroBoard/HeroBoardEquipmentSection";
import type { HeroBoardContext } from "./heroBoard/HeroBoardTypes";
import { HeroBoardAbilitiesSection } from "./heroBoard/HeroBoardAbilitiesSection";
import { HeroBoardModuleSlotsSection } from "./heroBoard/HeroBoardModuleSlotsSection";
import { HeroBoardActionsSection } from "./heroBoard/HeroBoardActionsSection";
import type { Player } from "../../entities/Player";

export class HeroBoardPanel {
    private headerSection = new HeroBoardHeaderSection();
    private prestigeSection = new HeroBoardPrestigeSection();
    private resourcesSection = new HeroBoardResourcesSection();
    private equipmentSection = new HeroBoardEquipmentSection();
    private moduleSlotsSection = new HeroBoardModuleSlotsSection();
    private modulesSection = new HeroBoardModulesSection();
    private abilitiesSection = new HeroBoardAbilitiesSection();
    private actionsSection = new HeroBoardActionsSection();

    render({ app, game, layer, playerColors, playerIndex }: HeroBoardContext): void {
        const p = game.state.players[playerIndex];
        if (!p) return;

        const playerColor = playerColors[playerIndex % playerColors.length];
        const isAtBase = game.isInOwnBase();
        const hasComponents = p.components >= 1;

        layer.removeChildren();

        const panelW = 300;
        const { moduleOrder, builtModules } = this.modulesSection.getModuleState(p.modules);
        const modulesSectionHeight = this.modulesSection.getSectionHeight(builtModules.length);
        const abilitiesSectionHeight = this.abilitiesSection.getSectionHeight({
            panelW,
            raceId: p.raceId,
            raceOption: p.raceOption,
        });
        const headerHeight = this.headerSection.getSectionHeight();
        const equipmentSectionHeight = this.equipmentSection.getSectionHeight();
        const moduleSlotsHeight = this.moduleSlotsSection.getSectionHeight(p.inventory.spells.length);
        const actionsHeight = this.actionsSection.getSectionHeight();
        const basePanelHeight =
            headerHeight
            + abilitiesSectionHeight
            + this.prestigeSection.getSectionHeight()
            + this.resourcesSection.getSectionHeight()
            + equipmentSectionHeight
            + moduleSlotsHeight
            + modulesSectionHeight
            + actionsHeight;
        const panelH = basePanelHeight + 16;
        const panelX = app.renderer.width - panelW - 40;
        const panelY = 70;

        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x0a1015, alpha: 0.96 });
        bg.stroke({ color: 0x1a2a3a, width: 1 });
        layer.addChild(bg);

        const powerRange = this.calculatePowerRange(p);
        const powerValue = powerRange.min === powerRange.max
            ? `${powerRange.max}`
            : `${powerRange.min}-${powerRange.max}`;

        this.headerSection.render({
            layer,
            panelX,
            panelY,
            panelW,
            headerHeight,
            playerColor,
            playerId: p.id,
            raceId: p.raceId,
            heroClass: "Commander",
            powerValue,
        });

        let y = panelY + headerHeight;
        const leftX = panelX + 14;
        const rightX = panelX + panelW - 14;

        y = this.abilitiesSection.render({
            layer,
            leftX,
            panelW,
            y,
            raceId: p.raceId,
            raceOption: p.raceOption,
        });

        y = this.prestigeSection.render({
            layer,
            leftX,
            rightX,
            panelW,
            y,
            prestige: p.prestige,
        });

        y = this.resourcesSection.render({ layer, leftX, y, panelW, player: p });

        y = this.equipmentSection.render({
            layer,
            leftX,
            rightX,
            panelW,
            y,
            inventory: p.inventory,
            totalSlots: 5,
        });

        y = this.moduleSlotsSection.render({
            layer,
            leftX,
            rightX,
            panelW,
            y,
            inventory: p.inventory,
        });

        this.modulesSection.render({
            layer,
            leftX,
            rightX,
            panelW,
            y,
            moduleOrder,
            builtModules,
        });

        y += modulesSectionHeight;

        this.actionsSection.render({
            layer,
            leftX,
            panelW,
            y,
            canCraft: isAtBase && hasComponents,
            canBuild: Boolean(p.basePosition),
        });
    }

    private calculatePowerRange(player: Player): { min: number; max: number } {
        let units = 0;
        let modules = 0;
        let weapons = 0;
        let race = 0;

        for (const unit of player.units) {
            if (!unit) continue;
            if (unit.type === "assault") units += 1;
        }

        if (player.modules.includes("AssaultBay")) modules += 1;

        for (const weapon of player.inventory.weapons) {
            if (!weapon) continue;
            if (weapon.effectId === "blaster_core") weapons += 1;
            if (weapon.effectId === "shock_blade") weapons += 1;
            if (weapon.effectId === "plasma_edge") weapons += 2;
            if (weapon.effectId === "heavy_cannon") weapons += 3;
            if (weapon.effectId === "arc_rifle") weapons += Math.min(player.tilesMovedThisTurn, 3);
            if (weapon.effectId === "void_launcher") weapons += 2;
        }

        if (player.inventory.amulet?.effectId === "core_relic") {
            weapons += 1;
        }

        if (player.raceId === "warbound") race += 1;
        if (player.raceId === "warbound" && player.raceOption === "A") race += 1;

        const baseMin = 0;
        const baseMax = 3;
        const bonusTotal = units + modules + weapons + race;
        return { min: baseMin + bonusTotal, max: baseMax + bonusTotal };
    }
}
