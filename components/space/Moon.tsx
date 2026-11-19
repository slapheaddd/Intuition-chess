// Moon: smaller, upper-right, crater detail, soft white light. Spec §4.1.
"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { MOON } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { glowTexture, rng } from "./noise";

let moonGeo: THREE.BufferGeometry | null = null;
function moonGeometry() {
  if (moonGeo) return moonGeo;
  const g = new THREE.IcosahedronGeometry(1, MOON.detail);
  const r = rng(7);
  const craters = Array.from({ length: MOON.craters }, () => {
    const z = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    return { c: new THREE.Vector3(s * Math.cos(t), z, s * Math.sin(t)), size: 0.06 + Math.pow(r(), 2) * 0.32 };
  });
  const pos = g.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const light = new THREE.Color(PALETTE.blindingWhite).multiplyScalar(0.75), dark = new THREE.Color(PALETTE.deepGrey);
  const v = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let h = 0, floor = 0;
    for (const { c, size } of craters) {
      const t = v.angleTo(c) / size;
      if (t < 1) { h -= MOON.craterDepth * size * (1 - t * t); floor = Math.max(floor, 1 - t); }
      else if (t < 1.35) h += MOON.craterDepth * size * 0.35 * (1 - (t - 1) / 0.35);
    }
    pos.setXYZ(i, v.x * (1 + h), v.y * (1 + h), v.z * (1 + h));
    col.copy(light).lerp(dark, Math.min(0.6, floor * 0.7)).toArray(colors, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  moonGeo = g;
  return g;
}

export default function Moon({ position, radius }: { position: THREE.Vector3; radius: number }) {
  const geometry = useMemo(moonGeometry, []);
  const halo = useMemo(() => new THREE.SpriteMaterial({
    map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    color: new THREE.Color(PALETTE.blindingWhite).multiplyScalar(MOON.haloStrength),
  }), []);
  return (
    <group position={position}>
      <sprite material={halo} scale={radius * MOON.haloScale * 2} />
      <mesh geometry={geometry} scale={radius}>
        <meshStandardMaterial vertexColors flatShading roughness={1} metalness={0} envMapIntensity={0}
          emissive={PALETTE.blindingWhite} emissiveIntensity={MOON.glow} />
      </mesh>
    </group>
  );
}
