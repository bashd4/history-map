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
 */

import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react'
import { TilesPlugin, TilesRenderer } from '3d-tiles-renderer/r3f'
import { GoogleCloudAuthPlugin, TileCompressionPlugin } from '3d-tiles-renderer/plugins'

// ECEF radius in metres → scene units (globe radius = 1).
const ECEF_TO_SCENE = 1 / 6_378_137

class TerrainErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[terrain] failed, falling back to globe:', error, info)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

function TerrainTiles() {
  return (
    // rotation: ECEF +Z (north pole) → scene +Y; ECEF +X (lng0) → scene +X
    <group scale={ECEF_TO_SCENE} rotation={[-Math.PI / 2, 0, 0]}>
      {/*
       * errorTarget default is 16 (set by renderer) but GoogleCloudAuthPlugin
       * bumps it to 20 for photorealistic tiles. Lower = more detail.
       * We pass errorTarget={12} so the camera at altitude 0.012 (~76 km)
       * triggers finer LODs against the close-up view.
       */}
      <TilesRenderer errorTarget={12}>
        <TilesPlugin
          plugin={GoogleCloudAuthPlugin}
          args={[{ apiToken: import.meta.env.VITE_TILES_KEY as string }]}
        />
        <TilesPlugin plugin={TileCompressionPlugin} />
      </TilesRenderer>
    </group>
  )
}

export function TerrainLayer() {
  return (
    <TerrainErrorBoundary>
      <Suspense fallback={null}>
        <TerrainTiles />
      </Suspense>
    </TerrainErrorBoundary>
  )
}
