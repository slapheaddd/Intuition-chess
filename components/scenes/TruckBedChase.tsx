// Spec §6.6. POV: sitting in the open bed of a pickup, facing backward. The board sways
// with the truck (cosmetic, max 2°; pieces never leave their squares). Police chase behind,
// lights flashing red and blue; the road rushes away. Strobes, tail lights, streetlights.
import { SCENE_TUNING } from "@/config/chess.config";
import { building, car, lamp, mix, pc } from "./kit";
import type { SceneDef } from "./types";

const T = SCENE_TUNING.truck;
const paint = pc("ruby", 0.55);
const policeBlue = pc("deepBlue", 2.6);

export const truckBedChase: SceneDef = {
  id: "truck",
  label: "Truck-bed chase",
  anchor: [0, 0.98, 0],
  sky: { top: pc("black"), bottom: pc("deepBlue", 0.85) },
  fog: { color: pc("deepBlue", 0.26), near: 25, far: 160 },
  light: {
    color: mix("deepBlue", "blindingWhite", 0.6), intensity: 0.8, azimuthDeg: 30, elevationDeg: 40,
    hemiSky: pc("deepBlue", 1.5), hemiGround: pc("deepGrey"), hemiIntensity: 0.45,
  },
  lights: [
    { pos: [0, 2.2, -10], color: pc("ruby", 1.6), intensity: T.strobe, range: 22, flash: { hz: T.strobeHz, phase: 0 } },
    { pos: [0, 2.2, -10], color: policeBlue, intensity: T.strobe, range: 22, flash: { hz: T.strobeHz, phase: 0.5 } },
    { pos: [0, 1.25, -1.4], color: pc("ruby"), intensity: 0.7, range: 2.5 },                         // our tail lights
    { pos: [2.5, 5.5, 0], color: mix("orange", "blindingWhite", 0.3), intensity: T.streetLight, range: 12,
      sweep: { axis: "z", from: 10, to: -20, hz: T.speedMps / 30 } },
  ],
  props: [
    { shape: { plane: [14, 420] }, pos: [-1.8, 0, -150], color: pc("deepGrey", 0.4), shadow: false },
    { shape: { plane: [160, 420] }, pos: [0, -0.02, -150], color: mix("green", "black", 0.8, 0.5), shadow: false },
    { shape: { box: [0.12, 0.01, 420] }, pos: [1.5, 0.005, -150], color: pc("blindingWhite", 0.6), shadow: false },
    { shape: { box: [0.12, 0.01, 420] }, pos: [-5.1, 0.005, -150], color: pc("blindingWhite", 0.6), shadow: false },
    // The pickup: bed, sides, tailgate, cab.
    { shape: { box: [1.9, 0.55, 5] }, pos: [0, 0.6, 1.0], color: paint, rough: 0.35, metal: 0.5 },
    { shape: { box: [1.7, 0.06, 2.5] }, pos: [0, 0.93, 0.05], color: pc("deepGrey", 0.9), metal: 0.4 },
    { shape: { box: [0.07, 0.32, 2.5] }, pos: [-0.88, 1.12, 0.05], color: paint, rough: 0.35, metal: 0.5 },
    { shape: { box: [0.07, 0.32, 2.5] }, pos: [0.88, 1.12, 0.05], color: paint, rough: 0.35, metal: 0.5 },
    // Tailgate folded down (open bed), so we see the road and the chase behind.
    { shape: { box: [1.7, 0.06, 0.5] }, pos: [0, 0.92, -1.45], color: paint, rough: 0.35, metal: 0.5 },
    { shape: { box: [1.9, 1.2, 1.6] }, pos: [0, 1.55, 2.15], color: paint, rough: 0.35, metal: 0.5 },
    { shape: { box: [1.3, 0.45, 0.03] }, pos: [0, 1.75, 1.34], color: pc("deepBlue", 0.5), rough: 0.1, metal: 0.8 },
    { shape: { box: [0.1, 0.26, 0.05] }, pos: [-0.88, 1.05, -1.22], color: pc("ruby"), glow: 4, shadow: false },
    { shape: { box: [0.1, 0.26, 0.05] }, pos: [0.88, 1.05, -1.22], color: pc("ruby"), glow: 4, shadow: false },
    ...[-1, 1].flatMap((sx) => [-0.6, 2.7].map((z) => (
      { shape: { cyl: [0.38, 0.38, 0.28], facets: 8 }, pos: [sx * 0.95, 0.38, z], rot: [0, 0, 90], color: pc("black") }))) as SceneDef["props"],
    // The police, weaving behind.
    car({ pos: [-1.0, 0, -9], facingPlusZ: true, body: pc("black"), police: true, headGlow: 9,
      anim: { kind: "slide", axis: "x", amp: T.policeWeaveM, hz: 0.18 } }),
    car({ pos: [1.7, 0, -15], facingPlusZ: true, body: pc("black"), police: true, headGlow: 9,
      anim: { kind: "slide", axis: "x", amp: T.policeWeaveM, hz: 0.15, phase: 0.5 } }),
  ],
  movers: [
    { prop: { shape: { box: [0.12, 0.01, 2] }, pos: [-1.8, 0.006, 0], color: pc("blindingWhite", 0.7), shadow: false },
      speed: -T.speedMps, spacing: 6, count: 60, from: -330 },
    { prop: lamp(3.4, -1), speed: -T.speedMps, spacing: 30, count: 12, from: -330 },
    { prop: building(13, 6, 11, 14, 3), speed: -T.speedMps, spacing: 22, count: 15, from: -320 },
    { prop: building(-17, 7, 14, 16, 4), speed: -T.speedMps, spacing: 26, count: 13, from: -328 },
  ],
  boardSway: { maxDeg: T.swayMaxDeg, hz: T.swayHz },
};
