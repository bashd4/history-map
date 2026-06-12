/**
 * useTerrainHeights — terrain height sampler using raycasting against loaded
 * Google 3D Tiles meshes.
 *
 * Architecture:
 *  - TerrainHeightSampler: pure class; raycasts against tiles.group to get
 *    surface radius at (lat, lng). Results cached keyed by rounded coords.
 *    Cache cleared + points re-sampled on 'tiles-load-end' with 1.5 s debounce.
 *  - heightsVersion: zustand atom — incremented per refresh so React consumers
 *    can include it in useMemo/useEffect deps.
 *  - useTerrainHeightsVersion(): hook returning current version int. Include
 *    in useMemo deps wherever you want geometry to rebuild after a refresh.
 *
 * Fallback: no tiles (registry empty, tile meshes not yet loaded) → returns
 * ELLIPSOID_RADIUS (1.0) so behaviour is identical to the pre-drape code path.
 *
 * Consumers call sampler.sampleRadius(lat, lng) which does a fast Map lookup
 * after the first sample. Raycasting happens off the hot path (inside the
 * debounced event callback, or lazily on first request).
 */

import * as THREE from 'three'
import { create } from 'zustand'
import { latLngToVector3 } from '../lib/geo'
import { getActiveTiles } from './terrainRegistry'

// ~4km above the ellipsoid — high enough that the ray origin clears any tile.
const RAY_ORIGIN_RADIUS = 1.05
// ~0 to ~19 km expressed as scene-unit radii. Reject hits outside this band.
const MIN_RADIUS = 1.0
const MAX_RADIUS = 1.003

/**
 * Cache key for a (lat, lng) pair, stable to 5 decimal places
 * (~1 m resolution — well below tile resolution variation).
 */
export function terrainCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

// Scratch objects for raycasting — never allocate inside hot loops.
const _raycaster = new THREE.Raycaster()
const _origin = new THREE.Vector3()
const _direction = new THREE.Vector3()
const _globeCenter = new THREE.Vector3(0, 0, 0)

/**
 * Samples terrain surface radius at (lat, lng) by raycasting against the
 * loaded tile meshes in tiles.group.
 *
 * Returns a scene-unit radius (e.g. 1.000031 ≈ 200 m elevation).
 * Returns 1.0 (ellipsoid) when no tiles are loaded or the ray misses.
 */
export class TerrainHeightSampler {
  private cache = new Map<string, number>()
  /** Named point groups — each consumer owns a slot, merged on refresh. */
  private pointGroups = new Map<string, Array<{ lat: number; lng: number }>>()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private unlistenRef: (() => void) | null = null

  /** Current refresh version — consumers track this to know when to rebuild. */
  version = 0

  /**
   * Register a named group of (lat, lng) points to keep sampled.
   * Each consumer (arrows, annotations) owns a slot identified by `groupId`.
   * Multiple groups are merged before sampling — calling registerPoints with
   * the same groupId replaces that group's points.
   * Triggers an immediate lazy sample on first call.
   */
  registerPoints(groupId: string, points: Array<{ lat: number; lng: number }>): void {
    this.pointGroups.set(groupId, points)
    this._scheduleSample(0)
  }

  private get _allPoints(): Array<{ lat: number; lng: number }> {
    const merged: Array<{ lat: number; lng: number }> = []
    for (const pts of this.pointGroups.values()) merged.push(...pts)
    return merged
  }

  /**
   * Return the cached sampled radius for (lat, lng), or the ellipsoid default
   * (1.0) if not yet sampled.
   */
  sampleRadius(lat: number, lng: number): number {
    const key = terrainCacheKey(lat, lng)
    const cached = this.cache.get(key)
    if (cached !== undefined) return cached
    // Lazy: sample immediately (synchronously) on first miss.
    const r = this._raycast(lat, lng)
    this.cache.set(key, r)
    return r
  }

  /**
   * Attach to a tiles instance to listen for 'tiles-load-end' events.
   * Safe to call multiple times — old listener is removed first.
   */
  attachToTiles(tiles: unknown): void {
    this._detach()
    if (!tiles || typeof (tiles as { addEventListener?: unknown }).addEventListener !== 'function') return
    const t = tiles as { addEventListener: (e: string, cb: () => void) => void; removeEventListener: (e: string, cb: () => void) => void }
    const onLoadEnd = () => { this._scheduleSample(1500) }
    t.addEventListener('tiles-load-end', onLoadEnd)
    this.unlistenRef = () => t.removeEventListener('tiles-load-end', onLoadEnd)
  }

  detach(): void {
    this._detach()
  }

  private _detach(): void {
    if (this.unlistenRef) {
      this.unlistenRef()
      this.unlistenRef = null
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  private _scheduleSample(delayMs: number): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this._refreshAll()
    }, delayMs)
  }

  private _refreshAll(): void {
    const pts = this._allPoints
    if (pts.length === 0) return
    let changed = false
    for (const { lat, lng } of pts) {
      const key = terrainCacheKey(lat, lng)
      const prev = this.cache.get(key)
      const next = this._raycast(lat, lng)
      if (next !== prev) {
        this.cache.set(key, next)
        changed = true
      }
    }
    if (changed) {
      this.version += 1
      // Notify zustand store so React consumers re-render.
      useTerrainHeightsStore.setState({ version: this.version })
    }
  }

  private _raycast(lat: number, lng: number): number {
    const tiles = getActiveTiles()
    if (!tiles?.group) return 1.0

    // Ray: from above (radius 1.05) → toward globe center
    _origin.copy(latLngToVector3(lat, lng, RAY_ORIGIN_RADIUS))
    _direction.subVectors(_globeCenter, _origin).normalize()
    _raycaster.set(_origin, _direction)
    _raycaster.firstHitOnly = true

    let hits: THREE.Intersection[]
    try {
      hits = _raycaster.intersectObject(tiles.group, true)
    } catch {
      return this.cache.get(terrainCacheKey(lat, lng)) ?? 1.0
    }

    if (!hits.length) return this.cache.get(terrainCacheKey(lat, lng)) ?? 1.0

    const hitPoint = hits[0].point
    const r = hitPoint.length()
    // Clamp to sanity band — reject glitch hits
    if (r < MIN_RADIUS || r > MAX_RADIUS) {
      return this.cache.get(terrainCacheKey(lat, lng)) ?? 1.0
    }
    return r
  }
}

// ─── Module-level singleton sampler ──────────────────────────────────────────

export const terrainSampler = new TerrainHeightSampler()

// ─── Zustand store for version tracking ──────────────────────────────────────

interface TerrainHeightsState {
  version: number
}

export const useTerrainHeightsStore = create<TerrainHeightsState>(() => ({ version: 0 }))

/**
 * Hook: returns the current heights-refresh version number.
 * Include in useMemo deps to rebuild geometry after each tile refresh.
 */
export function useTerrainHeightsVersion(): number {
  return useTerrainHeightsStore((s) => s.version)
}
