// Scene registry (Spec §5.2). Adding a scene = one config object + one line here.
import type { SceneDef, SceneId } from "./types";
import { footballGame } from "./FootballGame";
import { inClass } from "./InClass";
import { motorcycle } from "./Motorcycle";
import { swamp } from "./Swamp";
import { truckBedChase } from "./TruckBedChase";

export const SCENE_DEFS: Record<Exclude<SceneId, "space">, SceneDef> = {
  motorcycle, football: footballGame, class: inClass, swamp, truck: truckBedChase,
};

export const SCENE_LABELS: Record<SceneId, string> = {
  space: "Space", motorcycle: "Motorcycle", football: "Football game", class: "In class", swamp: "Swamp", truck: "Truck-bed chase",
};

export type { SceneDef, SceneId };
