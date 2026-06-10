/**
 * TerrainLayer — streams Google Photorealistic 3D Tiles in battle mode.
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
 * session tokens. TileCompressionPlugin halves geometry memory.
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

import { TilesPlugin, TilesRenderer } from '3d-tiles-renderer/r3f'
import { GoogleCloudAuthPlugin, TileCompressionPlugin } from '3d-tiles-renderer/plugins'

// ECEF radius in metres → scene units (globe radius = 1).
const ECEF_TO_SCENE = 1 / 6_378_137

export function TerrainLayer() {
  return (
    // rotation: ECEF +Z (north pole) → scene +Y; ECEF +X (lng0) → scene +X
    <group scale={ECEF_TO_SCENE} rotation={[-Math.PI / 2, 0, 0]}>
      {/*
       * errorTarget: lower = finer LODs. Ordering matters: the r3f wrapper
       * applies the errorTarget prop via useDeepOptions BEFORE the plugin's
       * init() runs, and GoogleCloudAuthPlugin.init() overwrites errorTarget
       * to 20 when useRecommendedSettings is on — silently discarding the
       * prop. useRecommendedSettings does nothing else in 0.4.28 (checked
       * source), so we disable it and own errorTarget={12} for finer detail
       * at battle altitude 0.012 (~76 km).
       */}
      <TilesRenderer errorTarget={12}>
        <TilesPlugin
          plugin={GoogleCloudAuthPlugin}
          args={[
            {
              apiToken: import.meta.env.VITE_TILES_KEY as string,
              useRecommendedSettings: false,
            },
          ]}
        />
        <TilesPlugin plugin={TileCompressionPlugin} />
      </TilesRenderer>
    </group>
  )
}
