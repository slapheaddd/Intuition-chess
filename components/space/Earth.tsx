// Earth: partial globe, low-poly faceted coastlines, slow clouds, blue + orange atmosphere
// along the sunlit horizon. World-fixed. Spec §4.1.
"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EARTH } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { fbm3 } from "./noise";

let landGeo: THREE.BufferGeometry | null = null;
function earthGeometry() {
  if (landGeo) return landGeo;
  const g = new THREE.IcosahedronGeometry(1, EARTH.detail); // non-indexed: one colour per face
  const pos = g.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const ocean = new THREE.Color(PALETTE.deepBlue), deep = new THREE.Color(PALETTE.black);
  const land = new THREE.Color(PALETTE.green), high = new THREE.Color(PALETTE.rustyPurple), rock = new THREE.Color(PALETTE.deepGrey);
  const ice = new THREE.Color(PALETTE.blindingWhite);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < pos.count; f += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(pos, f + k));
    v.normalize();
    const s = EARTH.noiseScale;
    const h = fbm3(v.x * s + 3.1, v.y * s + 1.7, v.z * s + 5.3) - 0.5;
    const detail = fbm3(v.x * 6 + 9, v.y * 6, v.z * 6);
    if (Math.abs(v.y) > 0.975 - detail * 0.02) c.copy(ice).multiplyScalar(0.8);   // small polar caps
    else if (h > EARTH.landLevel) {
      c.copy(land).multiplyScalar(0.18).lerp(rock, 0.4);
      if (h > EARTH.landLevel + 0.08) c.lerp(high, 0.35);
      c.multiplyScalar(0.8 + detail * 0.4);
    } else c.copy(ocean).lerp(deep, 0.25 + Math.max(0, -h) * 0.8);
    for (let k = 0; k < 3; k++) c.toArray(colors, (f + k) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  landGeo = g;
  return g;
}

let cloudTex: THREE.Texture | null = null;
function cloudTexture() {
  if (cloudTex) return cloudTex;
  const w = EARTH.cloudTextureWidth, h = w / 2;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - (y + 0.5) / h) * Math.PI;
    for (let x = 0; x < w; x++) {
      const lon = ((x + 0.5) / w) * Math.PI * 2;
      const dx = Math.cos(lat) * Math.cos(lon), dy = Math.sin(lat), dz = Math.cos(lat) * Math.sin(lon);
      const n = fbm3(dx * 3 + 20, dy * 6 + 20, dz * 3 + 20);
      const a = Math.min(1, Math.max(0, (n - 0.5) / 0.2));
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  cloudTex = new THREE.CanvasTexture(canvas);
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  return cloudTex;
}

const ATMO_VERT = /* glsl */ `
  varying vec3 vWorldNormal; varying vec3 vViewNormal; varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const ATMO_FRAG = (outer: boolean) => /* glsl */ `
  uniform vec3 uSun, uBlue, uOrange, uPink; uniform float uStrength, uLimb;
  varying vec3 vWorldNormal; varying vec3 vViewNormal; varying vec3 vViewDir;
  void main() {
    float d = dot(vViewNormal, vViewDir);
    ${outer
      ? "float glow = pow(clamp(-d / uLimb, 0.0, 1.0), 2.5);"          /* halo beyond the limb */
      : "float glow = pow(1.0 - clamp(d, 0.0, 1.0), 4.0);"}            /* haze over the disc edge */
    float ndl = dot(normalize(vWorldNormal), uSun);
    vec3 col = uBlue * smoothstep(-0.15, 0.5, ndl)
             + uOrange * exp(-pow((ndl - 0.02) / 0.16, 2.0)) * 1.4
             + uPink * smoothstep(-0.05, 0.35, ndl) * 0.12;
    gl_FragColor = vec4(col * glow * uStrength, 1.0);
  }`;

export default function Earth({ position, radius, sunDir }: { position: THREE.Vector3; radius: number; sunDir: THREE.Vector3 }) {
  const clouds = useRef<THREE.Mesh>(null);
  const geometry = useMemo(earthGeometry, []);
  const cloudMap = useMemo(cloudTexture, []);
  const [inner, outer] = useMemo(() => [false, true].map((isOuter) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: isOuter ? THREE.BackSide : THREE.FrontSide,
    uniforms: {
      uSun: { value: sunDir }, uStrength: { value: EARTH.atmosphereStrength * (isOuter ? 1 : 0.6) },
      uLimb: { value: Math.sqrt(1 - 1 / (EARTH.atmosphereLift * EARTH.atmosphereLift)) },
      uBlue: { value: new THREE.Color(PALETTE.deepBlue).multiplyScalar(EARTH.atmosphereBlueGain) },
      uOrange: { value: new THREE.Color(PALETTE.orange) }, uPink: { value: new THREE.Color(PALETTE.pink) },
    },
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG(isOuter),
  })), [sunDir]);

  useFrame((_, dt) => { if (clouds.current) clouds.current.rotation.y += EARTH.cloudSpeed * Math.min(dt, 0.1); });

  return (
    <group position={position} scale={radius} rotation={[0.41, 0, 0.2]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors flatShading roughness={0.85} metalness={0} envMapIntensity={0} />
      </mesh>
      <mesh ref={clouds} scale={EARTH.cloudLift}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshStandardMaterial map={cloudMap} transparent depthWrite={false} opacity={EARTH.cloudOpacity}
          roughness={1} metalness={0} envMapIntensity={0} />
      </mesh>
      <mesh material={inner} scale={EARTH.cloudLift + 0.002}><sphereGeometry args={[1, 64, 32]} /></mesh>
      <mesh material={outer} scale={EARTH.atmosphereLift}><sphereGeometry args={[1, 64, 32]} /></mesh>
    </group>
  );
}
