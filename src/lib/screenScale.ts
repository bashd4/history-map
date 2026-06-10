import * as THREE from 'three'

/**
 * World-space scale giving a constant screen-space size for a unit-sized mesh:
 * scales with camera distance and the perspective frustum half-height.
 * `frac` is the desired fraction of frustum half-height; min/max clamp is a
 * safety net so the mesh never disappears or dominates the frame.
 */
export function screenScale(
  camera: THREE.Camera,
  worldPos: THREE.Vector3,
  frac: number,
  min: number,
  max: number,
): number {
  const d = camera.position.distanceTo(worldPos)
  const fov = (camera as THREE.PerspectiveCamera).fov ?? 45
  const s = d * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * frac
  return THREE.MathUtils.clamp(s, min, max)
}
