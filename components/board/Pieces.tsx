// Low-poly pieces, rim light. Spec §3.4.
// Lathe silhouettes with few radial segments + flat shading = faceted surfaces.
// White: blinding white, faint glow. Black: dark with ruby/purple glow.
"use client";
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BOARD, CAMERA, PIECES, PIECE_RIM } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import type { PieceType, PieceView } from "@/shared/chess";
import { squareToXZ } from "./coords";

// Silhouettes as [radius, height] in piece units (scaled by PIECES.scale).
const PROFILES: Record<Exclude<PieceType, "n">, [number, number][]> = {
  p: [[0, 0], [0.85, 0], [0.85, 0.15], [0.65, 0.25], [0.45, 0.35], [0.3, 0.75], [0.42, 0.85], [0.3, 0.95], [0.4, 1.1], [0.42, 1.25], [0.35, 1.4], [0.2, 1.48], [0, 1.5]],
  r: [[0, 0], [0.9, 0], [0.9, 0.15], [0.7, 0.28], [0.55, 0.4], [0.5, 1.3], [0.7, 1.4], [0.7, 1.75], [0.5, 1.75], [0.5, 1.6], [0, 1.6]],
  b: [[0, 0], [0.85, 0], [0.85, 0.15], [0.65, 0.27], [0.45, 0.4], [0.3, 1.15], [0.5, 1.25], [0.3, 1.35], [0.45, 1.6], [0.38, 1.85], [0.15, 2.0], [0.12, 2.08], [0, 2.1]],
  q: [[0, 0], [0.92, 0], [0.92, 0.15], [0.7, 0.28], [0.5, 0.45], [0.32, 1.4], [0.58, 1.5], [0.35, 1.6], [0.6, 2.1], [0.4, 2.15], [0.2, 2.25], [0.14, 2.35], [0, 2.38]],
  k: [[0, 0], [0.95, 0], [0.95, 0.15], [0.72, 0.28], [0.52, 0.45], [0.35, 1.5], [0.6, 1.6], [0.38, 1.7], [0.55, 2.2], [0, 2.25]],
};
const KNIGHT_BASE: [number, number][] = [[0, 0], [0.88, 0], [0.88, 0.15], [0.68, 0.28], [0.55, 0.4], [0.5, 0.5], [0, 0.5]];
// Side view of the head; +x is the direction the knight faces.
const KNIGHT_HEAD: [number, number][] = [[-0.45, 0.45], [0.45, 0.45], [0.35, 0.9], [0.75, 1.25], [0.8, 1.5], [0.45, 1.65], [0.15, 1.95], [-0.05, 1.8], [-0.35, 1.7], [-0.5, 1.3], [-0.45, 0.9]];

function lathe(profile: [number, number][]) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), PIECES.radialSegments);
}

let geoCache: Record<PieceType, THREE.BufferGeometry[]> | null = null;
function geometries() {
  if (geoCache) return geoCache;
  const head = new THREE.ExtrudeGeometry(new THREE.Shape(KNIGHT_HEAD.map(([x, y]) => new THREE.Vector2(x, y))), {
    depth: 0.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 1,
  });
  head.translate(0, 0, -0.3);
  const crossV = new THREE.BoxGeometry(0.16, 0.5, 0.16).translate(0, 2.45, 0);
  const crossH = new THREE.BoxGeometry(0.42, 0.14, 0.16).translate(0, 2.5, 0);
  geoCache = {
    p: [lathe(PROFILES.p)], r: [lathe(PROFILES.r)], b: [lathe(PROFILES.b)], q: [lathe(PROFILES.q)],
    k: [lathe(PROFILES.k), crossV, crossH],
    n: [lathe(KNIGHT_BASE), head],
  };
  return geoCache;
}

/** Physical (clearcoat) material with a fresnel rim light so pieces read against the board (§3.3, §3.4). */
function rimMaterial(params: THREE.MeshPhysicalMaterialParameters, rim: string, power: number, strength: number) {
  const m = new THREE.MeshPhysicalMaterial({ ...params, clearcoat: PIECE_RIM.clearcoat, clearcoatRoughness: PIECE_RIM.clearcoatRoughness });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: new THREE.Color(rim) };
    shader.uniforms.uRimPower = { value: power };
    shader.uniforms.uRimStrength = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec3 uRimColor; uniform float uRimPower; uniform float uRimStrength;\nvoid main() {")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), uRimPower);
        totalEmissiveRadiance += uRimColor * rimF * uRimStrength;`);
  };
  return m;
}

export default function Pieces({ pieces, onSquareTap }: { pieces: PieceView[]; onSquareTap: (square: string) => void }) {
  const geos = useMemo(geometries, []);
  const mats = useMemo(() => ({
    w: rimMaterial({
      color: PALETTE.blindingWhite, emissive: PALETTE.blindingWhite, emissiveIntensity: PIECES.whiteGlow,
      roughness: 0.3, metalness: 0.1, flatShading: true,
    }, PALETTE.matrixGreen, PIECE_RIM.whitePower, PIECE_RIM.whiteStrength),
    b: rimMaterial({
      color: PALETTE.deepGrey, emissive: PALETTE.ruby, emissiveIntensity: PIECES.blackGlow,
      roughness: 0.25, metalness: 0.5, flatShading: true,
    }, PALETTE.ruby, PIECE_RIM.blackPower, PIECE_RIM.blackStrength),
  }), []);

  return (
    <group>
      {pieces.map((p) => {
        const [x, z] = squareToXZ(p.square);
        const tap = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < CAMERA.tapThresholdPx) onSquareTap(p.square); };
        return (
          <group key={`${p.square}-${p.color}${p.type}`} position={[x, BOARD.tileHeight, z]}
            rotation={[0, p.color === "w" ? Math.PI / 2 : -Math.PI / 2, 0]} scale={PIECES.scale} onClick={tap}>
            {geos[p.type].map((g, i) => (
              <mesh key={i} geometry={g} material={mats[p.color]} castShadow receiveShadow />
            ))}
          </group>
        );
      })}
    </group>
  );
}
