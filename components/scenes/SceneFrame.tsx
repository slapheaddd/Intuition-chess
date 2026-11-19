// Shared frame: background, board anchor, lighting. No audio. Spec §6.1.
// Draws ANY scene from its config object (§12): sky, fog, lighting override, props,
// streaming movers, crowd, particles and scene lights. Scenes add data, never code.
"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_SCALE, SCENE_TUNING, SUN } from "@/config/chess.config";
import { DEG } from "@/components/camera/framing";
import { rng } from "@/components/space/noise";
import type { Anim, Crowd, Mover, Particles, Prop, SceneDef, SceneLight, Shape } from "./types";

const S = SCENE_SCALE.unitsPerMeter;
const TAU = Math.PI * 2;

// ---------- shared geometry/material caches ----------
const geoCache = new Map<string, THREE.BufferGeometry>();
function geometry(shape: Shape): THREE.BufferGeometry {
  const key = JSON.stringify(shape);
  let g = geoCache.get(key);
  if (!g) {
    if ("box" in shape) g = new THREE.BoxGeometry(...shape.box);
    else if ("cyl" in shape) g = new THREE.CylinderGeometry(shape.cyl[0], shape.cyl[1], shape.cyl[2], shape.facets ?? 8);
    else if ("ball" in shape) g = new THREE.IcosahedronGeometry(shape.ball, shape.detail ?? 1);
    else g = new THREE.PlaneGeometry(shape.plane[0], shape.plane[1]).rotateX(-Math.PI / 2);
    geoCache.set(key, g);
  }
  return g;
}

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function material(p: Prop, unique: boolean): THREE.MeshStandardMaterial {
  const make = () => new THREE.MeshStandardMaterial({
    color: p.color ?? "#808080", flatShading: true, roughness: p.rough ?? 0.75, metalness: p.metal ?? 0.05,
    emissive: p.glow ? (p.color ?? "#ffffff") : "#000000", emissiveIntensity: (p.glow ?? 0) * SCENE_TUNING.propGlow,
    transparent: (p.opacity ?? 1) < 1, opacity: p.opacity ?? 1, depthWrite: (p.opacity ?? 1) >= 1,
  });
  if (unique) return make();
  const key = [p.color, p.glow, p.rough, p.metal, p.opacity].join("|");
  let m = matCache.get(key);
  if (!m) { m = make(); matCache.set(key, m); }
  return m;
}

const wave = (t: number, a: Anim) => Math.sin(TAU * ((a.hz ?? 1) * t + (a.phase ?? 0)));

// ---------- props ----------
function PropNode({ p }: { p: Prop }) {
  const ref = useRef<THREE.Group>(null);
  const a = p.anim;
  const geo = p.shape ? geometry(p.shape) : null;
  const mat = useMemo(() => (geo ? material(p, a?.kind === "flash") : null), [geo, p, a]);
  const baseRot = useMemo(() => new THREE.Euler(...((p.rot ?? [0, 0, 0]).map((d) => d * DEG) as [number, number, number])), [p.rot]);
  const basePos = p.pos ?? [0, 0, 0];

  useFrame(({ clock }) => {
    if (!a || !ref.current) return;
    const t = clock.elapsedTime, g = ref.current, ax = a.axis ?? "y", i = { x: 0, y: 1, z: 2 }[ax];
    if (a.kind === "bob" || a.kind === "slide") g.position.setComponent(i, basePos[i] + (a.amp ?? 0.05) * wave(t, a));
    else if (a.kind === "sway") g.rotation[ax] = baseRot[ax] + (a.amp ?? 5) * DEG * wave(t, a);
    else if (a.kind === "spin") g.rotation[ax] = baseRot[ax] + (a.amp ?? 90) * DEG * t;
    else if (a.kind === "flash" && mat) mat.emissiveIntensity = (p.glow ?? 1) * SCENE_TUNING.propGlow * (wave(t, a) > 0 ? 1 : 0.04);
  });

  const shadow = p.shadow ?? true;
  return (
    <group ref={ref} position={basePos} rotation={baseRot}>
      {geo && mat && <mesh geometry={geo} material={mat} castShadow={shadow} receiveShadow />}
      {p.children?.map((c, i) => <PropNode key={i} p={c} />)}
    </group>
  );
}

// ---------- copies streaming past along z ----------
function MoverGroup({ m }: { m: Mover }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const span = m.spacing * m.count;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const z = (((i * m.spacing + clock.elapsedTime * m.speed) % span) + span) % span;
      g.position.z = m.from + z;
    });
  });
  return (
    <>
      {Array.from({ length: m.count }, (_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}><PropNode p={m.prop} /></group>
      ))}
    </>
  );
}

// ---------- instanced crowd ----------
function CrowdGroup({ c }: { c: Crowd }) {
  const n = c.rows * c.cols;
  const bodies = useRef<THREE.InstancedMesh>(null), heads = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: n }, (_, i) => {
      const row = Math.floor(i / c.cols), col = i % c.cols;
      return {
        x: c.origin[0] + col * c.spacing[0] + (r() - 0.5) * 0.15,
        y: c.origin[1] + row * c.rowRise, z: c.origin[2] - row * c.spacing[1],
        phase: r(), jumpy: r() > 0.6, shirt: new THREE.Color(c.shirts[Math.floor(r() * c.shirts.length)]),
      };
    });
  }, [c, n]);
  const mats = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, emissive: "#ffffff", emissiveIntensity: 0 }),
    head: new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8, color: c.skin }),
  }), [c.skin]);
  useEffect(() => {
    data.forEach((d, i) => bodies.current?.setColorAt(i, d.shirt));
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
  }, [data]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const lift = d.jumpy ? Math.max(0, Math.sin(TAU * (c.hz * t + d.phase))) * c.bobM : 0;
      m.makeTranslation(d.x, d.y + 0.3 + lift, d.z); bodies.current?.setMatrixAt(i, m);
      m.makeTranslation(d.x, d.y + 0.72 + lift, d.z); heads.current?.setMatrixAt(i, m);
    });
    if (bodies.current) bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bodies} args={[geometry({ box: [0.42, 0.6, 0.26] }), mats.body, n]} frustumCulled={false} />
      <instancedMesh ref={heads} args={[geometry({ ball: 0.12, detail: 1 }), mats.head, n]} frustumCulled={false} />
    </>
  );
}

// ---------- instanced particles ----------
function ParticleGroup({ p }: { p: Particles }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => p.kind === "streak" ? new THREE.BoxGeometry(0.006, 0.006, p.size)
    : p.kind === "dot" ? new THREE.IcosahedronGeometry(p.size, 0)
    : new THREE.PlaneGeometry(p.size, p.size * 0.5).rotateX(-Math.PI / 2), [p.kind, p.size]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(p.color).multiplyScalar(p.glow), transparent: true, opacity: p.opacity ?? 1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }), [p.color, p.glow, p.opacity]);
  const state = useMemo(() => {
    const r = rng(p.count * 31 + p.size * 1000);
    return Array.from({ length: p.count }, () => ({
      pos: p.min.map((lo, k) => lo + r() * (p.max[k] - lo)) as number[], phase: r(),
    }));
  }, [p]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1), t = clock.elapsedTime;
    state.forEach((d, i) => {
      for (let k = 0; k < 3; k++) {
        d.pos[k] += p.velocity[k] * dt;
        const lo = p.min[k], span = p.max[k] - lo;
        if (d.pos[k] < lo || d.pos[k] > p.max[k]) d.pos[k] = lo + ((((d.pos[k] - lo) % span) + span) % span);
      }
      const w = p.wobble ?? 0;
      v.set(d.pos[0] + w * Math.sin(TAU * (0.3 * t + d.phase)), d.pos[1] + w * Math.sin(TAU * (0.23 * t + d.phase * 3)), d.pos[2]);
      const on = p.blinkHz ? Math.max(0, Math.sin(TAU * (p.blinkHz * t + d.phase))) : 1;
      s.setScalar(on);
      m.compose(v, q, s);
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, p.count]} frustumCulled={false} />;
}

// ---------- scene lights ----------
function SceneLightNode({ l }: { l: SceneLight }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const L = ref.current;
    if (!L) return;
    const t = clock.elapsedTime;
    if (l.flash) L.intensity = l.intensity * (Math.sin(TAU * (l.flash.hz * t + (l.flash.phase ?? 0))) > 0 ? 1 : 0);
    if (l.sweep) {
      const f = (l.sweep.hz * t) % 1;
      L.position[l.sweep.axis] = l.sweep.from + (l.sweep.to - l.sweep.from) * f;
    }
  });
  return <pointLight ref={ref} position={l.pos} color={l.color} intensity={l.intensity} distance={l.range * S} decay={0} />;
}

// ---------- sky + fog ----------
function Sky({ top, bottom }: { top: string; bottom: string }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uBottom: { value: new THREE.Color(bottom) } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uTop, uBottom; varying vec3 vDir; void main(){ float h = smoothstep(-0.15, 0.6, vDir.y); gl_FragColor = vec4(mix(uBottom, uTop, h), 1.0); }",
  }), [top, bottom]);
  return <mesh material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[200 * S, 32, 16]} /></mesh>;
}

function Fog({ color, near, far }: { color: string; near: number; far: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.Fog(color, near * S, far * S);
    return () => { scene.fog = null; };
  }, [scene, color, near, far]);
  return null;
}

/** `active` = shown. A scene being flown to is mounted hidden first, so its parts are built before landing (§12). */
export default function SceneFrame({ def, active = true }: { def: SceneDef; active?: boolean }) {
  const L = def.light;
  const lightPos = useMemo(() => new THREE.Vector3(
    Math.cos(L.elevationDeg * DEG) * Math.sin(L.azimuthDeg * DEG),
    Math.sin(L.elevationDeg * DEG),
    Math.cos(L.elevationDeg * DEG) * Math.cos(L.azimuthDeg * DEG),
  ).multiplyScalar(SUN.distance), [L.azimuthDeg, L.elevationDeg]);

  return (
    <group visible={active}>
      <Sky top={def.sky.top} bottom={def.sky.bottom} />
      {active && def.fog && <Fog {...def.fog} />}
      {/* Lighting override: this scene's own light direction + colour temperature (§6.1). */}
      <directionalLight position={lightPos} intensity={L.intensity} color={L.color}
        castShadow shadow-mapSize={[SUN.shadowMapSize, SUN.shadowMapSize]} shadow-bias={SUN.shadowBias}
        shadow-camera-left={-SUN.shadowExtent} shadow-camera-right={SUN.shadowExtent}
        shadow-camera-top={SUN.shadowExtent} shadow-camera-bottom={-SUN.shadowExtent}
        shadow-camera-near={1} shadow-camera-far={SUN.distance * 2} />
      <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemiIntensity]} />
      {/* Board anchor: the scene is placed so its anchor point sits under the board (§6.1). */}
      <group scale={S} position={def.anchor.map((v) => -v * S) as [number, number, number]}>
        {def.props.map((p, i) => <PropNode key={i} p={p} />)}
        {def.movers?.map((m, i) => <MoverGroup key={i} m={m} />)}
        {def.crowd?.map((c, i) => <CrowdGroup key={i} c={c} />)}
        {def.particles?.map((p, i) => <ParticleGroup key={i} p={p} />)}
        {def.lights?.map((l, i) => <SceneLightNode key={i} l={l} />)}
      </group>
    </group>
  );
}
