import { Bloom, EffectComposer, Noise, Sepia, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useAppStore } from '../state/store'

export function Effects() {
  const lowPerf = useAppStore((s) => s.lowPerf)
  // The topo basemap is mostly bright paper-white — bloom fires on it and
  // washes out the map. Drop bloom while it's active (boolean selector:
  // re-render only on toggle).
  const topoActive = useAppStore(
    (s) => s.mode === 'battle' && s.battleBasemap === 'topo',
  )

  // Build children as an array (no boolean entries — the published
  // EffectComposer types reject `false`/`null` children, but JSX.Element[]
  // is fine). A single composer instance means a lowPerf flip only unmounts
  // the Bloom child instead of remounting the whole composer.
  const passes = []
  if (!lowPerf && !topoActive) {
    passes.push(
      <Bloom key="bloom" intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />,
    )
  }
  passes.push(
    <Sepia key="sepia" intensity={0.25} />,
    <Vignette key="vignette" eskil={false} offset={0.18} darkness={0.85} />,
    <Noise key="noise" opacity={0.045} blendFunction={BlendFunction.OVERLAY} />,
  )

  return <EffectComposer multisampling={lowPerf ? 0 : 8}>{passes}</EffectComposer>
}
