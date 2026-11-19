// 360 orbit, +-10 tilt, 35 default, 10 px tap rule. Spec §4.3.
// - Horizontal drag orbits a full 360° around the board; vertical drag tilts ±10°.
// - A press that moves less than tapThresholdPx never moves the camera (it's a tap; the
//   board checks the same threshold via the click event's `delta`).
// - Smooth easing: the camera follows the finger and glides to a stop after a flick.
// - No zoom. Resets (smoothly) to the default angle whenever `resetKey` changes (each new game).
"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD, CAMERA } from "@/config/chess.config";
import { DEG, fitDistance, orbitPosition } from "./framing";

/**
 * Scenes pull the camera back a little so the scene shows. On narrow screens the board-fit
 * distance is already further than that, so use whichever is larger (never both): this keeps
 * the camera inside the scene, e.g. in the truck bed rather than inside the cab.
 */
function framedDistance(fit: number, scene: boolean) {
  return scene ? Math.max(fit, CAMERA.distance * CAMERA.sceneDistanceScale) : fit;
}

export interface OrbitCameraProps {
  resetKey?: string | number | null;
  sceneFraming?: boolean;
  /** Receives the point the camera looks at each frame (the flight director blends from/to it). */
  lookOut?: React.MutableRefObject<THREE.Vector3>;
  /** Change to jump straight to the current framing instead of easing (reduced-motion swaps). */
  snapKey?: number;
}

export default function OrbitCamera({ resetKey, sceneFraming = false, lookOut, snapKey }: OrbitCameraProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const { width, height } = useThree((s) => s.size);

  const st = useRef({
    az: 0, tilt: 0,                 // where the camera is now (radians)
    targetAz: 0, targetTilt: 0,     // where it is heading
    velocity: 0,                    // orbit speed after release (rad/s)
    distance: CAMERA.distance as number,
    fit: CAMERA.distance as number,  // distance that fits the board on this screen
    aim: 0,                          // 0 = look at board centre (Space), 1 = scene framing
    look: new THREE.Vector3(),
    pointer: null as null | { id: number; x: number; y: number; startX: number; startY: number; dragging: boolean; lastT: number; v: number },
  });

  useLayoutEffect(() => {
    const s = st.current;
    s.fit = fitDistance(width / height);
    s.distance = framedDistance(s.fit, sceneFraming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    if (!snapKey) return;
    const s = st.current;
    s.aim = sceneFraming ? 1 : 0;
    s.distance = framedDistance(s.fit, sceneFraming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapKey]);

  useEffect(() => {
    const s = st.current;
    // Unwrap so the camera takes the short way back to White's side.
    s.az = ((s.az % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    s.targetAz = 0; s.targetTilt = 0; s.velocity = 0;
  }, [resetKey]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const s = st.current;
    const tiltMax = CAMERA.tiltRangeDeg * DEG;

    const down = (e: PointerEvent) => {
      if (s.pointer) return;
      s.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, dragging: false, lastT: performance.now(), v: 0 };
      s.velocity = 0;
    };
    const move = (e: PointerEvent) => {
      const p = s.pointer;
      if (!p || p.id !== e.pointerId) return;
      if (!p.dragging) {
        if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < CAMERA.tapThresholdPx) return;
        p.dragging = true;
        p.x = e.clientX; p.y = e.clientY;
        el.setPointerCapture?.(e.pointerId);
        return;
      }
      const now = performance.now();
      const dAz = -(e.clientX - p.x) * CAMERA.orbitDegPerPx * DEG;
      s.targetAz += dAz;
      s.targetTilt = Math.min(tiltMax, Math.max(-tiltMax, s.targetTilt + (e.clientY - p.y) * CAMERA.tiltDegPerPx * DEG));
      const dt = Math.max(1, now - p.lastT) / 1000;
      p.v = 0.7 * p.v + 0.3 * (dAz / dt);
      p.x = e.clientX; p.y = e.clientY; p.lastT = now;
    };
    const up = (e: PointerEvent) => {
      const p = s.pointer;
      if (!p || p.id !== e.pointerId) return;
      if (p.dragging && performance.now() - p.lastT < 80) {
        const max = CAMERA.maxSpinDegPerSec * DEG;
        s.velocity = Math.max(-max, Math.min(max, p.v));
      }
      s.pointer = null;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const s = st.current;
    const dt = Math.min(rawDt, 0.1);
    if (!s.pointer && s.velocity !== 0) {
      s.targetAz += s.velocity * dt;
      s.velocity *= Math.exp(-CAMERA.inertiaDecay * dt);
      if (Math.abs(s.velocity) < 0.002) s.velocity = 0;
    }
    const k = 1 - Math.exp(-CAMERA.followRate * dt);
    s.az += (s.targetAz - s.az) * k;
    s.tilt += (s.targetTilt - s.tilt) * k;
    // Ease between Space framing and scene framing.
    const f = 1 - Math.exp(-CAMERA.framingRate * dt);
    s.aim += ((sceneFraming ? 1 : 0) - s.aim) * f;
    s.distance += (framedDistance(s.fit, sceneFraming) - s.distance) * f;

    const elev = CAMERA.defaultElevationDeg * DEG + s.tilt;
    orbitPosition(s.az, elev, s.distance, camera.position);
    // Pitch: Space looks at the board centre; scenes drop the board low in the frame
    // (near edge just above the bottom of the screen) so the scene shows above it.
    const horiz = s.distance * Math.cos(elev), h = s.distance * Math.sin(elev);
    const halfBoard = 4 * BOARD.squareSize + BOARD.frameWidth;
    const nearEdge = Math.atan2(h, Math.max(0.01, horiz - halfBoard));
    const scenePitch = Math.min(elev, nearEdge - (CAMERA.fovDeg / 2) * DEG * CAMERA.sceneAimMargin);
    const pitch = elev + (scenePitch - elev) * s.aim;
    const inv = 1 / Math.max(1e-6, Math.hypot(camera.position.x, camera.position.z));
    s.look.set(
      camera.position.x - camera.position.x * inv * Math.cos(pitch),
      camera.position.y - Math.sin(pitch),
      camera.position.z - camera.position.z * inv * Math.cos(pitch),
    );
    camera.lookAt(s.look);
    lookOut?.current.copy(s.look);
  });

  return null;
}
