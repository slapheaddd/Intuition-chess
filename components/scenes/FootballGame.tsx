// Spec §6.3. POV: seated in the stands at a packed football game; board on the
// player's lap. Field in the background, blurred. Crowd moves. Floodlights + warm crowd glow.
import { SCENE_TUNING } from "@/config/chess.config";
import { mix, pc, person, skin } from "./kit";
import type { Prop, SceneDef } from "./types";

const T = SCENE_TUNING.football;
const SHIRTS = [pc("ruby"), pc("blindingWhite", 0.8), pc("deepBlue", 1.6), pc("orange", 0.8), pc("green", 0.6), pc("rustyPurple"), pc("pink", 0.7)];

// Steep concrete steps: k = 0 is our row; each row in front is 0.6 m lower and 0.9 m nearer the field,
// so the heads in front sit below our lap.
const RISE = 0.6, FIELD_Y = -6.5;
const steps: Prop[] = Array.from({ length: 10 }, (_, k) => ({
  shape: { box: [26, RISE, 0.9] }, pos: [0, -RISE * k - RISE / 2, 0.15 - 0.9 * k], color: pc("deepGrey", 1.1), shadow: false,
}));
const fieldLines: Prop[] = [
  ...Array.from({ length: 11 }, (_, i) => ({ shape: { box: [0.15, 0.02, 64] }, pos: [-50 + i * 10, FIELD_Y + 0.01, -44], color: pc("blindingWhite", 0.8), shadow: false } as Prop)),
  { shape: { box: [104, 0.02, 0.15] }, pos: [0, FIELD_Y + 0.01, -12], color: pc("blindingWhite", 0.8), shadow: false },
  { shape: { box: [104, 0.02, 0.15] }, pos: [0, FIELD_Y + 0.01, -76], color: pc("blindingWhite", 0.8), shadow: false },
];
const players: Prop[] = Array.from({ length: 10 }, (_, i) => ({
  pos: [-30 + i * 6.5, FIELD_Y, -30 - (i % 4) * 9],
  anim: { kind: "slide", axis: "x", amp: 3 + (i % 3), hz: 0.07 + (i % 5) * 0.02, phase: i * 0.13 },
  children: [person({ pos: [0, 0, 0], shirt: i % 2 ? pc("ruby") : pc("blindingWhite", 0.9), pants: pc("black"), skin: skin(i) })],
}));
const tower = (x: number, z: number): Prop => ({
  pos: [x, FIELD_Y, z],
  children: [
    { shape: { cyl: [0.4, 0.7, 34], facets: 6 }, pos: [0, 17, 0], color: pc("deepGrey", 1.2), shadow: false },
    { shape: { box: [7, 3.5, 0.5] }, pos: [0, 34, 0], rot: [-20, x > 0 ? -35 : 35, 0], color: pc("blindingWhite"), glow: 7, shadow: false },
  ],
});
const neighbours: Prop[] = [-1.35, -0.72, 0.72, 1.35].map((x, i) =>
  person({ pos: [x, 0, 0.18], seated: true, shirt: SHIRTS[(i * 3) % SHIRTS.length], pants: pc("deepBlue", 0.9), skin: skin(i + 1), hair: pc("black"), arms: "down" }));

export const footballGame: SceneDef = {
  id: "football",
  label: "Football game",
  anchor: [0, 0.66, 0],
  sky: { top: pc("black"), bottom: pc("deepBlue", 0.7) },
  fog: { color: pc("rustyPurple", 0.3), near: 60, far: 260 },
  light: {
    color: mix("blindingWhite", "deepBlue", 0.1), intensity: T.floodlights, azimuthDeg: 330, elevationDeg: 50,   // floodlights behind us light the crowd
    hemiSky: pc("deepBlue", 1.4), hemiGround: pc("orange", 0.7), hemiIntensity: T.crowdGlow,
  },
  props: [
    ...steps,
    { shape: { plane: [110, 70] }, pos: [0, FIELD_Y, -44], color: pc("green", 0.4), shadow: false },
    ...fieldLines,
    ...players,
    // Far stand across the field: a slope the far crowd sits on.
    { shape: { box: [150, 0.5, 22] }, pos: [0, FIELD_Y + 3.2, -90], rot: [-33.7, 0, 0], color: pc("deepGrey", 0.8), shadow: false },
    tower(-62, -8), tower(62, -8), tower(-62, -84), tower(62, -84),
    // Our lap: thighs under the board.
    { shape: { box: [0.15, 0.14, 0.45] }, pos: [-0.11, 0.56, -0.02], color: pc("deepBlue", 0.9) },
    { shape: { box: [0.15, 0.14, 0.45] }, pos: [0.11, 0.56, -0.02], color: pc("deepBlue", 0.9) },
    { shape: { box: [26, 0.08, 0.4] }, pos: [0, 0.45, 0.25], color: pc("rustyPurple", 0.7), shadow: false },  // our row's bench
    ...neighbours,
  ],
  crowd: [
    // Our stand. The board lines up between two people in the row in front.
    { origin: [-8.99, -0.35, -0.75], rows: 8, cols: 31, spacing: [0.62, 0.9], rowRise: -RISE,
      shirts: SHIRTS, skin: skin(0), bobM: T.crowdBobM, hz: T.crowdHz },
    // The packed far stand across the field.
    { origin: [-60, FIELD_Y + 0.4, -82], rows: 14, cols: 80, spacing: [1.5, 0.9], rowRise: RISE,
      shirts: SHIRTS, skin: skin(1), bobM: T.crowdBobM * 3, hz: T.crowdHz },
  ],
  depthOfField: true,
};
