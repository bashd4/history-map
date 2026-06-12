/**
 * BattleBasemap — stitches Esri World Topo XYZ tiles into a THREE.CanvasTexture
 * and drapes them onto a lat/lng grid patch on the globe, providing a clean
 * cartographic alternative to the Google Photorealistic 3D Tiles.
 *
 * Mounted from GlobeScene only when mode === 'battle' && battleBasemap === 'topo'.
 * On mount: enables flat mode so arrows/annotations sit on the ellipsoid surface.
 * On unmount: disables flat mode so terrain draping resumes.
 *
 * Tile source: Esri World Topo Map (z/y/x order).
 * Fallback: OpenTopoMap (z/x/y order) if Esri tiles fail CORS.
 * Attribution is shown in BattleOverlay when topo is active.
 *
 * Mercator UV mapping: the patch geometry maps V using web-mercator Y so that
 * tiles (which are mercator-projected) align without visible distortion.
 */

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Battle, LatLng } from '../data/schema'
import { latLngToVector3 } from '../lib/geo'
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

/** Pick a zoom level so that the angular coverage spans ~6 tiles horizontally.
 *  tile lng-span at z = 360 / 2^z. Clamped to [7, 15]. */
function pickZoom(coverageLngDeg: number): number {
  // We want ~6 tiles across: tileLngSpan * 6 ≈ coverageLngDeg
  // → 360 / 2^z * 6 ≈ coverageLngDeg → z ≈ log2(360 * 6 / coverageLngDeg)
  const z = Math.round(Math.log2((360 * 6) / coverageLngDeg))
  return Math.max(7, Math.min(15, z))
}

/** Build geometry: lat/lng grid patch with mercator V mapping.
 *  Vertices at latLngToVector3(lat, lng, 1.0001) — slightly above sepia sphere. */
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
      const vt = latLngToVector3(lat, lng, 1.0001)

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

const ESRI_TOPO = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`

const OPEN_TOPO = (z: number, x: number, y: number) =>
  `https://tile.opentopomap.org/${z}/${x}/${y}.png`

interface TileCoverage {
  z: number
  xMin: number; xMax: number
  yMin: number; yMax: number
  /** Tile-bbox in lng/lat */
  lngMin: number; lngMax: number
  latMin: number; latMax: number
}

function computeCoverage(center: LatLng, angularRadius: number): TileCoverage {
  // Angular radius (radians) → degrees on the sphere at this latitude is
  // approximately equal for lng, but we need to account for lat.
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

async function fetchAndStitch(cov: TileCoverage): Promise<HTMLCanvasElement> {
  const cols = cov.xMax - cov.xMin + 1
  const rows = cov.yMax - cov.yMin + 1
  const canvas = document.createElement('canvas')
  canvas.width = cols * TILE_SIZE
  canvas.height = rows * TILE_SIZE
  const ctx = canvas.getContext('2d')!

  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

  const tiles: Array<{ x: number; y: number; img: HTMLImageElement }> = []
  let useOpenTopo = false

  for (let ty = cov.yMin; ty <= cov.yMax; ty++) {
    for (let tx = cov.xMin; tx <= cov.xMax; tx++) {
      let img: HTMLImageElement
      try {
        const url = ESRI_TOPO(cov.z, ty, tx)
        img = await loadImage(url)
      } catch {
        // Esri CORS failure — fall back to OpenTopoMap
        useOpenTopo = true
        const url = OPEN_TOPO(cov.z, tx, ty)
        img = await loadImage(url)
      }
      tiles.push({ x: tx, y: ty, img })
    }
  }

  for (const { x, y, img } of tiles) {
    const dx = (x - cov.xMin) * TILE_SIZE
    const dy = (y - cov.yMin) * TILE_SIZE
    ctx.drawImage(img, dx, dy)
  }

  // Expose which provider was used as a canvas property for attribution
  ;(canvas as HTMLCanvasElement & { _provider?: string })._provider = useOpenTopo ? 'opentopomap' : 'esri'

  return canvas
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BattleBasemapProps {
  battle: Battle
  site: LatLng
}

export function BattleBasemap({ battle, site }: BattleBasemapProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texRef = useRef<THREE.CanvasTexture | null>(null)
  const geoRef = useRef<THREE.BufferGeometry | null>(null)
  const loadedRef = useRef(false)

  // Compute coverage once (battle/site never change during a battle session)
  const coverage = useMemo(() => {
    const rawExtent = battleExtent(battle, site)
    const angularRadius = Math.max(0.0015, Math.min(0.08, rawExtent * 2.5))
    return computeCoverage(site, angularRadius)
  }, [battle, site])

  // Build geometry (based on tile bbox, not coverage input)
  const geometry = useMemo(() => {
    const geo = buildPatchGeometry(
      coverage.latMin, coverage.latMax,
      coverage.lngMin, coverage.lngMax,
      48, 48,
    )
    geoRef.current = geo
    return geo
  }, [coverage])

  // Enable flat mode on mount, disable on unmount
  useEffect(() => {
    setFlatMode(true)
    return () => {
      setFlatMode(false)
    }
  }, [])

  // Fetch and stitch tiles
  useEffect(() => {
    loadedRef.current = false
    let cancelled = false

    fetchAndStitch(coverage).then((canvas) => {
      if (cancelled) return
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      texRef.current = tex
      loadedRef.current = true
    }).catch((err) => {
      if (!cancelled) console.warn('[BattleBasemap] tile fetch failed:', err)
    })

    return () => {
      cancelled = true
      if (texRef.current) {
        texRef.current.dispose()
        texRef.current = null
      }
    }
  }, [coverage])

  // Apply texture to mesh once loaded
  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh || !loadedRef.current || !texRef.current) return
    const mat = mesh.material as THREE.MeshBasicMaterial
    if (mat.map === texRef.current) return
    mat.map = texRef.current
    mat.needsUpdate = true
  })

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geoRef.current?.dispose()
    }
  }, [])

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
