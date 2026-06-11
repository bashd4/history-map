import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { lazy, Suspense, useEffect } from 'react'
import { Atmosphere } from './Atmosphere'
import { Globe } from './Globe'
import { Starfield } from './Starfield'
import { RouteArcs, RouteArcsProgress } from './RouteArcs'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { journeys, journeyById } from '../journeys'
import { useAppStore } from '../state/store'
import { TerrainErrorBoundary } from './TerrainErrorBoundary'
import { BattleArrows } from './BattleArrows'
import { PerfSampler } from './PerfSampler'

// Code-split so the hub never pays the 3d-tiles-renderer bundle cost.
const TerrainLayer = lazy(() =>
  import('./TerrainLayer').then((m) => ({ default: m.TerrainLayer })),
)

// Module-level strike counter: survives component remounts (incl. StrictMode
// double-mount, which would reset a ref) — losing the context twice in one
// page lifetime means the GPU/driver is unhappy; only a reload truly recovers.
let contextLossCount = 0

/** Registers WebGL context-loss listeners on the canvas with proper cleanup.
 *  First loss: preventDefault lets the browser restore and three re-init.
 *  Second loss: calls onContextLost so the app swaps to the NoWebGL page. */
function ContextLossGuard({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const canvas = gl.domElement
    const handleLost = (e: Event) => {
      e.preventDefault()
      contextLossCount += 1
      if (contextLossCount >= 2) {
        // Second loss — give up and show NoWebGL fallback.
        onContextLost()
      }
      // First loss: preventDefault above lets the browser restore context.
    }
    const handleRestored = () => {
      // Context restored after first loss — three.js re-inits automatically.
    }
    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
    }
  }, [gl, onContextLost])

  return null
}

interface GlobeSceneProps {
  tabVisible: boolean
  onContextLost: () => void
}

export function GlobeScene({ tabVisible, onContextLost }: GlobeSceneProps) {
  const mode = useAppStore((s) => s.mode)
  const journeyId = useAppStore((s) => s.journeyId)
  const battleStopIndex = useAppStore((s) => s.battleStopIndex)
  const nearBattleStopIndex = useAppStore((s) => s.nearBattleStopIndex)

  // Shrink the globe slightly in battle mode so terrain tiles don't z-fight
  // with the coincident globe surface. 0.997 ≈ 19 km inset — invisible at
  // journey zoom but eliminates depth-buffer conflicts at battle altitude 0.012.
  const globeScale = mode === 'battle' ? 0.997 : 1

  // Resolve battle data from active journey stop (null if not in battle mode)
  const activeBattle =
    mode === 'battle' && journeyId != null && battleStopIndex != null
      ? (journeyById(journeyId)?.stops[battleStopIndex]?.battle ?? null)
      : null

  // Resolve the battle stop coords for the preheat virtual camera: during
  // journey preload, nearBattleStopIndex points at the exact stop being dwelled
  // at, so multi-battle journeys warm the correct viewpoint.
  const journey = journeyId != null ? journeyById(journeyId) : null
  const battleStopCoords =
    mode === 'journey' && nearBattleStopIndex != null && journey != null
      ? (journey.stops[nearBattleStopIndex]?.coords ?? null)
      : null

  // Mount terrain when:
  //   a) battle mode is active — tiles are visible and the globe is shrunk
  //   b) journey mode + dwelling at a battle stop — preload phase: tile meshes
  //      are hidden (group visible=false inside TerrainLayer) so they stream
  //      without rendering against the full-size globe at dwell altitude 0.09.
  //      The globe must stay full size during preload.
  const showTerrain =
    (mode === 'battle' || (mode === 'journey' && nearBattleStopIndex != null))
    && Boolean(import.meta.env.VITE_TILES_KEY)

  return (
    <div className="canvas-fixed">
      {/* near must be far smaller than default 0.1: dwell camera sits 0.09 above the
          surface and battle mode 0.012 — default near clips the globe entirely.
          logarithmicDepthBuffer compensates for the depth precision loss. */}
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 2.8], fov: 45, near: 0.0008, far: 100 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        frameloop={tabVisible ? 'always' : 'never'}
      >
        <color attach="background" args={['#0a0805']} />
        <ContextLossGuard onContextLost={onContextLost} />
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
          {/* Google Photorealistic 3D Tiles — battle mode + preload, code-split.
              Guard on VITE_TILES_KEY so a missing key never throws. The error
              boundary sits OUTSIDE the lazy Suspense so a failed chunk load of
              TerrainLayer itself is also caught (battle degrades to plain globe).
              During journey preload (hidden=true) the tiles.group itself is made
              invisible so tiles stream without rendering over the globe. */}
          {showTerrain && (
            <TerrainErrorBoundary>
              <Suspense fallback={null}>
                <TerrainLayer
                  hidden={mode !== 'battle'}
                  preheat={battleStopCoords ?? undefined}
                />
              </Suspense>
            </TerrainErrorBoundary>
          )}
          {/* Battle movement arrows — outside terrain error boundary so they
              work even when terrain degrades. Mounted only in battle mode. */}
          {activeBattle && <BattleArrows battle={activeBattle} />}
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
        <PerfSampler />
        <Effects />
      </Canvas>
    </div>
  )
}
