// Spec §6.2. POV: behind the rider on a moving motorcycle, looking over their shoulder.
// Board on a tray strapped to the seat. Road streams past, wind streaks. Night:
// oncoming headlights, warm streetlights, cool sky. No audio.
import { SCENE_TUNING } from "@/config/chess.config";
import { building, car, lamp, mix, pc, person, skin } from "./kit";
import type { SceneDef } from "./types";

const T = SCENE_TUNING.motorcycle;

export const motorcycle: SceneDef = {
  id: "motorcycle",
  label: "Motorcycle",
  anchor: [0, 0.98, 0],
  sky: { top: pc("black"), bottom: pc("deepBlue", 0.9) },
  fog: { color: pc("deepBlue", 0.28), near: 20, far: 150 },
  light: {
    color: mix("deepBlue", "blindingWhite", 0.6), intensity: T.moon, azimuthDeg: 25, elevationDeg: 40,
    hemiSky: pc("deepBlue", 1.6), hemiGround: pc("deepGrey"), hemiIntensity: 0.5,
  },
  lights: [
    { pos: [2.4, 5.5, 0], color: mix("orange", "blindingWhite", 0.3), intensity: T.streetLight, range: 12,
      sweep: { axis: "z", from: -20, to: 10, hz: T.speedMps / 28 } },
    { pos: [-3, 0.9, 0], color: pc("blindingWhite"), intensity: T.oncomingLight, range: 9,
      sweep: { axis: "z", from: -60, to: 8, hz: T.oncomingMps / 90 } },
  ],
  props: [
    { shape: { plane: [14, 420] }, pos: [-1.8, 0, -150], color: pc("deepGrey", 0.4), shadow: false },
    { shape: { plane: [160, 420] }, pos: [0, -0.02, -150], color: mix("green", "black", 0.8, 0.5), shadow: false },
    { shape: { box: [0.12, 0.01, 420] }, pos: [1.5, 0.005, -150], color: pc("blindingWhite", 0.6), shadow: false },
    { shape: { box: [0.12, 0.01, 420] }, pos: [-5.1, 0.005, -150], color: pc("blindingWhite", 0.6), shadow: false },
    // The motorcycle.
    { shape: { box: [0.32, 0.1, 0.95] }, pos: [0, 0.83, -0.15], color: pc("black"), rough: 0.5 },
    { shape: { box: [0.38, 0.24, 0.5] }, pos: [0, 1.0, -0.85], color: pc("ruby", 0.8), rough: 0.2, metal: 0.6 },
    { shape: { box: [0.3, 0.35, 1.3] }, pos: [0, 0.55, -0.4], color: pc("deepGrey", 0.9), metal: 0.6 },
    { shape: { box: [0.78, 0.04, 0.04] }, pos: [0, 1.15, -1.05], color: pc("deepGrey", 1.5), metal: 0.8 },
    { shape: { cyl: [0.03, 0.03, 0.8], facets: 6 }, pos: [0, 0.75, -1.15], rot: [-25, 0, 0], color: pc("deepGrey", 1.5), metal: 0.8 },
    { shape: { cyl: [0.11, 0.09, 0.08], facets: 8 }, pos: [0, 1.0, -1.3], rot: [90, 0, 0], color: pc("blindingWhite"), glow: 5 },
    { shape: { cyl: [0.33, 0.33, 0.12], facets: 10 }, pos: [0, 0.33, -1.35], rot: [0, 0, 90], color: pc("black") },
    { shape: { cyl: [0.33, 0.33, 0.14], facets: 10 }, pos: [0, 0.33, 0.7], rot: [0, 0, 90], color: pc("black") },
    { shape: { cyl: [0.05, 0.06, 0.8], facets: 6 }, pos: [0.22, 0.45, 0.35], rot: [80, 0, 0], color: pc("deepGrey", 1.6), metal: 0.9 },
    // The tray the board is strapped to.
    { shape: { box: [0.54, 0.025, 0.54] }, pos: [0, 0.955, 0], color: pc("deepGrey", 0.8), metal: 0.3 },
    { shape: { box: [0.04, 0.14, 0.62] }, pos: [-0.2, 0.89, 0], color: pc("black") },
    { shape: { box: [0.04, 0.14, 0.62] }, pos: [0.2, 0.89, 0], color: pc("black") },
    // The rider, seen from behind and a little to the left, so we look past their shoulder.
    person({ pos: [-0.3, 0.38, -0.55], rotY: -8, seated: true, shirt: mix("deepGrey", "rustyPurple", 0.4, 1.8), pants: pc("deepBlue", 1.1),
      skin: skin(0), helmet: pc("ruby", 0.9), arms: "forward" }),
  ],
  movers: [
    { prop: { shape: { box: [0.12, 0.01, 2] }, pos: [-1.8, 0.006, 0], color: pc("blindingWhite", 0.7), shadow: false },
      speed: T.speedMps, spacing: 6, count: 60, from: -340 },
    { prop: lamp(3.2, -1), speed: T.speedMps, spacing: 28, count: 12, from: -316 },
    { prop: building(13, 6, 11, 14, 1), speed: T.speedMps, spacing: 22, count: 15, from: -310 },
    { prop: building(-17, 7, 14, 16, 2), speed: T.speedMps, spacing: 26, count: 13, from: -318 },
    { prop: car({ pos: [-3.6, 0, 0], facingPlusZ: true, body: pc("rustyPurple", 0.9), headGlow: 9 }),
      speed: T.oncomingMps, spacing: 90, count: 5, from: -420 },
  ],
  particles: [
    { kind: "streak", count: T.windStreaks, min: [-1.5, 0.9, -5], max: [1.5, 2.3, 1.5], velocity: [0, 0, 30],
      size: 0.7, color: pc("blindingWhite"), glow: 0.6, opacity: 0.35 },
  ],
};
