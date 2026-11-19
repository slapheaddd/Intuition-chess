// The data shape every scene is made of (Spec §6.1, §12: one config object per scene,
// fed into the single SceneFrame -- no scene gets its own code path).
// Units are metres. The board sits at `anchor`; "forward" (away from White) is -z.
import type { SCENES } from "@/config/chess.config";

export type SceneId = (typeof SCENES)[number];
export type Vec3 = [number, number, number];

export type Shape =
  | { box: Vec3 }                                         // width, height, depth
  | { cyl: [number, number, number]; facets?: number }    // radius top, radius bottom, height
  | { ball: number; detail?: number }                     // low-poly sphere radius
  | { plane: [number, number] };                          // width, length (lies flat)

export interface Anim {
  kind: "bob" | "sway" | "slide" | "flash" | "spin";
  axis?: "x" | "y" | "z";
  amp?: number;        // metres (bob/slide) or degrees (sway/spin per second)
  hz?: number;
  phase?: number;      // 0..1
}

export interface Prop {
  shape?: Shape;
  pos?: Vec3;
  rot?: Vec3;          // degrees
  color?: string;
  glow?: number;       // emissive strength (>1 blooms)
  rough?: number;
  metal?: number;
  opacity?: number;
  shadow?: boolean;    // cast shadows (default true; big surfaces turn it off)
  anim?: Anim;
  children?: Prop[];
}

/** Copies of a prop that stream past along z, forever (road dashes, lamp posts, traffic). */
export interface Mover { prop: Prop; speed: number; spacing: number; count: number; from: number }

/** Instanced crowd of simple people in rows, bobbing (football stands). */
export interface Crowd {
  origin: Vec3; rows: number; cols: number; spacing: [number, number]; rowRise: number;
  shirts: string[]; skin: string; bobM: number; hz: number; glow?: number;
}

/** Instanced particles: wind streaks, fireflies, drifting fog patches. */
export interface Particles {
  kind: "streak" | "dot" | "haze";
  count: number; min: Vec3; max: Vec3;
  velocity: Vec3;       // m/s; particles wrap around inside min..max
  size: number;         // metres (streak length / dot radius / haze width)
  color: string; glow: number;
  wobble?: number; blinkHz?: number; opacity?: number;
}

export interface SceneLight {
  pos: Vec3; color: string; intensity: number; range: number;
  flash?: { hz: number; phase?: number };                  // on/off strobe
  sweep?: { axis: "x" | "z"; from: number; to: number; hz: number };  // passes over and over
}

export interface SceneDef {
  id: Exclude<SceneId, "space">;
  label: string;
  anchor: Vec3;                                          // board surface position in the scene
  sky: { top: string; bottom: string };
  fog?: { color: string; near: number; far: number };    // metres
  /** Lighting override: replaces the space sunlight (§6.1: own direction + colour temperature). */
  light: {
    color: string; intensity: number; azimuthDeg: number; elevationDeg: number;
    hemiSky: string; hemiGround: string; hemiIntensity: number;
  };
  lights?: SceneLight[];
  props: Prop[];
  movers?: Mover[];
  crowd?: Crowd[];
  particles?: Particles[];
  depthOfField?: boolean;                                // §6.3 / §6.4
  boardSway?: { maxDeg: number; hz: number };            // §6.6, cosmetic only
}
