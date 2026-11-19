// Spec §6.4. POV: sitting at a desk in a classroom; board on the desk. A teacher writes
// on the board at the front, other students around. Low-poly, depth-of-field blur.
// Fluorescent overhead lights + daylight from the windows.
import { SCENE_TUNING } from "@/config/chess.config";
import { chair, desk, mix, pc, person, skin } from "./kit";
import type { Prop, SceneDef, Vec3 } from "./types";

const T = SCENE_TUNING.class;
const wall = mix("deepBlue", "blindingWhite", 0.55, 1.0);
const SHIRTS = [pc("ruby", 0.9), pc("green", 0.55), pc("orange", 0.8), pc("rustyPurple", 1.2), pc("pink", 0.7), pc("deepBlue", 1.8), pc("deepGrey", 1.6)];

const student = (x: number, z: number, i: number): Prop[] => [
  desk([x, 0, z]), chair([x, 0, z + 0.45]),
  person({ pos: [x, 0, z + 0.45], seated: true, shirt: SHIRTS[i % SHIRTS.length], pants: pc("deepBlue", 0.9),
    skin: skin(i), hair: i % 3 ? pc("black") : mix("orange", "rustyPurple", 0.6, 0.6) }),
];
const seats: Vec3[] = [[-1.6, 0, 0.05], [1.6, 0, 0.05], [-1.6, 0, -1.7], [1.6, 0, -1.7], [-0.05, 0, -3.4], [-1.6, 0, -3.4], [1.6, 0, -3.4], [3.1, 0, -1.7]];
const lights: Prop[] = [-2.5, 0, 2.5].flatMap((x) => [-6, -3.5, -1].map((z) => (
  { shape: { box: [1.2, 0.04, 0.3] }, pos: [x, 3.17, z], color: pc("blindingWhite"), glow: 3, shadow: false } as Prop)));
const windows: Prop[] = [-6, -3, 0].map((z) => (
  { shape: { box: [0.05, 1.4, 1.7] }, pos: [-4.94, 1.75, z], color: mix("deepBlue", "blindingWhite", 0.75), glow: 2.2, shadow: false } as Prop));
const chalk: Prop[] = Array.from({ length: 9 }, (_, i) => (
  { shape: { box: [0.25 + (i % 4) * 0.2, 0.025, 0.01] }, pos: [-1.5 + (i % 3) * 1.1, 1.95 - Math.floor(i / 3) * 0.3, -7.39],
    rot: [0, 0, (i % 2 ? 1 : -1) * 4], color: pc("blindingWhite", 0.9), glow: 0.4, shadow: false } as Prop));

export const inClass: SceneDef = {
  id: "class",
  label: "In class",
  anchor: [0, 0.75, 0],
  sky: { top: mix("deepBlue", "blindingWhite", 0.6), bottom: mix("deepBlue", "blindingWhite", 0.8) },
  light: {
    color: mix("blindingWhite", "orange", 0.12), intensity: T.daylight, azimuthDeg: -70, elevationDeg: 30,
    hemiSky: pc("blindingWhite", 0.9), hemiGround: pc("deepGrey", 1.5), hemiIntensity: T.fluorescent,
  },
  props: [
    { shape: { plane: [10, 10] }, pos: [0, 0, -2.5], color: mix("rustyPurple", "deepGrey", 0.5, 0.75), shadow: false },
    { shape: { plane: [10, 10] }, pos: [0, 3.2, -2.5], rot: [180, 0, 0], color: pc("deepGrey", 1.6), shadow: false },
    { shape: { box: [10, 3.2, 0.1] }, pos: [0, 1.6, -7.5], color: wall, shadow: false },
    { shape: { box: [10, 3.2, 0.1] }, pos: [0, 1.6, 2.5], color: wall, shadow: false },
    { shape: { box: [0.1, 3.2, 10] }, pos: [-5, 1.6, -2.5], color: wall, shadow: false },
    { shape: { box: [0.1, 3.2, 10] }, pos: [5, 1.6, -2.5], color: wall, shadow: false },
    ...windows, ...lights,
    { shape: { box: [4.2, 1.35, 0.05] }, pos: [0, 1.6, -7.42], color: mix("green", "black", 0.78), rough: 0.9, shadow: false },
    ...chalk,
    desk([-2.6, 0, -5.9]),
    person({ pos: [0.7, 0, -6.95], shirt: pc("rustyPurple", 1.1), pants: pc("deepGrey", 1.2), skin: skin(2), hair: pc("deepGrey", 1.8),
      arms: "write", writeHz: T.teacherWriteHz }),
    desk([0, 0, 0]), chair([0, 0, 0.45]),
    ...seats.flatMap(([x, , z], i) => student(x, z, i)),
  ],
  depthOfField: true,
};
