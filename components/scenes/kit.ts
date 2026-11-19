// Reusable low-poly prop builders for scene configs. They only return data (Prop trees);
// SceneFrame draws them. Every colour comes from the cosmic palette (§3.2), shaded.
import { PALETTE } from "@/config/palette";
import type { Prop, Vec3 } from "./types";

type Key = keyof typeof PALETTE;

/** Palette colour, scaled brighter (>1) or darker (<1). */
export function pc(key: Key, k = 1): string {
  return scaleHex(PALETTE[key], k);
}
/** Mix two palette colours (t = 0..1 towards b), then scale. */
export function mix(a: Key, b: Key, t: number, k = 1): string {
  const ca = parse(PALETTE[a]), cb = parse(PALETTE[b]);
  return scaleHex(toHex(ca.map((v, i) => v + (cb[i] - v) * t) as Vec3), k);
}
function parse(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]: Vec3) {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}
function scaleHex(hex: string, k: number) {
  return toHex(parse(hex).map((v) => v * k) as Vec3);
}

const SKIN = [mix("orange", "pink", 0.4, 0.75), mix("orange", "rustyPurple", 0.5, 0.55), mix("orange", "deepGrey", 0.55, 0.45)];
export const skin = (i: number) => SKIN[i % SKIN.length];

export interface PersonOpts {
  pos: Vec3; rotY?: number; seated?: boolean; seatH?: number;
  shirt: string; pants: string; skin: string; hair?: string; helmet?: string;
  arms?: "down" | "forward" | "write";  writeHz?: number;
}

/** A simple person facing -z (their back is towards White's side by default). */
export function person(o: PersonOpts): Prop {
  const seatH = o.seatH ?? 0.45;
  const hip = o.seated ? seatH + 0.07 : 0.88;
  const legs: Prop[] = o.seated
    ? [-0.1, 0.1].flatMap((x) => [
        { shape: { box: [0.15, 0.14, 0.45] }, pos: [x, hip, -0.2], color: o.pants },
        { shape: { box: [0.12, seatH, 0.12] }, pos: [x, seatH / 2, -0.4], color: o.pants },
      ] as Prop[])
    : [-0.1, 0.1].map((x) => ({ shape: { box: [0.14, 0.86, 0.16] }, pos: [x, 0.43, 0], color: o.pants } as Prop));
  const torsoY = hip + 0.3;
  const headY = hip + 0.75;
  const arm = (side: number): Prop => {
    // Positive x-rotation swings an arm forward (towards -z, the way the person faces).
    const rot: Vec3 = o.arms === "forward" ? [62, 0, side * 8] : o.arms === "write" && side > 0 ? [150, 0, 10] : [0, 0, side * 6];
    return {
      pos: [side * 0.25, torsoY + 0.22, 0], rot,
      anim: o.arms === "write" && side > 0 ? { kind: "sway", axis: "z", amp: 12, hz: o.writeHz ?? 0.8 } : undefined,
      children: [
        { shape: { box: [0.1, 0.5, 0.11] }, pos: [0, -0.25, 0], color: o.shirt },
        { shape: { ball: 0.055, detail: 0 }, pos: [0, -0.53, 0], color: o.skin },
      ],
    };
  };
  return {
    pos: o.pos, rot: [0, o.rotY ?? 0, 0],
    children: [
      ...legs,
      { shape: { box: [0.42, 0.6, 0.25] }, pos: [0, torsoY, 0], color: o.shirt },
      { shape: { cyl: [0.06, 0.07, 0.1], facets: 6 }, pos: [0, hip + 0.63, 0], color: o.skin },
      { shape: { ball: 0.12, detail: 1 }, pos: [0, headY, 0], color: o.skin },
      o.helmet
        ? { shape: { ball: 0.16, detail: 1 }, pos: [0, headY + 0.02, 0.01], color: o.helmet, rough: 0.2, metal: 0.4 }
        : { shape: { ball: 0.125, detail: 1 }, pos: [0, headY + 0.035, 0.03], color: o.hair ?? pc("black") },
      arm(-1), arm(1),
    ],
  };
}

export interface CarOpts { pos: Vec3; facingPlusZ?: boolean; body: string; police?: boolean; anim?: Prop["anim"]; headGlow?: number }

/** A low-poly car. By default its front points -z. */
export function car(o: CarOpts): Prop {
  const head = o.headGlow ?? 6;
  const children: Prop[] = [
    { shape: { box: [1.8, 0.55, 4.3] }, pos: [0, 0.6, 0], color: o.body, rough: 0.35, metal: 0.5 },
    { shape: { box: [1.55, 0.5, 2.1] }, pos: [0, 1.12, 0.25], color: o.police ? pc("blindingWhite", 0.7) : o.body, rough: 0.3, metal: 0.4 },
    { shape: { box: [1.45, 0.4, 0.05] }, pos: [0, 1.12, -0.83], rot: [-25, 0, 0], color: pc("deepBlue", 0.5), rough: 0.1, metal: 0.8 },
    ...[-1, 1].flatMap((sx) => [-1.4, 1.4].map((z) => (
      { shape: { cyl: [0.34, 0.34, 0.26], facets: 8 }, pos: [sx * 0.85, 0.34, z], rot: [0, 0, 90], color: pc("black") } as Prop))),
    ...[-0.6, 0.6].map((x) => ({ shape: { box: [0.34, 0.13, 0.05] }, pos: [x, 0.7, -2.16], color: pc("blindingWhite"), glow: head } as Prop)),
    ...[-0.65, 0.65].map((x) => ({ shape: { box: [0.3, 0.12, 0.05] }, pos: [x, 0.75, 2.16], color: pc("ruby"), glow: 3 } as Prop)),
  ];
  if (o.police) {
    children.push(
      { shape: { box: [0.55, 0.12, 0.28] }, pos: [-0.3, 1.43, 0.2], color: pc("ruby"), glow: 8, anim: { kind: "flash", hz: 2.4, phase: 0 } },
      { shape: { box: [0.55, 0.12, 0.28] }, pos: [0.3, 1.43, 0.2], color: pc("deepBlue", 2.2), glow: 14, anim: { kind: "flash", hz: 2.4, phase: 0.5 } },
    );
  }
  return { pos: o.pos, rot: [0, o.facingPlusZ ? 180 : 0, 0], anim: o.anim, children };
}

/** Street lamp. `side` = which way the arm reaches (towards the road). */
export function lamp(x: number, side: 1 | -1, height = 6): Prop {
  return {
    pos: [x, 0, 0],
    children: [
      { shape: { cyl: [0.07, 0.1, height], facets: 6 }, pos: [0, height / 2, 0], color: pc("deepGrey", 0.8), metal: 0.6 },
      { shape: { box: [1.3, 0.08, 0.1] }, pos: [side * 0.6, height, 0], color: pc("deepGrey", 0.8) },
      { shape: { box: [0.4, 0.08, 0.22] }, pos: [side * 1.2, height - 0.08, 0], color: mix("orange", "blindingWhite", 0.4), glow: 6, shadow: false },
    ],
  };
}

export function tree(pos: Vec3, h: number, leaf: string, moss?: string): Prop {
  const strands: Prop[] = moss
    ? [[-0.9, 0.3], [0.7, -0.5], [0.2, 0.9], [-0.4, -0.8], [1.0, 0.4]].map(([x, z], i) => ({
        pos: [x, h * 0.9, z], anim: { kind: "sway", axis: "x", amp: 6, hz: 0.25 + i * 0.03, phase: i * 0.2 },
        children: [{ shape: { cyl: [0.05, 0.01, 1.4 + (i % 3) * 0.4], facets: 4 }, pos: [0, -0.8, 0], color: moss, shadow: false }],
      } as Prop))
    : [];
  return {
    pos,
    children: [
      { shape: { cyl: [0.16, 0.3, h], facets: 6 }, pos: [0, h / 2, 0], color: mix("deepGrey", "rustyPurple", 0.4, 0.7) },
      { shape: { ball: 1.6, detail: 0 }, pos: [0, h * 0.95, 0], color: leaf, shadow: false },
      { shape: { ball: 1.1, detail: 0 }, pos: [0.9, h * 0.85, 0.4], color: leaf, shadow: false },
      ...strands,
    ],
  };
}

export function desk(pos: Vec3, top = mix("orange", "rustyPurple", 0.55, 0.55)): Prop {
  return {
    pos,
    children: [
      { shape: { box: [0.7, 0.04, 0.5] }, pos: [0, 0.73, 0], color: top, rough: 0.6 },
      ...[[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]].map(([x, z]) => (
        { shape: { cyl: [0.018, 0.018, 0.71], facets: 5 }, pos: [x, 0.355, z], color: pc("deepGrey", 1.4), metal: 0.7 } as Prop)),
    ],
  };
}

export function chair(pos: Vec3): Prop {
  return {
    pos,
    children: [
      { shape: { box: [0.42, 0.04, 0.42] }, pos: [0, 0.45, 0], color: pc("deepBlue", 1.2) },
      { shape: { box: [0.42, 0.42, 0.03] }, pos: [0, 0.68, 0.2], color: pc("deepBlue", 1.2) },
      ...[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([x, z]) => (
        { shape: { cyl: [0.015, 0.015, 0.45], facets: 5 }, pos: [x, 0.225, z], color: pc("deepGrey", 1.4), metal: 0.7 } as Prop)),
    ],
  };
}

/** A dark building block with a few lit windows on the side facing the road (x = 0). */
export function building(x: number, w: number, h: number, d: number, seed: number): Prop {
  const rand = (i: number) => { const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return r - Math.floor(r); };
  const face = -Math.sign(x) * (w / 2 + 0.03);
  const windows: Prop[] = Array.from({ length: 7 }, (_, i) => ({
    shape: { box: [0.05, 0.8, 0.6] }, pos: [face, 1.5 + rand(i) * (h - 3), (rand(i + 20) - 0.5) * (d - 1)],
    color: mix("orange", "blindingWhite", 0.3), glow: 1.6, shadow: false,
  } as Prop));
  return { pos: [x, 0, 0], children: [{ shape: { box: [w, h, d] }, pos: [0, h / 2, 0], color: pc("deepGrey", 0.5), shadow: false }, ...windows] };
}
