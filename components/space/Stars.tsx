// Dense star field: blinding-white points, slight twinkle; a few brighter stars pulse. Spec §4.1.
"use client";
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { STARS } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { rng } from "./noise";

export default function Stars() {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const r = rng(42);
    const pos = new Float32Array(STARS.count * 3), size = new Float32Array(STARS.count),
      phase = new Float32Array(STARS.count), bright = new Float32Array(STARS.count);
    for (let i = 0; i < STARS.count; i++) {
      const z = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      pos.set([s * Math.cos(t) * STARS.radius, z * STARS.radius, s * Math.sin(t) * STARS.radius], i * 3);
      const isBright = r() < STARS.brightFraction;
      bright[i] = isBright ? 1 : 0;
      size[i] = isBright ? STARS.brightSize : STARS.minSize + Math.pow(r(), 3) * (STARS.maxSize - STARS.minSize);
      phase[i] = r();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geometry.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uDpr: { value: 1 }, uColor: { value: new THREE.Color(PALETTE.blindingWhite) },
        uBase: { value: STARS.baseBrightness }, uBoost: { value: STARS.brightBoost },
        uTwAmt: { value: STARS.twinkleAmount }, uTwSpeed: { value: STARS.twinkleSpeed },
        uPulseAmt: { value: STARS.pulseAmount }, uPulseSpeed: { value: STARS.pulseSpeed },
      },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aPhase; attribute float aBright;
        uniform float uTime, uDpr, uBase, uBoost, uTwAmt, uTwSpeed, uPulseAmt, uPulseSpeed;
        varying float vI;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          float tw = 1.0 + uTwAmt * sin(uTime * uTwSpeed * (0.5 + aPhase) + aPhase * 60.0);
          float pulse = 1.0 + aBright * uPulseAmt * sin(uTime * uPulseSpeed * (0.7 + aPhase) + aPhase * 20.0);
          vI = uBase * (1.0 + aBright * uBoost) * tw * pulse;
          gl_PointSize = aSize * uDpr * pulse;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vI;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, r); a *= a;
          gl_FragColor = vec4(uColor * vI * a, a);
        }`,
    });
    return { geometry, material };
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uDpr.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-9} />;
}
