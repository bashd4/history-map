import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { GLOBE_RADIUS } from '../lib/geo'

const vertex = /* glsl */ `
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vViewDir = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`

const fragment = /* glsl */ `
  uniform sampler2D uMap; uniform float uSepia;
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
  void main() {
    vec3 tex = texture2D(uMap, vUv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(1.25, 1.02, 0.76) * lum;
    vec3 color = mix(tex, sepia, uSepia);
    float facing = dot(normalize(vNormal), normalize(vViewDir));
    color *= 0.45 + 0.55 * smoothstep(0.0, 0.5, facing); // limb darkening
    gl_FragColor = vec4(color, 1.0);
  }`

export function Globe({ radius = GLOBE_RADIUS }: { radius?: number }) {
  const map = useTexture('/textures/earth-blue-marble.jpg')
  map.colorSpace = THREE.SRGBColorSpace

  const uniforms = useMemo(
    () => ({ uMap: { value: map }, uSepia: { value: 0.82 } }),
    [map],
  )

  return (
    <mesh>
      <sphereGeometry args={[radius, 96, 96]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  )
}
