// Procedural cosmic textures for the squares. Spec §3.4: dark squares deep grey with
// purple undertones; light squares deep blue with faint star dust; nebula + constellations.
import * as THREE from "three";
import { BOARD } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function paint(light: boolean, seed: number): THREE.CanvasTexture {
  const size = BOARD.textureSize;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const r = rng(seed);

  ctx.fillStyle = light ? PALETTE.deepBlue : PALETTE.deepGrey;
  ctx.fillRect(0, 0, size, size);

  // Nebula haze.
  const hazes = light ? [PALETTE.blindingWhite, PALETTE.pink, PALETTE.rustyPurple] : [PALETTE.rustyPurple, PALETTE.rustyPurple, PALETTE.deepBlue];
  for (let i = 0; i < 5; i++) {
    const x = r() * size, y = r() * size, rad = size * (0.35 + r() * 0.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = hazes[i % hazes.length];
    g.addColorStop(0, hexA(col, light ? 0.16 : 0.32));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  // Star dust / star field.
  const stars = light ? BOARD.starsPerTexture : Math.round(BOARD.starsPerTexture / 3);
  const pts: [number, number][] = [];
  for (let i = 0; i < stars; i++) {
    const x = r() * size, y = r() * size, big = r() > 0.94;
    pts.push([x, y]);
    ctx.fillStyle = hexA(PALETTE.blindingWhite, big ? 0.9 : 0.25 + r() * 0.45);
    ctx.beginPath();
    ctx.arc(x, y, big ? 1.6 : 0.6 + r() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint constellation lines on some tiles.
  if (r() > 0.5) {
    ctx.strokeStyle = hexA(light ? PALETTE.blindingWhite : PALETTE.matrixGreen, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[Math.floor(r() * pts.length)];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let cache: { light: THREE.Texture[]; dark: THREE.Texture[] } | null = null;

export function cosmicTextures() {
  if (!cache) {
    const n = BOARD.textureVariants;
    cache = {
      light: Array.from({ length: n }, (_, i) => paint(true, 101 + i * 7)),
      dark: Array.from({ length: n }, (_, i) => paint(false, 503 + i * 13)),
    };
  }
  return cache;
}
