/** Pure web-mercator tile math + relief compositing helpers. No three.js / DOM. */

export const TILE_SIZE = 256

export const DARK: [number, number, number] = [0x3a, 0x2c, 0x1a]
export const LIGHT: [number, number, number] = [0xe8, 0xdc, 0xc0]

/** Slate-blue for rivers (antique-map water, not modern cyan). */
export const WATER_SLATE: [number, number, number] = [0x35, 0x5a, 0x74]
/** Opacity of the water tint over the relief (0..1). */
export const WATER_ALPHA = 0.85
/** USGS Hydro is fetched at a capped, lower zoom and stretched — far fewer
 *  requests than the hillshade grid (USGS rate-limits bursts), and rivers
 *  read fine at this resolution. */
export const Z_HYDRO_MAX = 12
/** True if a USGS Hydro overlay pixel is water (semi-opaque and blue-dominant;
 *  transparent elsewhere, so land never classifies). */
export function isHydroWater(r: number, g: number, b: number, a: number): boolean {
  return a > 40 && b > r + 2
}

// ── web-mercator tile helpers (copied from BattleBasemap.tsx; exported here) ──
export function mercY(latDeg: number): number {
  const lat = latDeg * (Math.PI / 180)
  return Math.log(Math.tan(Math.PI / 4 + lat / 2))
}
export function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z))
}
export function latToTileY(lat: number, z: number): number {
  const r = lat * (Math.PI / 180)
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z))
}
export function tileXToLng(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180
}
export function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/** Hillshade zoom: ~8 tiles across the coverage (finer than the old ~5), so the
 *  static texture stays sharp across the bounded free-zoom. Clamped to [7, 16]. */
export function pickHillshadeZoom(coverageLngDeg: number, tilesAcross = 8, maxZoom = 16): number {
  const z = Math.round(Math.log2((360 * tilesAcross) / coverageLngDeg))
  return Math.max(7, Math.min(maxZoom, z))
}

/** Luminance → parchment duotone. Pure; always reads raw RGB (never re-grades). */
export function duotone(r: number, g: number, b: number): [number, number, number] {
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return [
    Math.round(DARK[0] + (LIGHT[0] - DARK[0]) * l),
    Math.round(DARK[1] + (LIGHT[1] - DARK[1]) * l),
    Math.round(DARK[2] + (LIGHT[2] - DARK[2]) * l),
  ]
}

/** Perceptual luminance 0..1. */
export function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Contrast expansion pivoting on `mid` (mid maps to itself). Esri hillshade
 *  data clusters near 0.85–1.0, so pivoting on mid=0.93 keeps highlands bright
 *  parchment while spreading the shadow detail. */
export function contrastStretch(l: number, k = 12, mid = 0.93): number {
  return Math.min(1, Math.max(0, (l - mid) * k + mid))
}

/** Linear tone ramp dark→light at luminance l. */
export function toneRamp(l: number, dark: readonly [number, number, number], light: readonly [number, number, number]): [number, number, number] {
  return [
    Math.round(dark[0] + (light[0] - dark[0]) * l),
    Math.round(dark[1] + (light[1] - dark[1]) * l),
    Math.round(dark[2] + (light[2] - dark[2]) * l),
  ]
}

/** Destination rect (in the hillshade-addressed canvas) for an overlay tile
 *  at the coarser zoom zLo. Both sources are web-mercator, so a zLo tile covers
 *  exactly 2^(zHi−zLo) hillshade tiles — integer-aligned, no resampling drift. */
export function terrainDestRect(
  txLo: number, tyLo: number, zLo: number,
  cov: { z: number; xMin: number; yMin: number },
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.pow(2, cov.z - zLo)
  return {
    dx: (txLo * scale - cov.xMin) * TILE_SIZE,
    dy: (tyLo * scale - cov.yMin) * TILE_SIZE,
    dw: scale * TILE_SIZE,
    dh: scale * TILE_SIZE,
  }
}
