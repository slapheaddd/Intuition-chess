// Green pulse + selection beam. Spec §3.4.
"use client";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, HIGHLIGHT } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { squareToXZ } from "./coords";

const noRaycast = () => null; // highlights never block taps

export default function MoveHighlights({ selected, targets }: { selected: string | null; targets: string[] }) {
  const pulseMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.matrixGreen).multiplyScalar(HIGHLIGHT.glow), transparent: true, opacity: HIGHLIGHT.maxOpacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), []);
  const beamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.matrixGreen).multiplyScalar(HIGHLIGHT.glow), transparent: true, opacity: HIGHLIGHT.beamOpacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }), []);
  const squareGeo = useMemo(() => new THREE.PlaneGeometry(BOARD.squareSize * BOARD.tileInset, BOARD.squareSize * BOARD.tileInset).rotateX(-Math.PI / 2), []);
  const beamGeo = useMemo(() => new THREE.CylinderGeometry(HIGHLIGHT.beamRadius, HIGHLIGHT.beamRadius, HIGHLIGHT.beamHeight, 16, 1, true)
    .translate(0, HIGHLIGHT.beamHeight / 2, 0), []);

  useFrame(({ clock }) => {
    const t = (Math.sin(clock.elapsedTime * Math.PI * 2 * HIGHLIGHT.pulseHz) + 1) / 2;
    pulseMat.opacity = HIGHLIGHT.minOpacity + t * (HIGHLIGHT.maxOpacity - HIGHLIGHT.minOpacity);
  });

  const y = BOARD.tileHeight + 0.004;
  return (
    <group>
      {targets.map((sq) => {
        const [x, z] = squareToXZ(sq);
        return <mesh key={sq} geometry={squareGeo} material={pulseMat} position={[x, y, z]} raycast={noRaycast} />;
      })}
      {selected && (() => {
        const [x, z] = squareToXZ(selected);
        return <mesh geometry={beamGeo} material={beamMat} position={[x, y, z]} raycast={noRaycast} />;
      })()}
    </group>
  );
}
