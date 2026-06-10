import { useMemo } from 'react'
import * as THREE from 'three'

const STAR_COUNT = 600
const STAR_RADIUS = 40

export function Starfield() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      // Deterministic hash — no Math.random
      const u = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
      const v = Math.abs(Math.sin(i * 78.233 + 1.0) * 43758.5453) % 1
      // Uniform spherical distribution via azimuth + elevation
      const theta = u * 2 * Math.PI          // azimuth
      const phi = Math.acos(2 * v - 1)       // polar angle → uniform on sphere

      positions[i * 3 + 0] = STAR_RADIUS * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = STAR_RADIUS * Math.cos(phi)
      positions[i * 3 + 2] = STAR_RADIUS * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.06}
        color="#cbbf9f"
        sizeAttenuation
        transparent
        opacity={0.7}
      />
    </points>
  )
}
