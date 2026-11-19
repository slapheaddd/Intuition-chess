// Spec §6.5. POV: sitting on a log at the edge of a swamp; board on a flat stump beside
// the player. Murky water, hanging moss, fireflies, fog rolling low. Dusk: warm orange
// light through the trees, green reflections off the water.
import { SCENE_TUNING } from "@/config/chess.config";
import { mix, pc, tree } from "./kit";
import type { Prop, SceneDef } from "./types";

const T = SCENE_TUNING.swamp;
const leaf = mix("green", "black", 0.7, 0.8);
const moss = mix("green", "deepGrey", 0.6, 0.9);

const reeds: Prop[] = Array.from({ length: 22 }, (_, i) => {
  const x = -7 + i * 0.65 + Math.sin(i * 7.3) * 0.25, z = -2.6 - Math.abs(Math.sin(i * 3.1)) * 1.2, h = 0.9 + (i % 4) * 0.25;
  return {
    pos: [x, 0, z], anim: { kind: "sway", axis: "x", amp: 4, hz: 0.3 + (i % 5) * 0.04, phase: i * 0.17 },
    children: [
      { shape: { cyl: [0.01, 0.015, h], facets: 4 }, pos: [0, h / 2, 0], color: mix("green", "orange", 0.3, 0.45), shadow: false },
      ...(i % 3 === 0 ? [{ shape: { cyl: [0.03, 0.03, 0.18], facets: 6 }, pos: [0, h, 0], color: mix("rustyPurple", "orange", 0.4, 0.5) } as Prop] : []),
    ],
  };
});
const pads: Prop[] = Array.from({ length: 14 }, (_, i) => (
  { shape: { cyl: [0.22 + (i % 3) * 0.06, 0.22 + (i % 3) * 0.06, 0.01], facets: 7 }, pos: [-5 + (i * 1.7) % 11, -0.14, -4 - (i * 2.3) % 9],
    color: mix("green", "black", 0.5, 0.7), shadow: false } as Prop));

export const swamp: SceneDef = {
  id: "swamp",
  label: "Swamp",
  anchor: [0, 0.48, 0],
  sky: { top: mix("deepBlue", "rustyPurple", 0.4, 0.9), bottom: mix("orange", "pink", 0.4, 0.6) },
  fog: { color: mix("pink", "rustyPurple", 0.6, 0.35), near: 10, far: 90 },
  light: {
    color: pc("orange"), intensity: T.sunset, azimuthDeg: 200, elevationDeg: 9,
    hemiSky: pc("pink", 0.6), hemiGround: pc("green", 0.25), hemiIntensity: 0.6,
  },
  lights: [
    { pos: [0, 0.05, -2.6], color: pc("green"), intensity: T.waterGreen, range: 4 },     // green bounce off the water
  ],
  props: [
    { shape: { plane: [34, 14] }, pos: [0, 0, 4], color: mix("deepGrey", "rustyPurple", 0.3, 0.6), shadow: false },
    { shape: { plane: [140, 140] }, pos: [0, -0.15, -66], color: mix("deepBlue", "green", 0.4, 0.45), rough: 0.65, metal: 0.1, shadow: false },   // murky: a soft sun path, not a mirror
    { shape: { cyl: [0.34, 0.4, 0.48], facets: 9 }, pos: [0, 0.24, 0], color: mix("orange", "deepGrey", 0.6, 0.6) },
    { shape: { cyl: [0.2, 0.2, 0.005], facets: 9 }, pos: [0, 0.481, 0], color: mix("orange", "deepGrey", 0.4, 0.7), shadow: false },
    { shape: { cyl: [0.22, 0.24, 2.6], facets: 8 }, pos: [0.55, 0.22, 0.8], rot: [0, 10, 90], color: mix("rustyPurple", "deepGrey", 0.5, 0.6) },
    tree([-6, 0, -8], 7, leaf, moss), tree([5, 0, -12], 8, leaf, moss), tree([-10, -0.15, -20], 9, leaf, moss),
    tree([9, 0, -4], 6, leaf, moss), tree([-4.5, 0, 4], 7, leaf, moss), tree([12, -0.15, -25], 10, leaf, moss),
    tree([1, -0.15, -30], 9, leaf, moss), tree([-16, -0.15, -9], 8, leaf, moss), tree([7, 0, 5], 7, leaf, moss),
    ...reeds, ...pads,
  ],
  particles: [
    { kind: "dot", count: T.fireflies, min: [-6, 0.3, -9], max: [6, 2.6, 2.5], velocity: [0.05, 0.02, 0],
      size: 0.025, color: mix("green", "orange", 0.45), glow: 5, wobble: 0.4, blinkHz: 0.35 },
    { kind: "haze", count: 16, min: [-16, 0.05, -28], max: [16, 0.45, 1], velocity: [T.fogDriftMps, 0, 0.05],
      size: 7, color: mix("pink", "blindingWhite", 0.3), glow: 0.22, opacity: 0.45 },
  ],
};
