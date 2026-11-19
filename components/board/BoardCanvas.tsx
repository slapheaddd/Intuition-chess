// The 3D stage: orbit camera (§4.3), space scene (§4), scenes (§6), the board's own
// lighting (§3.3), the transitions between scenes (§7), and the HDR pipeline from §12:
// render in high dynamic range, bloom only the brightest pixels, then ACES Filmic.
//
// `scene` is where the board should be. When it changes, BoardCanvas flies there itself:
// dive (space -> scene), return (scene -> space), scene -> scene, or a 0.5 s fade when the
// device asks for reduced motion. The target scene is built (hidden) the moment the flight
// starts, so the landing never waits (§12). The game never pauses meanwhile (§7.4).
"use client";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import gsap from "gsap";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { BOARD_LIGHT, CAMERA, RENDER, SCENE_TUNING } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import OrbitCamera from "@/components/camera/OrbitCamera";
import { DEG, orbitPosition } from "@/components/camera/framing";
import SpaceScene from "@/components/space/SpaceScene";
import SceneFrame from "@/components/scenes/SceneFrame";
import { EntryStreaks, FlightDirector, liftUnits, restingFlight, type Flight, type FlightKind } from "@/components/transitions/flight";
import { diveTimeline } from "@/components/transitions/Dive";
import { returnTimeline } from "@/components/transitions/Return";
import { fadeTimeline, sceneToSceneTimeline } from "@/components/transitions/SceneToScene";
import { SCENE_DEFS, type SceneDef, type SceneId } from "@/components/scenes";
import type { PieceView } from "@/shared/chess";
import CosmicBoard from "./CosmicBoard";
import MoveHighlights from "./MoveHighlights";
import Pieces from "./Pieces";

export interface BoardCanvasProps {
  pieces: PieceView[];
  selected: string | null;
  targets: string[];
  onSquareTap: (square: string) => void;
  resetKey?: string | null;   // camera returns to the default angle when this changes (each new game)
  scene: SceneId;
}

/**
 * Board, pieces and highlights move as one object: lifted during scene flights (§7.1 step 5,
 * §7.2 step 1) and, in the truck, swaying (cosmetic, §6.6). Pieces never leave their squares.
 */
function BoardRig({ sway, flight, children }: { sway?: SceneDef["boardSway"]; flight: MutableRefObject<Flight>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    g.position.y = liftUnits(flight.current);
    if (!sway) { g.rotation.set(0, 0, 0); return; }
    const t = clock.elapsedTime * Math.PI * 2 * sway.hz, max = sway.maxDeg * DEG;
    // Two out-of-step waves; each stays within ±maxDeg.
    g.rotation.set(max * (0.6 * Math.sin(t) + 0.4 * Math.sin(2.3 * t + 1)), 0, max * (0.6 * Math.sin(0.8 * t + 2) + 0.4 * Math.sin(1.7 * t)));
  });
  return <group ref={ref}>{children}</group>;
}

/** The board's own lighting: purple edge light + a reflection environment for specular gleams. */
function BoardLighting() {
  return (
    <>
      <directionalLight position={[...BOARD_LIGHT.rimPurplePosition]} intensity={BOARD_LIGHT.rimPurple} color={PALETTE.rustyPurple} />
      {/* World-fixed light panels: their reflections slide over the board and pieces as the camera orbits. */}
      <Environment resolution={256} frames={1} environmentIntensity={RENDER.envIntensity}>
        <Lightformer form="rect" intensity={4} color={PALETTE.blindingWhite} position={[8, 5, -6]} scale={[8, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2} color={PALETTE.rustyPurple} position={[-9, 3, 2]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.5} color={PALETTE.deepBlue} position={[0, -6, 8]} scale={[10, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={3} color={PALETTE.pink} position={[-4, 9, -8]} scale={2} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

// Development only: records flight timings for automated tests.
interface RunningFlight { tl: gsap.core.Timeline; startedAt: number; lastFrame?: number; frameMs?: number }

/**
 * Drives the flight's GSAP timeline from the real clock, in the render loop: every frame the
 * playhead is set to the exact time since the flight began. Flights therefore last exactly
 * their set length (§7) on any device, and stay in step with what is drawn.
 */
function FlightClock({ running, flight }: { running: MutableRefObject<RunningFlight | null>; flight: MutableRefObject<Flight> }) {
  useFrame(() => {
    const r = running.current;
    if (!r) return;
    const now = performance.now();
    r.frameMs = r.lastFrame ? now - r.lastFrame : 0;
    r.lastFrame = now;
    const speed = devSpeed();
    const t = Math.min(r.tl.duration(), ((performance.now() - r.startedAt) / 1000) * speed);
    r.tl.time(t);   // passes any swap calls and fires onComplete at the end
    if (process.env.NODE_ENV !== "production") (window as unknown as { __icFlightState?: unknown }).__icFlightState = { t, ...flight.current };
  });
  return null;
}

/** Development only: tests can slow flights down (window.__icFlightSpeed) to inspect them. */
const devSpeed = () => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return 1;
  return (window as unknown as { __icFlightSpeed?: number }).__icFlightSpeed ?? 1;
};

const devLog = (entry: Record<string, unknown>) => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const w = window as unknown as { __icFlights?: Record<string, unknown>[] };
  (w.__icFlights ??= []).push({ ...entry, t: performance.now() });
};
devLog({ event: "loaded" });

const prefersReducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export default function BoardCanvas({ pieces, selected, targets, onSquareTap, resetKey, scene }: BoardCanvasProps) {
  const [shown, setShown] = useState<SceneId>(scene);          // what is on screen now
  const [flightTo, setFlightTo] = useState<SceneId | null>(null);
  const [kind, setKind] = useState<FlightKind | null>(null);
  const [snapKey, setSnapKey] = useState(0);
  const flight = useRef<Flight>(restingFlight());
  const orbitLook = useRef(new THREE.Vector3());
  const spaceOffset = useRef(new THREE.Vector3());
  const focus = useRef<THREE.Vector3 | null>(null);
  const glowEl = useRef<HTMLDivElement>(null);
  const fadeEl = useRef<HTMLDivElement>(null);
  const timeline = useRef<RunningFlight | null>(null);

  // Fly to `scene` whenever it differs from what is shown. If it changes mid-flight, the
  // next flight starts as soon as this one lands.
  useEffect(() => {
    if (flightTo !== null || scene === shown) return;
    const from = shown, to = scene;
    const f = flight.current;
    Object.assign(f, restingFlight());
    const k: FlightKind = prefersReducedMotion() ? "fade" : from === "space" ? "dive" : to === "space" ? "return" : "sceneToScene";
    setFlightTo(to);
    setKind(k);
    const swap = (id: SceneId) => { devLog({ event: "swap", to: id }); setShown(id); };
    const tl = k === "fade" ? fadeTimeline(fadeEl.current!, () => { swap(to); setSnapKey((n) => n + 1); })
      : k === "dive" ? diveTimeline(f, () => swap(to))
      : k === "return" ? returnTimeline(f, () => swap("space"))
      : sceneToSceneTimeline(f, () => swap("space"), () => swap(to));
    tl.eventCallback("onComplete", () => {
      if (timeline.current?.tl !== tl) return;
      devLog({ event: "end", kind: k, from, to, lastFrameMs: timeline.current?.frameMs });
      Object.assign(f, restingFlight());
      timeline.current = null;
      setKind(null);
      setFlightTo(null);
    });
    tl.pause();   // FlightClock moves the playhead from real time, every frame
    timeline.current = { tl, startedAt: performance.now() };
    devLog({ event: "start", kind: k, from, to, planned: tl.duration() });
  }, [scene, shown, flightTo]);
  useEffect(() => () => { timeline.current?.tl.kill(); }, []);

  const def = shown === "space" ? null : SCENE_DEFS[shown];
  // Mounted scenes: the one shown, plus the one being flown to (built hidden, ready to land).
  const mounted = [shown, flightTo].filter((id, i, all): id is Exclude<SceneId, "space"> => !!id && id !== "space" && all.indexOf(id) === i);

  return (
    <div data-flight={kind ?? ""} data-scene={shown} style={{ position: "absolute", inset: 0 }}>
      <Canvas shadows flat dpr={[1, RENDER.dprMax]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        camera={{ position: orbitPosition(0, CAMERA.defaultElevationDeg * DEG, CAMERA.distance).toArray(), fov: CAMERA.fovDeg, near: CAMERA.near, far: CAMERA.far }}
        style={{ position: "absolute", inset: 0 }}>
        <color attach="background" args={[PALETTE.black]} />
        <OrbitCamera resetKey={resetKey} sceneFraming={!!def} lookOut={orbitLook} snapKey={snapKey} />
        <FlightClock running={timeline} flight={flight} />
        <FlightDirector flight={flight} inSpace={shown === "space"} orbitLook={orbitLook} spaceOffset={spaceOffset} glowEl={glowEl} focus={focus} />
        <SpaceScene active={shown === "space"} offset={spaceOffset} />
        {mounted.map((id) => <SceneFrame key={id} def={SCENE_DEFS[id]} active={id === shown} />)}
        <BoardLighting />
        <BoardRig sway={def?.boardSway} flight={flight}>
          <CosmicBoard onSquareTap={onSquareTap} />
          <Pieces pieces={pieces} onSquareTap={onSquareTap} />
          <MoveHighlights selected={selected} targets={targets} />
        </BoardRig>
        <EntryStreaks flight={flight} />
        <EffectComposer key={def?.depthOfField ? "dof" : "plain"} multisampling={4} frameBufferType={THREE.HalfFloatType}>
          {def?.depthOfField ? (
            <DepthOfField ref={(e) => { focus.current = e?.target ?? null; }} target={[0, 0, 0]}
              worldFocusRange={SCENE_TUNING.dof.focusRange} bokehScale={SCENE_TUNING.dof.bokehScale} />
          ) : <></>}
          <Bloom mipmapBlur luminanceThreshold={RENDER.bloomThreshold} luminanceSmoothing={RENDER.bloomSmoothing}
            intensity={RENDER.bloomIntensity} radius={RENDER.bloomRadius} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
      {/* §7.1 step 4: the orange flash of the atmosphere. */}
      <div ref={glowEl} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0,
        background: `radial-gradient(circle at 50% 55%, ${PALETTE.blindingWhite} 0%, ${PALETTE.orange} 30%, ${PALETTE.ruby} 70%, transparent 100%)`,
        mixBlendMode: "screen" }} />
      {/* §7.4: reduced-motion fade. */}
      <div ref={fadeEl} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0, background: PALETTE.black }} />
    </div>
  );
}
