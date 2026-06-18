/**
 * BattleBasemap — composites two Esri shaded-relief XYZ sources into a
 * THREE.CanvasTexture and drapes them onto a lat/lng grid patch on the globe,
 * providing a sepia cartographic alternative to the Google Photorealistic 3D Tiles.
 *
 * Mounted from GlobeScene only when mode === 'battle' && battleBasemap === 'relief'.
 * On mount: enables flat mode so arrows/annotations sit on the ellipsoid surface.
 * On unmount: disables flat mode so terrain draping resumes.
 *
 * Tile sources (kept in SEPARATE canvases, never multiplied together):
 * - Esri World Hillshade   — grayscale relief, drawn 1:1 into the `hill` canvas.
 * - Esri World Terrain Base — natural color, drawn stretched into the `terra`
 *   canvas; used ONLY to classify water per-pixel (never shown directly), so the
 *   regional "map data not available" placeholder simply classifies as land.
 * `regrade()` then composites both into the parchment "display" canvas with a
 * TWO-TONE grade: contrast-stretched sepia for land, slate-blue for water.
 * Attribution is shown in BattleOverlay.
 *
 * Mercator UV mapping: the patch geometry maps V using web-mercator Y so that
 * tiles (which are mercator-projected) align without visible distortion.
 *
 * Performance:
 * - Module-level canvas/texture cache keyed by `${battleName}:${z}` — re-toggling is instant.
 * - Tiles load in parallel (Promise.allSettled); each tile draws into canvas as it arrives.
 * - texture.needsUpdate is throttled to ≤4 updates/sec so we don't thrash the GPU.
 * - Mesh mounts immediately with a parchment placeholder (#d9c9a8); fills in progressively.
 * - `prefetchBasemap(battle, site)` is exported for background pre-warming on battle entry.
 */

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Battle, LatLng } from '../data/schema'
import { geodeticToVector3 } from '../lib/geo'
import { battleExtent } from '../lib/battleExtent'
import {
  TILE_SIZE,
  Z_TERRAIN_MAX,
  mercY,
  lngToTileX,
  latToTileY,
  tileXToLng,
  tileYToLat,
  pickHillshadeZoom,
  terrainDestRect,
  luminance,
  contrastStretch,
  toneRamp,
  isWaterPixel,
  DARK,
  LIGHT,
  WATER_DARK,
  WATER_LIGHT,
} from '../lib/basemapTiles'
import { setFlatMode } from './useTerrainHeights'

// ─── Geometry ─────────────────────────────────────────────────────────────────

/** Build geometry: lat/lng grid patch with mercator V mapping.
 *  Vertices at geodeticToVector3(lat, lng, 1.0001) — slightly above the sepia
 *  sphere, and in the SAME geodetic frame as the battle arrows so imagery and
 *  arrows stay registered when toggling imagery↔relief (see geo.ts). */
function buildPatchGeometry(
  latMin: number, latMax: number,
  lngMin: number, lngMax: number,
  segsX: number, segsY: number,
): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const mercYMin = mercY(latMin)
  const mercYMax = mercY(latMax)

  for (let iy = 0; iy <= segsY; iy++) {
    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX
      const v = iy / segsY

      const lng = lngMin + u * (lngMax - lngMin)
      const lat = latMax - v * (latMax - latMin) // linear lat for position
      const vt = geodeticToVector3(lat, lng, 1.0001)

      positions.push(vt.x, vt.y, vt.z)

      // Mercator V so tile texels align correctly
      const mY = mercY(lat)
      const mv = (mercYMax - mY) / (mercYMax - mercYMin)
      uvs.push(u, 1 - mv)
    }
  }

  for (let iy = 0; iy < segsY; iy++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iy * (segsX + 1) + ix
      const b = a + 1
      const c = a + (segsX + 1)
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ─── Tile fetching + stitching ────────────────────────────────────────────────

const PARCHMENT_RGB = [0xd9, 0xc9, 0xa8] as const
const PLACEHOLDER_COLOR = `#${PARCHMENT_RGB.map((c) => c.toString(16).padStart(2, '0')).join('')}`

// Tile URL builders. Hillshade is the PRIMARY relief overlay; Terrain Base the underlay.
const ESRI_HILLSHADE = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/${z}/${y}/${x}`

const ESRI_TERRAIN_BASE = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/${z}/${y}/${x}`

interface TileCoverage {
  z: number
  xMin: number; xMax: number
  yMin: number; yMax: number
  /** Tile-bbox in lng/lat */
  lngMin: number; lngMax: number
  latMin: number; latMax: number
}

function computeCoverage(center: LatLng, angularRadius: number): TileCoverage {
  const latDelta = angularRadius * (180 / Math.PI)
  const lngDelta = angularRadius * (180 / Math.PI) / Math.cos(center.lat * (Math.PI / 180))

  const latMin = center.lat - latDelta
  const latMax = center.lat + latDelta
  const lngMin = center.lng - lngDelta
  const lngMax = center.lng + lngDelta

  let z = pickHillshadeZoom(lngDelta * 2, 10)

  let xMin = lngToTileX(lngMin, z)
  let xMax = lngToTileX(lngMax, z)
  let yMin = latToTileY(latMax, z) // note: tile y increases southward
  let yMax = latToTileY(latMin, z)

  // Cap the tile budget: drop a zoom until the patch fits in ≤100 tiles.
  while ((xMax - xMin + 1) * (yMax - yMin + 1) > 100 && z > 7) {
    z--
    xMin = lngToTileX(lngMin, z)
    xMax = lngToTileX(lngMax, z)
    yMin = latToTileY(latMax, z)
    yMax = latToTileY(latMin, z)
  }

  const tileLngMin = tileXToLng(xMin, z)
  const tileLngMax = tileXToLng(xMax + 1, z)
  const tileLatMax = tileYToLat(yMin, z)
  const tileLatMin = tileYToLat(yMax + 1, z)

  return { z, xMin, xMax, yMin, yMax, lngMin: tileLngMin, lngMax: tileLngMax, latMin: tileLatMin, latMax: tileLatMax }
}

// ─── Module-level tile cache ──────────────────────────────────────────────────

interface CacheEntry {
  /** Hillshade tiles only (grayscale relief), drawn 1:1 at cov.z. */
  hill: HTMLCanvasElement
  /** Terrain Base tiles only (natural color), stretched — water classification only. */
  terra: HTMLCanvasElement
  /** Two-tone-graded parchment canvas that backs the CanvasTexture. */
  display: HTMLCanvasElement
  texture: THREE.CanvasTexture | null
  complete: boolean
}

const MAX_CACHE = 4
// Order of insertion (oldest first) for eviction
const cacheKeys: string[] = []
const tileCache = new Map<string, CacheEntry>()

function cacheKey(battleName: string, z: number): string {
  return `${battleName}:${z}`
}

function evictOldestIfNeeded(): void {
  while (tileCache.size >= MAX_CACHE && cacheKeys.length > 0) {
    const oldest = cacheKeys.shift()!
    const entry = tileCache.get(oldest)
    if (entry?.texture) entry.texture.dispose()
    tileCache.delete(oldest)
  }
}

function getOrCreateCacheEntry(key: string, cols: number, rows: number): CacheEntry {
  if (tileCache.has(key)) return tileCache.get(key)!

  evictOldestIfNeeded()

  const w = cols * TILE_SIZE
  const h = rows * TILE_SIZE

  // Hillshade canvas: grayscale relief tiles; left transparent until tiles arrive.
  const hill = document.createElement('canvas')
  hill.width = w
  hill.height = h

  // Terrain canvas: natural-color tiles for water classification; left transparent.
  const terra = document.createElement('canvas')
  terra.width = w
  terra.height = h

  // Display canvas backs the texture; parchment-filled so pre-load looks parchment.
  const display = document.createElement('canvas')
  display.width = w
  display.height = h
  const dctx = display.getContext('2d')!
  dctx.fillStyle = PLACEHOLDER_COLOR
  dctx.fillRect(0, 0, w, h)

  const entry: CacheEntry = { hill, terra, display, texture: null, complete: false }
  tileCache.set(key, entry)
  cacheKeys.push(key)
  return entry
}

/**
 * Two-tone grade: composite the `hill` (relief) and `terra` (water-classification)
 * canvases into the parchment `display` canvas.
 *  - hill alpha 0 → opaque parchment placeholder (preserves the under-load look).
 *  - else: contrast-stretch the hillshade luminance, classify water from terra,
 *    and tone on the sepia (land) or slate-blue (water) ramp.
 */
function regrade(hill: HTMLCanvasElement, terra: HTMLCanvasElement, display: HTMLCanvasElement) {
  const hctx = hill.getContext('2d')!
  const tctx = terra.getContext('2d')!
  const dctx = display.getContext('2d')!
  const w = hill.width, h = hill.height

  const himg = hctx.getImageData(0, 0, w, h)
  const timg = tctx.getImageData(0, 0, w, h)
  const hd = himg.data
  const td = timg.data

  for (let i = 0; i < hd.length; i += 4) {
    if (hd[i + 3] === 0) {
      // Hillshade not drawn yet (or failed) → opaque parchment placeholder.
      hd[i] = PARCHMENT_RGB[0]; hd[i + 1] = PARCHMENT_RGB[1]; hd[i + 2] = PARCHMENT_RGB[2]; hd[i + 3] = 255
      continue
    }
    const L = contrastStretch(luminance(hd[i], hd[i + 1], hd[i + 2]))
    const water = td[i + 3] > 0 && isWaterPixel(td[i], td[i + 1], td[i + 2])
    const [r, g, b] = toneRamp(L, water ? WATER_DARK : DARK, water ? WATER_LIGHT : LIGHT)
    hd[i] = r; hd[i + 1] = g; hd[i + 2] = b; hd[i + 3] = 255
  }
  dctx.putImageData(himg, 0, 0)
}

// Track in-flight fetches so StrictMode double-invocation doesn't double-fetch
const inFlight = new Set<string>()

/**
 * Fetch both Esri sources into their own canvases (source-over, never multiplied):
 * Hillshade into `hill` 1:1 at cov.z; Terrain Base into `terra` stretched from
 * zLo (≤ Z_TERRAIN_MAX). Both passes run in parallel. Hillshade failures leave
 * that cell transparent (regrade fills parchment); terra failures/placeholders
 * are harmless since terra is classification-only.
 * Calls onTileDrawn after each tile paint (throttled by caller).
 */
async function fetchAndStitchProgressive(
  cov: TileCoverage,
  hillCanvas: HTMLCanvasElement,
  terraCanvas: HTMLCanvasElement,
  onTileDrawn: () => void,
): Promise<void> {
  const hctx = hillCanvas.getContext('2d')!
  const tctx = terraCanvas.getContext('2d')!

  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

  const all: Promise<void>[] = []

  // ── Terrain Base pass: drawn into `terra`, stretched from zLo (≤ Z_TERRAIN_MAX) ──
  const zLo = Math.min(cov.z, Z_TERRAIN_MAX)
  const txLoMin = lngToTileX(cov.lngMin, zLo)
  const txLoMax = lngToTileX(cov.lngMax, zLo)
  const tyLoMin = latToTileY(cov.latMax, zLo) // tile y increases southward
  const tyLoMax = latToTileY(cov.latMin, zLo)

  for (let ty = tyLoMin; ty <= tyLoMax; ty++) {
    for (let tx = txLoMin; tx <= txLoMax; tx++) {
      const txc = tx, tyc = ty
      all.push(
        loadImage(ESRI_TERRAIN_BASE(zLo, tyc, txc))
          .then((img) => {
            const { dx, dy, dw, dh } = terrainDestRect(txc, tyc, zLo, cov)
            tctx.drawImage(img, dx, dy, dw, dh)
            onTileDrawn()
          })
          .catch(() => {
            // Terrain Base classifies water only — ignore failures/placeholders.
          }),
      )
    }
  }

  // ── Hillshade pass: drawn into `hill` 1:1 at cov.z ──
  for (let ty = cov.yMin; ty <= cov.yMax; ty++) {
    for (let tx = cov.xMin; tx <= cov.xMax; tx++) {
      const txc = tx, tyc = ty
      all.push(
        loadImage(ESRI_HILLSHADE(cov.z, tyc, txc))
          .then((img) => {
            hctx.drawImage(img, (txc - cov.xMin) * TILE_SIZE, (tyc - cov.yMin) * TILE_SIZE)
            onTileDrawn()
          })
          .catch(() => {
            // Hillshade is the critical relief layer; cell stays transparent.
            console.warn(`[BattleBasemap] hillshade tile ${cov.z}/${tyc}/${txc} failed`)
          }),
      )
    }
  }

  await Promise.allSettled(all)
}

const UPDATE_INTERVAL_MS = 250 // ≤4 updates/sec

/**
 * Exported prefetch function. Call on battle entry to warm the tile cache
 * before the user toggles relief. Safe to call multiple times (cache check first,
 * in-flight dedup via Set). Runs entirely in the background.
 */
export function prefetchBasemap(battle: Battle, site: LatLng): void {
  const rawExtent = battleExtent(battle, site)
  const angularRadius = Math.max(0.0015, Math.min(0.08, rawExtent * 2.0))
  const cov = computeCoverage(site, angularRadius)
  const key = cacheKey(battle.name, cov.z)

  if (tileCache.has(key) || inFlight.has(key)) return

  inFlight.add(key)
  const cols = cov.xMax - cov.xMin + 1
  const rows = cov.yMax - cov.yMin + 1
  const entry = getOrCreateCacheEntry(key, cols, rows)

  fetchAndStitchProgressive(cov, entry.hill, entry.terra, () => {
    // Prefetch: no texture ref yet, just warm the source canvases.
  }).then(() => {
    // Grade once so the cached display is ready when the component mounts.
    regrade(entry.hill, entry.terra, entry.display)
    entry.complete = true
  }).catch((err) => {
    console.warn('[BattleBasemap] prefetch failed:', err)
  }).finally(() => {
    inFlight.delete(key)
  })
}

/** Closest camera distance (globe radii) at which the chosen hillshade zoom still
 *  meets ~1 texel/screen-pixel, so OrbitControls can clamp zoom-in to avoid blur. */
export function reliefSharpFloor(battle: Battle, site: LatLng): number {
  const rawExtent = battleExtent(battle, site)
  const angularRadius = Math.max(0.0015, Math.min(0.08, rawExtent * 2.0))
  const cov = computeCoverage(site, angularRadius)
  // ground width of the patch (metres) / canvas px width = metres per texel
  const R_EARTH = 6_371_000
  const lngSpanDeg = cov.lngMax - cov.lngMin
  const midLatRad = site.lat * (Math.PI / 180)
  const groundWidthM = (lngSpanDeg * (Math.PI / 180)) * Math.cos(midLatRad) * R_EARTH
  const canvasPxW = (cov.xMax - cov.xMin + 1) * TILE_SIZE
  const metresPerTexel = groundWidthM / canvasPxW
  // invert metersPerPixel(dist,fov,h)= (2 dist tan(fov/2) R)/h  → solve for dist
  const fov = 45 * (Math.PI / 180)
  const nominalH = 900 // nominal viewport height (px) — sets the texel↔screen-pixel reference
  return (metresPerTexel * nominalH) / (2 * Math.tan(fov / 2) * R_EARTH)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BattleBasemapProps {
  battle: Battle
  site: LatLng
}

export function BattleBasemap({ battle, site }: BattleBasemapProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texRef = useRef<THREE.CanvasTexture | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const mountedRef = useRef(true)

  // Compute coverage once (battle/site never change during a battle session)
  const coverage = useMemo(() => {
    const rawExtent = battleExtent(battle, site)
    const angularRadius = Math.max(0.0015, Math.min(0.08, rawExtent * 2.0))
    return computeCoverage(site, angularRadius)
  }, [battle, site])

  // Build geometry (based on tile bbox, not coverage input)
  const geometry = useMemo(() => {
    return buildPatchGeometry(
      coverage.latMin, coverage.latMax,
      coverage.lngMin, coverage.lngMax,
      48, 48,
    )
  }, [coverage])

  // Enable flat mode on mount, disable on unmount
  useEffect(() => {
    setFlatMode(true)
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      setFlatMode(false)
    }
  }, [])

  // Fetch/stitch tiles — use cache when available
  useEffect(() => {
    const key = cacheKey(battle.name, coverage.z)
    const cols = coverage.xMax - coverage.xMin + 1
    const rows = coverage.yMax - coverage.yMin + 1

    // Reuse or create cache entry
    const entry = getOrCreateCacheEntry(key, cols, rows)

    // Create or reuse the CanvasTexture (backed by the graded display canvas)
    if (!entry.texture) {
      const tex = new THREE.CanvasTexture(entry.display)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      entry.texture = tex
    }
    texRef.current = entry.texture

    // Apply placeholder texture immediately so mesh shows parchment while loading
    const mesh = meshRef.current
    if (mesh) {
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.map = entry.texture
      mat.needsUpdate = true
    }

    if (entry.complete || inFlight.has(key)) return

    // Launch tile fetch
    inFlight.add(key)

    let tileDrawn = false
    const throttledUpdate = () => {
      tileDrawn = true
      const now = performance.now()
      if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return
      lastUpdateRef.current = now
      regrade(entry.hill, entry.terra, entry.display)
      if (entry.texture) entry.texture.needsUpdate = true
    }

    fetchAndStitchProgressive(coverage, entry.hill, entry.terra, throttledUpdate)
      .then(() => {
        entry.complete = true
        regrade(entry.hill, entry.terra, entry.display)
        if (entry.texture) entry.texture.needsUpdate = true
      })
      .catch((err) => {
        console.warn('[BattleBasemap] tile fetch failed:', err)
      })
      .finally(() => {
        inFlight.delete(key)
        if (!tileDrawn && entry.texture) entry.texture.needsUpdate = true
      })
  }, [coverage, battle.name])

  // Apply texture to mesh every frame while loading (for progressive updates)
  useFrame(() => {
    const mesh = meshRef.current
    const tex = texRef.current
    if (!mesh || !tex) return
    const mat = mesh.material as THREE.MeshBasicMaterial
    if (mat.map !== tex) {
      mat.map = tex
      mat.needsUpdate = true
    }
  })

  // Cleanup geometry on unmount (but NOT the cached texture)
  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={1}>
      <meshBasicMaterial
        transparent
        opacity={1}
        depthTest={false}
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}
