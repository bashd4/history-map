import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { Atmosphere } from './Atmosphere'
import { Globe } from './Globe'
import { Starfield } from './Starfield'
import { RouteArcs } from './RouteArcs'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { journeys } from '../journeys'
import { useAppStore } from '../state/store'

export function GlobeScene() {
  const mode = useAppStore((s) => s.mode)
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
          <Globe />
          <Atmosphere />
          <Starfield />
          {journeys.map((j) => <RouteArcs key={j.id} journey={j} dim />)}
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
