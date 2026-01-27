import * as PIXI from "pixi.js";
import { HeroBoardHeaderSection } from "./heroBoard/HeroBoardHeaderSection";
import { HeroBoardModulesSection } from "./heroBoard/HeroBoardModulesSection";
import { HeroBoardPrestigeSection } from "./heroBoard/HeroBoardPrestigeSection";
import { HeroBoardResourcesSection } from "./heroBoard/HeroBoardResourcesSection";
import { HeroBoardEquipmentSection } from "./heroBoard/HeroBoardEquipmentSection";
import { HeroBoardUnitsSection } from "./heroBoard/HeroBoardUnitsSection";
import type { HeroBoardContext } from "./heroBoard/HeroBoardTypes";
import { HeroBoardAbilitiesSection } from "./heroBoard/HeroBoardAbilitiesSection";

export class HeroBoardPanel {
    private headerSection = new HeroBoardHeaderSection();
    private prestigeSection = new HeroBoardPrestigeSection();
    private resourcesSection = new HeroBoardResourcesSection();
    private equipmentSection = new HeroBoardEquipmentSection();
    private unitsSection = new HeroBoardUnitsSection();
    private modulesSection = new HeroBoardModulesSection();
    private abilitiesSection = new HeroBoardAbilitiesSection();

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
        const headerHeight = 86;
        const panelH = 360 + headerHeight + modulesSectionHeight + abilitiesSectionHeight;
        const panelX = app.renderer.width - panelW - 20;
        const panelY = 70;

        const bg = new PIXI.Graphics();
        bg.roundRect(panelX, panelY, panelW, panelH, 12);
        bg.fill({ color: 0x0d1117, alpha: 0.96 });
        bg.stroke({ color: playerColor, width: 3 });
        layer.addChild(bg);

        this.headerSection.render({
            layer,
            panelX,
            panelY,
            panelW,
            headerHeight,
            playerColor,
            playerId: p.id,
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
            isAtBase,
            hasComponents,
        });

        y = this.unitsSection.render({ layer, leftX, rightX, panelW, y, units: p.units });

        this.modulesSection.render({
            layer,
            leftX,
            rightX,
            panelW,
            y,
            moduleOrder,
            builtModules,
        });
    }
}
