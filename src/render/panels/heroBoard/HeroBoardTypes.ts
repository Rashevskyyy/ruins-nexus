import type * as PIXI from "pixi.js";
import type { Game } from "../../../core/Game";
import type { ModuleType } from "../../../entities/BuildingType";
import type { Player } from "../../../entities/Player";
import type { RaceId, RaceOption } from "../../../entities/Race";
import type { Unit } from "../../../entities/Unit";

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
};

export type HeroBoardPrestigeContext = {
    layer: PIXI.Container;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardPrestigeData = {
    prestige: number;
};

export type HeroBoardAbilitiesContext = {
    layer: PIXI.Container;
    leftX: number;
    panelW: number;
    y: number;
};

export type HeroBoardAbilitiesData = {
    raceId: RaceId | null;
    raceOption: RaceOption | null;
};

export type HeroBoardResourcesContext = {
    layer: PIXI.Container;
    leftX: number;
    panelW: number;
    y: number;
};

export type HeroBoardResourcesData = {
    player: Player;
};

export type HeroBoardEquipmentContext = {
    layer: PIXI.Container;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardEquipmentData = {
    inventory: Player["inventory"];
    isAtBase: boolean;
    hasComponents: boolean;
};

export type HeroBoardUnitsContext = {
    layer: PIXI.Container;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardUnitsData = {
    units: Array<Unit | null>;
};

export type HeroBoardModulesContext = {
    layer: PIXI.Container;
    leftX: number;
    rightX: number;
    panelW: number;
    y: number;
};

export type HeroBoardModulesData = {
    moduleOrder: ModuleType[];
    builtModules: ModuleType[];
};
