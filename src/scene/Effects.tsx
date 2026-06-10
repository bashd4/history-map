import { Bloom, EffectComposer, Noise, Sepia, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export function Effects() {
  return (
    <EffectComposer>
      <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
      <Sepia intensity={0.25} />
      <Vignette eskil={false} offset={0.18} darkness={0.85} />
      <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}
