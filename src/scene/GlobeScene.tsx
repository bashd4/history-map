import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { lazy, Suspense } from 'react'
import { Atmosphere } from './Atmosphere'
import { Globe } from './Globe'
import { Starfield } from './Starfield'
import { RouteArcs, RouteArcsProgress } from './RouteArcs'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { journeys } from '../journeys'
import { useAppStore } from '../state/store'
import { TerrainErrorBoundary } from './TerrainErrorBoundary'

// Code-split so the hub never pays the 3d-tiles-renderer bundle cost.
const TerrainLayer = lazy(() =>
  import('./TerrainLayer').then((m) => ({ default: m.TerrainLayer })),
)

export function GlobeScene() {
  const mode = useAppStore((s) => s.mode)
  const journeyId = useAppStore((s) => s.journeyId)
  // Shrink the globe slightly in battle mode so terrain tiles don't z-fight
  // with the coincident globe surface. 0.997 ≈ 19 km inset — invisible at
  // journey zoom but eliminates depth-buffer conflicts at battle altitude 0.012.
  const globeScale = mode === 'battle' ? 0.997 : 1
  return (
    <div className="canvas-fixed">
      {/* near must be far smaller than default 0.1: dwell camera sits 0.09 above the
          surface and battle mode 0.012 — default near clips the globe entirely.
          logarithmicDepthBuffer compensates for the depth precision loss. */}
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 2.8], fov: 45, near: 0.0008, far: 100 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
      >
        <color attach="background" args={['#0a0805']} />
        <Suspense fallback={null}>
          <Globe scale={globeScale} />
          <Atmosphere />
          <Starfield />
          {journeys.map((j) => {
            const isActive = journeyId === j.id && mode !== 'hub'
            if (isActive) {
              return (
                <group key={j.id}>
                  {/* Full faint route underneath */}
                  <RouteArcs journey={j} dim />
                  {/* Bright progressive layer on top */}
                  <RouteArcsProgress journey={j} />
                </group>
              )
            }
            return <RouteArcs key={j.id} journey={j} />
          })}
          {/* Google Photorealistic 3D Tiles — battle mode only, code-split.
              Guard on VITE_TILES_KEY so a missing key never throws. The error
              boundary sits OUTSIDE the lazy Suspense so a failed chunk load of
              TerrainLayer itself is also caught (battle degrades to plain globe). */}
          {mode === 'battle' && import.meta.env.VITE_TILES_KEY && (
            <TerrainErrorBoundary>
              <Suspense fallback={null}>
                <TerrainLayer />
              </Suspense>
            </TerrainErrorBoundary>
          )}
        </Suspense>
        <CameraRig />
        {mode === 'hub' && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            rotateSpeed={0.4}
            autoRotate
            autoRotateSpeed={0.35}
          />
        )}
        <Effects />
      </Canvas>
    </div>
  )
}
