// Board + cosmic squares. Spec §3.4.
// Faceted (chamfered) tiles with cosmic textures, low-poly bevelled frame.
"use client";
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { BOARD, CAMERA } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { ALL_SQUARES, FILES, isLightSquare, squareToXZ } from "./coords";
import { cosmicTextures } from "./cosmicTextures";

const S = BOARD.squareSize;

export default function CosmicBoard({ onSquareTap }: { onSquareTap: (square: string) => void }) {
  const textures = useMemo(() => cosmicTextures(), []);

  // A 4-sided cylinder rotated 45° = a square tile with sloped, faceted edges.
  const tileGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry((S * BOARD.tileInset) / Math.SQRT2, S / Math.SQRT2, BOARD.tileHeight, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, BOARD.tileHeight / 2, 0);
    return g.toNonIndexed();
  }, []);
  const topGeo = useMemo(() => new THREE.PlaneGeometry(S * BOARD.tileInset, S * BOARD.tileInset).rotateX(-Math.PI / 2), []);

  const sideMats = useMemo(() => ({
    light: new THREE.MeshStandardMaterial({ color: PALETTE.deepBlue, roughness: 0.5, metalness: 0.3, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: PALETTE.deepGrey, roughness: 0.5, metalness: 0.3, flatShading: true }),
  }), []);
  const topMats = useMemo(() => ({
    light: textures.light.map((map) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.4, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 })),
    dark: textures.dark.map((map) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.4, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 })),
  }), [textures]);

  const frameGeo = useMemo(() => {
    const half = 4 * S, outer = half + BOARD.frameWidth;
    const shape = new THREE.Shape([
      new THREE.Vector2(-outer, -outer), new THREE.Vector2(outer, -outer),
      new THREE.Vector2(outer, outer), new THREE.Vector2(-outer, outer),
    ]);
    shape.holes.push(new THREE.Path([
      new THREE.Vector2(-half, -half), new THREE.Vector2(-half, half),
      new THREE.Vector2(half, half), new THREE.Vector2(half, -half),
    ]));
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: BOARD.frameHeight - BOARD.frameBevel, bevelEnabled: true,
      bevelThickness: BOARD.frameBevel, bevelSize: BOARD.frameBevel, bevelSegments: 1,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const tap = (square: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta < CAMERA.tapThresholdPx) onSquareTap(square); // §4.3: bigger moves are camera drags
  };

  return (
    <group>
      <mesh geometry={frameGeo} castShadow receiveShadow>
        <meshPhysicalMaterial color={PALETTE.black} emissive={PALETTE.rustyPurple} emissiveIntensity={0.25}
          roughness={0.3} metalness={0.7} clearcoat={1} clearcoatRoughness={0.2} flatShading />
      </mesh>
      {ALL_SQUARES.map((sq, i) => {
        const [x, z] = squareToXZ(sq);
        const light = isLightSquare(sq);
        const variant = (i * 5 + FILES.indexOf(sq[0])) % BOARD.textureVariants;
        return (
          <group key={sq} position={[x, 0, z]} onClick={tap(sq)}>
            <mesh geometry={tileGeo} material={light ? sideMats.light : sideMats.dark} receiveShadow />
            <mesh geometry={topGeo} material={(light ? topMats.light : topMats.dark)[variant]}
              position={[0, BOARD.tileHeight + 0.001, 0]} receiveShadow />
          </group>
        );
      })}
    </group>
  );
}
