// A faint glow pool beneath the floating board, reflecting piece colours downward. Spec §4.2.
"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { GLOW_POOL } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function GlowPool() {
  const material = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    // Canvas top = Black's side (far), bottom = White's side (near).
    const blob = (x: number, y: number, r: number, col: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    };
    // Every glow stays inside the texture so the pool fades out softly, with no hard edge.
    blob(128, 128, 126, PALETTE.rustyPurple, 0.5);
    blob(128, 92, 84, PALETTE.ruby, 0.6);
    blob(128, 164, 84, PALETTE.matrixGreen, 0.4);
    blob(128, 170, 56, PALETTE.blindingWhite, 0.2);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      color: new THREE.Color(1, 1, 1).multiplyScalar(GLOW_POOL.strength),
    });
  }, []);
  return (
    <mesh material={material} position={[0, GLOW_POOL.y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[GLOW_POOL.size, GLOW_POOL.size]} />
    </mesh>
  );
}
