// Camera framing maths shared by the orbit camera and the space scene. Spec §4.3.
import * as THREE from "three";
import { BOARD, CAMERA } from "@/config/chess.config";

export const DEG = Math.PI / 180;

/** Distance from the board centre: the configured distance, or further on narrow screens so the board fits. */
export function fitDistance(aspect: number): number {
  const elev = CAMERA.defaultElevationDeg * DEG;
  const halfBoard = 4 * BOARD.squareSize + BOARD.frameWidth;
  const halfH = Math.atan(Math.tan((CAMERA.fovDeg / 2) * DEG) * aspect);
  return Math.max(CAMERA.distance, (halfBoard * CAMERA.fitMargin) / Math.tan(halfH) + halfBoard * Math.cos(elev));
}

/** Camera position for an orbit angle (0 = White's side) and elevation, at a distance. */
export function orbitPosition(azimuth: number, elevation: number, distance: number, out = new THREE.Vector3()) {
  return out.set(
    distance * Math.cos(elevation) * Math.sin(azimuth),
    distance * Math.sin(elevation),
    distance * Math.cos(elevation) * Math.cos(azimuth),
  );
}

/**
 * World position of something that should appear at screen point (sx, sy) in -1..1 units
 * when the camera is at the default angle, `range` units away from the default camera.
 */
export function placeAtDefaultView(aspect: number, sx: number, sy: number, range: number): THREE.Vector3 {
  const cam = new THREE.PerspectiveCamera(CAMERA.fovDeg, aspect, CAMERA.near, CAMERA.far);
  orbitPosition(0, CAMERA.defaultElevationDeg * DEG, fitDistance(aspect), cam.position);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  const dir = new THREE.Vector3(sx, sy, 0.5).unproject(cam).sub(cam.position).normalize();
  return cam.position.clone().addScaledVector(dir, range);
}

/** Half of the narrower field of view, in radians (used to size Earth and Moon on any screen). */
export function narrowHalfFov(aspect: number): number {
  const halfV = (CAMERA.fovDeg / 2) * DEG;
  return Math.min(halfV, Math.atan(Math.tan(halfV) * aspect));
}
