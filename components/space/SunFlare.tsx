// The sun is off-screen (implied by the directional light). A lens flare appears at the
// screen edge when the camera orbits toward it. Spec §4.1.
"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, SUN } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { DEG } from "@/components/camera/framing";
import { glowTexture } from "./noise";

// Flare elements: position along the line from the flare (t=0) through screen centre (t=1).
const ELEMENTS = [
  { t: 0, size: 1, color: PALETTE.blindingWhite, gain: 1 },
  { t: 0, size: 0.45, color: PALETTE.orange, gain: 1.2 },
  { t: 0.55, size: 0.12, color: PALETTE.pink, gain: 0.35 },
  { t: 0.9, size: 0.2, color: PALETTE.orange, gain: 0.25 },
  { t: 1.3, size: 0.08, color: PALETTE.green, gain: 0.3 },
] as const;

export default function SunFlare({ sunDir }: { sunDir: THREE.Vector3 }) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => ELEMENTS.map((e) => new THREE.MeshBasicMaterial({
    map: glowTexture(), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    color: new THREE.Color(e.color),
  })), []);
  const base = useMemo(() => ELEMENTS.map((e) => new THREE.Color(e.color)), []);
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), local: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g) return;
    // Keep the flare layer glued to the camera, one unit in front of it.
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);

    // How directly is the camera facing the sun, ignoring height?
    camera.getWorldDirection(tmp.fwd);
    const fa = Math.atan2(tmp.fwd.x, tmp.fwd.z), sa = Math.atan2(sunDir.x, sunDir.z);
    let diff = Math.abs(fa - sa);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const strength = Math.pow(Math.max(0, 1 - diff / (SUN.flareFovDeg * DEG)), 2) * SUN.flareStrength;
    g.visible = strength > 0.001;
    if (!g.visible) return;

    // Sun's horizontal screen position; the flare sits on the top edge.
    tmp.local.copy(sunDir).applyQuaternion(tmp.q.copy(camera.quaternion).invert());
    const halfH = Math.tan((CAMERA.fovDeg / 2) * DEG), halfW = halfH * (size.width / size.height);
    const x = Math.max(-halfW, Math.min(halfW, (tmp.local.x / Math.max(0.05, -tmp.local.z))));
    const y = halfH * 0.98;
    g.children.forEach((child, i) => {
      const e = ELEMENTS[i];
      child.position.set(x * (1 - e.t), y * (1 - e.t), -1);
      child.scale.setScalar(e.size * SUN.flareSize * halfH * 2);
      mats[i].color.copy(base[i]).multiplyScalar(strength * e.gain);
    });
  });

  return (
    <group ref={group} renderOrder={100}>
      {mats.map((m, i) => (
        <mesh key={i} material={m} frustumCulled={false} renderOrder={100}><planeGeometry args={[1, 1]} /></mesh>
      ))}
    </group>
  );
}
