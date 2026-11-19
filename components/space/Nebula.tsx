// Faint bands of rusty purple and deep blue drifting behind the board. Spec §4.1.
"use client";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, NEBULA } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { DEG } from "@/components/camera/framing";
import { GLSL_NOISE } from "./noise";

export default function Nebula() {
  const material = useMemo(() => {
    // Tilt both bands so they cross the default view, behind the board.
    const view = new THREE.Vector3(0, -Math.sin(CAMERA.defaultElevationDeg * DEG), -Math.cos(CAMERA.defaultElevationDeg * DEG));
    const axis1 = new THREE.Vector3().crossVectors(view, new THREE.Vector3(1, 0.35, 0)).normalize();
    const axis2 = new THREE.Vector3().crossVectors(view, new THREE.Vector3(-0.5, 0.2, 0.8)).normalize();
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uStrength: { value: NEBULA.strength }, uWidth: { value: NEBULA.bandWidth },
        uDrift: { value: NEBULA.driftSpeed }, uAxis1: { value: axis1 }, uAxis2: { value: axis2 },
        uPurple: { value: new THREE.Color(PALETTE.rustyPurple) }, uBlue: { value: new THREE.Color(PALETTE.deepBlue) },
        uPink: { value: new THREE.Color(PALETTE.pink) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uStrength, uWidth, uDrift; uniform vec3 uAxis1, uAxis2, uPurple, uBlue, uPink;
        varying vec3 vDir;
        ${GLSL_NOISE}
        void main() {
          vec3 d = normalize(vDir);
          vec3 drift = vec3(uTime * uDrift, uTime * uDrift * 0.4, 0.0);
          float n1 = fbm3(d * 2.6 + drift);
          float n2 = fbm3(d * 4.1 - drift + 11.0);
          float b1 = exp(-pow((dot(d, uAxis1) + (n1 - 0.5) * 0.9) / uWidth, 2.0));
          float b2 = exp(-pow((dot(d, uAxis2) - 0.2 + (n2 - 0.5) * 0.9) / (uWidth * 0.8), 2.0));
          float wisps = smoothstep(0.35, 0.8, fbm3(d * 7.0 + drift * 2.0));
          vec3 col = uPurple * b1 * (0.35 + 1.2 * n1 * wisps)
                   + uBlue * b2 * (0.6 + 1.4 * n2)
                   + uPink * b1 * b2 * 0.25;
          gl_FragColor = vec4(col * uStrength, 1.0);
        }`,
    });
  }, []);

  useFrame(({ clock }) => { material.uniforms.uTime.value = clock.elapsedTime; });

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[NEBULA.radius, 48, 24]} />
    </mesh>
  );
}
