/** Pure geometry for battle map furniture (scale bar + compass). No three.js. */

/** Globe scene-radius 1 == this many metres. */
export const R_EARTH = 6_371_000

/** Ground metres covered by one screen pixel for a straight-down camera.
 *  Visible vertical span = 2·dist·tan(fov/2); divide by viewport height in px.
 *  `dist` is the camera→target distance in globe radii (1 = R_EARTH metres). */
export function metersPerPixel(distRadii: number, fovRad: number, viewportH: number): number {
  return (2 * distRadii * Math.tan(fovRad / 2) * R_EARTH) / viewportH
}

export interface ScaleChoice {
  meters: number
  pixels: number
  label: string
}

/** Largest "nice" ground distance (1/2/5 × 10^n metres) whose bar is ≤ maxPx wide. */
export function niceScaleDistance(metersPerPx: number, maxPx: number): ScaleChoice {
  const maxMeters = metersPerPx * maxPx
  const base = Math.pow(10, Math.floor(Math.log10(maxMeters)))
  const meters =
    5 * base <= maxMeters ? 5 * base : 2 * base <= maxMeters ? 2 * base : base
  const pixels = meters / metersPerPx
  const label = meters >= 1000 ? `${meters / 1000} km` : `${meters} m`
  return { meters, pixels, label }
}

/** Clockwise screen-rotation (radians) from "up" to the vector (from→to), in a
 *  y-grows-downward pixel space. 0 = up, +π/2 = right. The compass rose applies
 *  this so its needle points to true north on screen. */
export function screenAngleFromUp(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(toX - fromX, -(toY - fromY))
}
