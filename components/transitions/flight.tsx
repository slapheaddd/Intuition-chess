// Shared flight engine for the transitions (Spec §7, §12 "one camera timeline").
// A GSAP timeline (Dive / Return / SceneToScene) tweens the numbers in `Flight`;
// FlightDirector turns them into the camera path every frame. The game itself never
// pauses: board, pieces and the server game carry on while the camera flies (§7.4).
"use client";
import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_SCALE, TRANSITION } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { useSpaceLayout } from "@/components/space/SpaceScene";
import { rng } from "@/components/space/noise";

export type FlightKind = "dive" | "return" | "sceneToScene" | "fade";

export interface Flight {
  a: number;        // space: 0 = board resting in space, 1 = at Earth's atmosphere
  h: number;        // scenes: 0 = board landed on its anchor, 1 = high above the scene
  c: number;        // 0 = the normal orbit camera, 1 = the flight camera
  p: number;        // space: 0 = pulled-back view, 1 = riding behind the board towards Earth
  glow: number;     // orange atmosphere flash, 0..1
  streaks: number;  // wind streaks, 0..1
}

export const restingFlight = (): Flight => ({ a: 0, h: 0, c: 0, p: 0, glow: 0, streaks: 0 });

/** Board height above its scene anchor right now, in world units. */
export const liftUnits = (f: Flight) => f.h * TRANSITION.liftMeters * SCENE_SCALE.unitsPerMeter;

const UP = new THREE.Vector3(0, 1, 0);

export function FlightDirector({ flight, inSpace, orbitLook, spaceOffset, glowEl, focus }: {
  flight: MutableRefObject<Flight>;
  inSpace: boolean;
  orbitLook: MutableRefObject<THREE.Vector3>;
  spaceOffset: MutableRefObject<THREE.Vector3>;
  glowEl: MutableRefObject<HTMLDivElement | null>;
  focus: MutableRefObject<THREE.Vector3 | null>;   // depth-of-field focus point (follows the board)
}) {
  const layout = useSpaceLayout();
  const v = useMemo(() => {
    // Where the dive ends: just above the point of Earth's surface nearest the board.
    const e = layout.earthPos;
    const surface = e.clone().multiplyScalar(1 - (layout.earthRadius * (1 + TRANSITION.surfaceGap)) / e.length());
    return {
      surface, dir: surface.clone().normalize(),
      pos: new THREE.Vector3(), look: new THREE.Vector3(), fpos: new THREE.Vector3(), flook: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
    };
  }, [layout]);

  useFrame(({ camera }) => {
    const f = flight.current;
    spaceOffset.current.copy(v.surface).multiplyScalar(-f.a);
    const lift = liftUnits(f);
    focus.current?.set(0, lift, 0);
    if (glowEl.current) glowEl.current.style.opacity = String(f.glow * TRANSITION.glowPeak);
    if (f.c <= 0.0001) return;   // no flight: the orbit camera has the camera

    // The orbit camera already placed the camera this frame; blend from its pose.
    v.pos.copy(camera.position);
    v.look.copy(orbitLook.current);
    if (inSpace) {
      // Pulled back (revealing space) -> locked behind the board, looking past it at Earth.
      v.fpos.copy(v.pos).multiplyScalar(TRANSITION.pullBackScale);
      v.flook.set(0, 0, 0);
      v.tmp.copy(v.dir).multiplyScalar(-TRANSITION.chaseBack).addScaledVector(UP, TRANSITION.chaseUp);
      v.fpos.lerp(v.tmp, f.p);
      v.flook.lerp(v.tmp.copy(v.dir).multiplyScalar(TRANSITION.chaseLook), f.p);
    } else {
      // In a scene the camera rides with the board: from above it, down to the normal framing.
      v.pos.y += lift; v.look.y += lift;
      v.fpos.set(0, lift + TRANSITION.aboveUp, TRANSITION.aboveBack);
      v.flook.set(0, lift, 0);
    }
    camera.position.lerpVectors(v.pos, v.fpos, f.c);
    camera.lookAt(v.look.lerp(v.flook, f.c));
  });
  return null;
}

/** Wind streaks rushing past the camera as the board punches through the atmosphere (§7.1 step 4). */
export function EntryStreaks({ flight }: { flight: MutableRefObject<Flight> }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { geo, mat, items } = useMemo(() => {
    const r = rng(5);
    return {
      geo: new THREE.BoxGeometry(0.03, 0.03, TRANSITION.streakLength),
      mat: new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.orange).lerp(new THREE.Color(PALETTE.blindingWhite), 0.5).multiplyScalar(2.5),
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
      }),
      items: Array.from({ length: TRANSITION.streakCount }, () => {
        const ang = r() * Math.PI * 2, rad = 1.2 + r() * 9;
        return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z: -r() * 120, speed: 0.6 + r() * 0.8 };
      }),
    };
  }, []);
  const m = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ camera }, rawDt) => {
    const g = group.current, s = flight.current.streaks;
    if (!g || !mesh.current) return;
    g.visible = s > 0.01;
    if (!g.visible) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    mat.opacity = s;
    const dt = Math.min(rawDt, 0.1);
    items.forEach((it, i) => {
      it.z += TRANSITION.streakSpeed * it.speed * dt;
      if (it.z > 2) it.z -= 122;
      m.makeTranslation(it.x, it.y, it.z);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={mesh} args={[geo, mat, items.length]} frustumCulled={false} renderOrder={90} raycast={() => null} />
    </group>
  );
}
