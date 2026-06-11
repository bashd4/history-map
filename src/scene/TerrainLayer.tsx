/**
 * TerrainLayer — streams Google Photorealistic 3D Tiles in battle mode,
 * and also during journey-mode dwell at a battle stop (preload).
 *
 * ECEF alignment: ECEF +Z is the north pole, +X is (lat0, lng0).
 * Our scene has +Y north (latLngToVector3(0,0) = (1,0,0), latLngToVector3(90,0) = (0,1,0)).
 * rotation={[-Math.PI/2, 0, 0]} maps ECEF +Z → scene +Y (north pole correct)
 * and ECEF +X → scene +X (equator/prime-meridian correct).
 *
 * Verified: latLngToVector3(0,0) = (+1,0,0) matches ECEF (1,0,0) after rotation.
 * ECEF Austerlitz (49.13N, 16.76E) appears at the correct Czech countryside position.
 *
 * Import path for plugins: '3d-tiles-renderer/plugins' re-exports from
 * '3d-tiles-renderer/core/plugins' and '3d-tiles-renderer/three/plugins'.
 * GoogleCloudAuthPlugin sets tiles.rootURL to the Google 3D Tiles API and manages
 * session tokens.
 *
 * TileCompressionPlugin REMOVED: it trades parse time for memory. With our small battle
 * scene memory is not the constraint — removing it speeds initial tile decode.
 *
 * Concurrency / cache defaults in 3d-tiles-renderer 0.4.x:
 *   downloadQueue.maxJobs = 25   → we set 24 (same ballpark, keeps socket headroom)
 *   parseQueue.maxJobs   = 5    → we set 4  (slightly tighter; parse is CPU-bound)
 *   lruCache.minSize     = 6000 → we set 900  (much smaller; we evict aggressively)
 *   lruCache.maxSize     = 8000 → we set 1500 (cap total tracked tiles)
 * NOTE: lruCache sizes are tile-count based (not bytes); for a focused battle scene
 * 900/1500 is ample and keeps memory bounded during repeated enter/exit cycles.
 *
 * Camera registration and resolution updates are handled automatically by the
 * r3f TilesRenderer wrapper (useFrame + useLayoutEffect in the component).
 *
 * Known library limitation (3d-tiles-renderer 0.4.x): tiles evicted from the
 * LRU cache mid-parse are not aborted by dispose() — acceptable, library-level;
 * revisit if repeated battle enter/exit cycling shows memory growth.
 *
 * Error handling lives in TerrainErrorBoundary (separate non-lazy module),
 * wrapped around this component at the call site in GlobeScene so chunk-load
 * failures of this lazy module are caught too.
 */

import { useContext, useEffect, useRef } from 'react'
import { PerspectiveCamera } from 'three'
import { useFrame } from '@react-three/fiber'
import { TilesPlugin, TilesRenderer, TilesRendererContext } from '3d-tiles-renderer/r3f'
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins'
import { latLngToVector3 } from '../lib/geo'

// ECEF radius in metres → scene units (globe radius = 1).
const ECEF_TO_SCENE = 1 / 6_378_137

export interface PreheatCoords {
  lat: number
  lng: number
}

/**
 * Registers a virtual PerspectiveCamera at the battle viewpoint so that while
 * we are still in journey mode (main camera at dwell altitude ~0.09) the tiles
 * renderer also prioritises LODs for the close-up battle viewpoint (~0.012 alt).
 * On battle entry or unmount the virtual camera is removed so LOD refocuses on
 * the real camera.
 *
 * This is a child of TilesRenderer so it can access TilesRendererContext.
 */
function PreheatCamera({ lat, lng }: PreheatCoords) {
  const tiles = useContext(TilesRendererContext)
  // battle dive altitude in scene units (~76 km above surface)
  const PREHEAT_ALT = 0.012
  const camRef = useRef<PerspectiveCamera | null>(null)

  useEffect(() => {
    if (!tiles) return

    // Position the virtual camera in scene (world) space the same way the main
    // r3f camera is positioned. The r3f TilesRenderer wrapper calls
    // tiles.setResolutionFromRenderer(camera, gl) with cameras in world space —
    // our group's matrixWorld transform is taken into account inside the tiles
    // LOD calculation, so world-space placement here is correct.
    const surfacePt = latLngToVector3(lat, lng, 1)
    const camPt = latLngToVector3(lat, lng, 1 + PREHEAT_ALT)

    const virtualCam = new PerspectiveCamera(45, 16 / 9, 0.0008, 100)
    virtualCam.position.copy(camPt)
    virtualCam.lookAt(surfacePt)
    virtualCam.updateMatrixWorld()
    camRef.current = virtualCam

    tiles.setCamera(virtualCam)
    tiles.setResolution(virtualCam, 1024, 600)

    return () => {
      tiles.deleteCamera(virtualCam)
      camRef.current = null
    }
  }, [tiles, lat, lng])

  // Keep the virtual camera's matrixWorld fresh each frame (needed so tiles
  // recalculates screen-space error correctly each update tick).
  useFrame(() => {
    camRef.current?.updateMatrixWorld()
  })

  return null
}

export interface TerrainLayerProps {
  /** Coords for a secondary virtual camera that preheats battle-viewpoint LODs
   *  while the main camera is still at journey dwell altitude. Pass undefined
   *  (or omit) once battle mode is active — the virtual cam is removed. */
  preheat?: PreheatCoords
  /** When true the tile group is invisible (tiles still stream). Used during
   *  journey-mode preload to avoid z-fighting with the full-size globe. */
  hidden?: boolean
}

export function TerrainLayer({ preheat, hidden = false }: TerrainLayerProps) {
  return (
    // rotation: ECEF +Z (north pole) → scene +Y; ECEF +X (lng0) → scene +X
    <group scale={ECEF_TO_SCENE} rotation={[-Math.PI / 2, 0, 0]} visible={!hidden}>
      {/*
       * errorTarget: lower = finer LODs. Ordering matters: the r3f wrapper
       * applies the errorTarget prop via useDeepOptions BEFORE the plugin's
       * init() runs, and GoogleCloudAuthPlugin.init() overwrites errorTarget
       * to 20 when useRecommendedSettings is on — silently discarding the
       * prop. useRecommendedSettings does nothing else in 0.4.28 (checked
       * source), so we disable it and own errorTarget={8} for finer detail
       * at battle altitude 0.012 (~76 km). Dropped from 12 → 8 for better
       * peripheral resolution; with the concurrency bump below this loads
       * at least as fast as the old config.
       *
       * downloadQueue-maxJobs / parseQueue-maxJobs: bump concurrency so
       * tiles downloaded during preload don't bottleneck the parse step.
       * lruCache-minSize / lruCache-maxSize: tighter bounds vs defaults
       * (6000/8000) since our battle scene is geographically focused.
       */}
      <TilesRenderer
        errorTarget={8}
        downloadQueue-maxJobs={24}
        parseQueue-maxJobs={4}
        lruCache-minSize={900}
        lruCache-maxSize={1500}
      >
        <TilesPlugin
          plugin={GoogleCloudAuthPlugin}
          args={[
            {
              apiToken: import.meta.env.VITE_TILES_KEY as string,
              useRecommendedSettings: false,
            },
          ]}
        />
        {/* Virtual preheat camera — only active during journey preload phase */}
        {preheat && <PreheatCamera lat={preheat.lat} lng={preheat.lng} />}
      </TilesRenderer>
    </group>
  )
}
