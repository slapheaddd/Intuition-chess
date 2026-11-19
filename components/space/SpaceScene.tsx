// Stars, nebula, Earth, Moon, sun light; world-fixed. Spec §4.
// Everything here is fixed in the world: as the camera orbits, it slides across the view.
"use client";
import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOARD_LIGHT, EARTH, MOON, SUN } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { DEG, narrowHalfFov, placeAtDefaultView } from "@/components/camera/framing";
import Earth from "./Earth";
import GlowPool from "./GlowPool";
import Moon from "./Moon";
import Nebula from "./Nebula";
import Stars from "./Stars";
import SunFlare from "./SunFlare";

/** Unit vector from the board towards the sun. */
export const SUN_DIR = new THREE.Vector3(
  Math.cos(SUN.elevationDeg * DEG) * Math.sin(SUN.azimuthDeg * DEG),
  Math.sin(SUN.elevationDeg * DEG),
  Math.cos(SUN.elevationDeg * DEG) * Math.cos(SUN.azimuthDeg * DEG),
);

/** Where Earth and the Moon sit, for this screen shape (used by the scene and by the dive). */
export function useSpaceLayout() {
  const { width, height } = useThree((s) => s.size);
  return useMemo(() => {
    const aspect = width / height;
    const fov = narrowHalfFov(aspect);
    return {
      earthPos: placeAtDefaultView(aspect, EARTH.screenX, EARTH.screenY, EARTH.distance),
      earthRadius: EARTH.distance * Math.sin(fov * EARTH.sizeOfView),
      moonPos: placeAtDefaultView(aspect, MOON.screenX, MOON.screenY, MOON.distance),
      moonRadius: MOON.distance * Math.sin(fov * MOON.sizeOfView),
    };
  }, [width, height]);
}

/**
 * `active`: shown (it stays mounted while hidden so returning never waits).
 * `offset`: during a dive Earth and the Moon move towards the board -- the same as the
 * board flying towards Earth -- while the stars and the sunlight stay put.
 */
export default function SpaceScene({ active = true, offset }: { active?: boolean; offset?: MutableRefObject<THREE.Vector3> }) {
  const layout = useSpaceLayout();
  const planets = useRef<THREE.Group>(null);
  useFrame(() => { if (planets.current && offset) planets.current.position.copy(offset.current); });
  const sunPos = useMemo(() => SUN_DIR.clone().multiplyScalar(SUN.distance), []);
  const earthLight = useMemo(() => layout.earthPos.clone().normalize().multiplyScalar(SUN.distance), [layout]);

  return (
    <group visible={active}>
      <Nebula />
      <Stars />
      <group ref={planets}>
        <Earth position={layout.earthPos} radius={layout.earthRadius} sunDir={SUN_DIR} />
        <Moon position={layout.moonPos} radius={layout.moonRadius} />
      </group>
      <GlowPool />
      <SunFlare sunDir={SUN_DIR} />

      {/* Sunlight: one main directional light, low, long shadows (§3.3). */}
      <directionalLight position={sunPos} intensity={SUN.intensity} color={PALETTE.blindingWhite}
        castShadow shadow-mapSize={[SUN.shadowMapSize, SUN.shadowMapSize]} shadow-bias={SUN.shadowBias}
        shadow-camera-left={-SUN.shadowExtent} shadow-camera-right={SUN.shadowExtent}
        shadow-camera-top={SUN.shadowExtent} shadow-camera-bottom={-SUN.shadowExtent}
        shadow-camera-near={1} shadow-camera-far={SUN.distance * 2} />
      {/* Soft ambient glow from the Earth and the nebula (§3.3). */}
      <directionalLight position={earthLight} intensity={BOARD_LIGHT.earthGlow} color={PALETTE.deepBlue} />
      <hemisphereLight args={[PALETTE.rustyPurple, PALETTE.deepBlue, BOARD_LIGHT.nebulaGlow]} />
      <ambientLight intensity={BOARD_LIGHT.ambient} color={PALETTE.deepBlue} />
    </group>
  );
}
