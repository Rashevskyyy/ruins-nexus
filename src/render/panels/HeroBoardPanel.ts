import * as PIXI from "pixi.js";
import { HeroBoardHeaderSection } from "./heroBoard/HeroBoardHeaderSection";
import { HeroBoardModulesSection } from "./heroBoard/HeroBoardModulesSection";
import { HeroBoardPrestigeSection } from "./heroBoard/HeroBoardPrestigeSection";
import { HeroBoardResourcesSection } from "./heroBoard/HeroBoardResourcesSection";
import { HeroBoardEquipmentSection } from "./heroBoard/HeroBoardEquipmentSection";
import type { HeroBoardContext } from "./heroBoard/HeroBoardTypes";
import { HeroBoardAbilitiesSection } from "./heroBoard/HeroBoardAbilitiesSection";
import { HeroBoardModuleSlotsSection } from "./heroBoard/HeroBoardModuleSlotsSection";
import { HeroBoardUnitsSection } from "./heroBoard/HeroBoardUnitsSection";
import type { Player } from "../../entities/Player";
import { HeroBoardTooltip } from "./heroBoard/HeroBoardTooltip";

export class HeroBoardPanel {
    private headerSection = new HeroBoardHeaderSection();
    private abilitiesSection = new HeroBoardAbilitiesSection();
    private resourcesSection = new HeroBoardResourcesSection();
    private prestigeSection = new HeroBoardPrestigeSection();
    private equipmentSection = new HeroBoardEquipmentSection();
    private moduleSlotsSection = new HeroBoardModuleSlotsSection();
    private modulesSection = new HeroBoardModulesSection();
    private unitsSection = new HeroBoardUnitsSection();

    render({ app, game, layer, playerColors, playerIndex }: HeroBoardContext): void {
        const p = game.state.players[playerIndex];
        if (!p) return;

        const playerColor = playerColors[playerIndex % playerColors.length];

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
        const resourcesSectionHeight = this.resourcesSection.getSectionHeight();
        const prestigeSectionHeight = this.prestigeSection.getSectionHeight();
        const equipmentSectionHeight = this.equipmentSection.getSectionHeight();
        const moduleSlotsHeight = this.moduleSlotsSection.getSectionHeight(p.inventory.spells.length);
        const unitsSectionHeight = this.unitsSection.getSectionHeight();
        const basePanelHeight =
            headerHeight
            + abilitiesSectionHeight
            + resourcesSectionHeight
            + prestigeSectionHeight
            + equipmentSectionHeight
            + moduleSlotsHeight
            + modulesSectionHeight
            + unitsSectionHeight;
        const panelH = basePanelHeight;
        const panelX = app.renderer.width - panelW - 40;
        const panelY = 70;

        // Main panel background with gradient effect
        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x0a1015, alpha: 0.98 });
        bg.stroke({ color: 0x1a2a3a, width: 1 });
        layer.addChild(bg);

        const powerRange = this.calculatePowerRange(p);
        const powerValue = powerRange.min === powerRange.max
            ? `${powerRange.max}`
            : `${powerRange.min}-${powerRange.max}`;
        const tooltip = new HeroBoardTooltip(layer, app);
        
        // Set hero board boundaries for tooltip positioning
        tooltip.setBoardBounds(panelX, panelY, panelW);

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
            tooltip,
        });

        let y = panelY + headerHeight;
        const leftX = panelX + 16;
        const rightX = panelX + panelW - 16;

        // Race Ability section
        y = this.abilitiesSection.render({
            layer,
            panelX,
            leftX,
            panelW,
            y,
            raceId: p.raceId,
            raceOption: p.raceOption,
            tooltip,
        });

        // Resources section
        y = this.resourcesSection.render({ layer, panelX, leftX, y, panelW, player: p, tooltip });

        // Prestige section
        y = this.prestigeSection.render({
            layer,
            panelX,
            leftX,
            rightX,
            panelW,
            y,
            prestige: p.prestige,
            tooltip,
        });

        // Equipment section
        y = this.equipmentSection.render({
            layer,
            panelX,
            leftX,
            rightX,
            panelW,
            y,
            inventory: p.inventory,
            totalSlots: 5,
            tooltip,
        });

        // Modules section
        y = this.moduleSlotsSection.render({
            layer,
            panelX,
            leftX,
            rightX,
            panelW,
            y,
            inventory: p.inventory,
            tooltip,
        });

        // Base Modules section
        y = this.modulesSection.render({
            layer,
            panelX,
            leftX,
            rightX,
            panelW,
            y,
            moduleOrder,
            builtModules,
            tooltip,
        });

        // Combat Units section
        this.unitsSection.render({
            layer,
            panelX,
            leftX,
            rightX,
            panelW,
            y,
            units: p.units,
            tooltip,
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
