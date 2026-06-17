/**
 * BattleBasemap — stitches Esri World Terrain Base XYZ tiles into a THREE.CanvasTexture
 * and drapes them onto a lat/lng grid patch on the globe, providing a clean
 * cartographic alternative to the Google Photorealistic 3D Tiles.
 *
 * Mounted from GlobeScene only when mode === 'battle' && battleBasemap === 'topo'.
 * On mount: enables flat mode so arrows/annotations sit on the ellipsoid surface.
 * On unmount: disables flat mode so terrain draping resumes.
 *
 * Tile source: Esri World Terrain Base (shaded relief + water, no labels).
 * Fallback: Esri World Hillshade (pure relief, no water) if Terrain Base fails.
 * Attribution is shown in BattleOverlay when topo is active.
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
import { setFlatMode } from './useTerrainHeights'

// ─── Tile math helpers ────────────────────────────────────────────────────────

/** Web-mercator Y for a latitude (in radians), unbounded. */
function mercY(latDeg: number): number {
  const lat = latDeg * (Math.PI / 180)
  return Math.log(Math.tan(Math.PI / 4 + lat / 2))
}

/** Tile column (x) for a longitude at zoom z. */
function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z))
}

/** Tile row (y) for a latitude at zoom z (slippy map convention). */
function latToTileY(lat: number, z: number): number {
  const latRad = lat * (Math.PI / 180)
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, z),
  )
}

/** Longitude of the left edge of tile (x, z). */
function tileXToLng(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

/** Latitude of the top edge of tile (y, z). */
function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/** Pick a zoom level so that the angular coverage spans ~5 tiles horizontally.
 *  tile lng-span at z = 360 / 2^z. Clamped to [7, 15]. */
function pickZoom(coverageLngDeg: number): number {
  // We want ~5 tiles across: tileLngSpan * 5 ≈ coverageLngDeg
  // → 360 / 2^z * 5 ≈ coverageLngDeg → z ≈ log2(360 * 5 / coverageLngDeg)
  const z = Math.round(Math.log2((360 * 5) / coverageLngDeg))
  return Math.max(7, Math.min(15, z))
}

/** Build geometry: lat/lng grid patch with mercator V mapping.
 *  Vertices at geodeticToVector3(lat, lng, 1.0001) — slightly above the sepia
 *  sphere, and in the SAME geodetic frame as the battle arrows so imagery and
 *  arrows stay registered when toggling imagery↔topo (see geo.ts). */
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

const TILE_SIZE = 256
const PLACEHOLDER_COLOR = '#d9c9a8'

// Tile URL builders
const ESRI_TERRAIN_BASE = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/${z}/${y}/${x}`

const ESRI_HILLSHADE = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Hillshade/MapServer/tile/${z}/${y}/${x}`

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
  const z = pickZoom(lngDelta * 2)

  const latMin = center.lat - latDelta
  const latMax = center.lat + latDelta
  const lngMin = center.lng - lngDelta
  const lngMax = center.lng + lngDelta

  const xMin = lngToTileX(lngMin, z)
  const xMax = lngToTileX(lngMax, z)
  const yMin = latToTileY(latMax, z) // note: tile y increases southward
  const yMax = latToTileY(latMin, z)

  const tileLngMin = tileXToLng(xMin, z)
  const tileLngMax = tileXToLng(xMax + 1, z)
  const tileLatMax = tileYToLat(yMin, z)
  const tileLatMin = tileYToLat(yMax + 1, z)

  return { z, xMin, xMax, yMin, yMax, lngMin: tileLngMin, lngMax: tileLngMax, latMin: tileLatMin, latMax: tileLatMax }
}

// ─── Module-level tile cache ──────────────────────────────────────────────────

interface CacheEntry {
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture | null
  provider: string
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

  const canvas = document.createElement('canvas')
  canvas.width = cols * TILE_SIZE
  canvas.height = rows * TILE_SIZE
  // Fill with parchment placeholder so unfilled tiles show as neutral
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PLACEHOLDER_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const entry: CacheEntry = { canvas, texture: null, provider: 'esri-terrain', complete: false }
  tileCache.set(key, entry)
  cacheKeys.push(key)
  return entry
}

// Track in-flight fetches so StrictMode double-invocation doesn't double-fetch
const inFlight = new Set<string>()

/**
 * Fetch all tiles in parallel, drawing each into the canvas as it arrives.
 * Calls onTileDrawn after each successful tile paint (throttled by caller).
 * Returns the provider string ('esri-terrain' | 'esri-hillshade').
 */
async function fetchAndStitchProgressive(
  cov: TileCoverage,
  canvas: HTMLCanvasElement,
  onTileDrawn: () => void,
): Promise<string> {
  const ctx = canvas.getContext('2d')!
  let provider = 'esri-terrain'
  let triedFallback = false

  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

  const fetchTile = async (tx: number, ty: number): Promise<void> => {
    const dx = (tx - cov.xMin) * TILE_SIZE
    const dy = (ty - cov.yMin) * TILE_SIZE

    try {
      const img = await loadImage(ESRI_TERRAIN_BASE(cov.z, ty, tx))
      ctx.drawImage(img, dx, dy)
      onTileDrawn()
    } catch {
      // Esri Terrain Base failed — try hillshade fallback
      if (!triedFallback) {
        triedFallback = true
        provider = 'esri-hillshade'
      }
      try {
        const img = await loadImage(ESRI_HILLSHADE(cov.z, ty, tx))
        ctx.drawImage(img, dx, dy)
        onTileDrawn()
      } catch {
        console.warn(`[BattleBasemap] tile ${cov.z}/${ty}/${tx} failed on both providers`)
      }
    }
  }

  // Launch ALL tile fetches in parallel
  const fetches: Promise<void>[] = []
  for (let ty = cov.yMin; ty <= cov.yMax; ty++) {
    for (let tx = cov.xMin; tx <= cov.xMax; tx++) {
      fetches.push(fetchTile(tx, ty))
    }
  }
  await Promise.allSettled(fetches)

  return provider
}

const UPDATE_INTERVAL_MS = 250 // ≤4 updates/sec

/**
 * Exported prefetch function. Call on battle entry to warm the tile cache
 * before the user toggles topo. Safe to call multiple times (cache check first,
 * in-flight dedup via Set). Runs entirely in the background.
 */
export function prefetchBasemap(battle: Battle, site: LatLng): void {
  const rawExtent = battleExtent(battle, site)
  const angularRadius = Math.max(0.0015, Math.min(0.08, rawExtent * 2.5))
  const cov = computeCoverage(site, angularRadius)
  const key = cacheKey(battle.name, cov.z)

  if (tileCache.has(key) || inFlight.has(key)) return

  inFlight.add(key)
  const cols = cov.xMax - cov.xMin + 1
  const rows = cov.yMax - cov.yMin + 1
  const entry = getOrCreateCacheEntry(key, cols, rows)

  fetchAndStitchProgressive(cov, entry.canvas, () => {
    // Prefetch: no texture ref yet, just ensure canvas has data
  }).then((provider) => {
    entry.provider = provider
    entry.complete = true
  }).catch((err) => {
    console.warn('[BattleBasemap] prefetch failed:', err)
  }).finally(() => {
    inFlight.delete(key)
  })
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
    const angularRadius = Math.max(0.0015, Math.min(0.08, rawExtent * 2.5))
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

    // Create or reuse the CanvasTexture
    if (!entry.texture) {
      const tex = new THREE.CanvasTexture(entry.canvas)
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
      if (entry.texture) entry.texture.needsUpdate = true
    }

    fetchAndStitchProgressive(coverage, entry.canvas, throttledUpdate)
      .then((provider) => {
        entry.provider = provider
        entry.complete = true
        if (entry.texture) entry.texture.needsUpdate = true
        // Update attribution canvas property for BattleOverlay
        ;(entry.canvas as HTMLCanvasElement & { _provider?: string })._provider = provider
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
