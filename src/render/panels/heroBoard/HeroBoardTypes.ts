import type * as PIXI from "pixi.js";
import type { Game } from "../../../core/Game";
import type { ModuleType } from "../../../entities/BuildingType";
import type { Player } from "../../../entities/Player";
import type { RaceId, RaceOption } from "../../../entities/Race";
import type { Unit } from "../../../entities/Unit";
import type { HeroBoardTooltip } from "./HeroBoardTooltip";

export type HeroBoardContext = {
    app: PIXI.Application;
    game: Game;
    layer: PIXI.Container;
    playerColors: number[];
    playerIndex: number;
};

export type HeroBoardHeaderContext = {
    layer: PIXI.Container;
    panelX: number;
    panelY: number;
    panelW: number;
    headerHeight: number;
};

export type HeroBoardHeaderData = {
    playerColor: number;
    playerId: string;
    raceId: RaceId | null;
    heroClass: string;
    powerValue: string;
    tooltip: HeroBoardTooltip;
};

export type HeroBoardPrestigeContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardPrestigeData = {
    prestige: number;
    tooltip: HeroBoardTooltip;
};

export type HeroBoardAbilitiesContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    panelW: number;
    y: number;
};

export type HeroBoardAbilitiesData = {
    raceId: RaceId | null;
    raceOption: RaceOption | null;
    tooltip: HeroBoardTooltip;
};

export type HeroBoardResourcesContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    panelW: number;
    y: number;
};

export type HeroBoardResourcesData = {
    player: Player;
    tooltip: HeroBoardTooltip;
};

export type HeroBoardEquipmentContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardEquipmentData = {
    inventory: Player["inventory"];
    totalSlots: number;
    tooltip: HeroBoardTooltip;
};

export type HeroBoardModuleSlotsContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardModuleSlotsData = {
    inventory: Player["inventory"];
    tooltip: HeroBoardTooltip;
};

export type HeroBoardUnitsContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardUnitsData = {
    units: Array<Unit | null>;
    tooltip: HeroBoardTooltip;
};

export type HeroBoardModulesContext = {
    layer: PIXI.Container;
    panelX: number;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardModulesData = {
    moduleOrder: ModuleType[];
    builtModules: ModuleType[];
    tooltip: HeroBoardTooltip;
};
