import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Journey } from '../data/schema'
import { greatCirclePoints, latLngToVector3 } from '../lib/geo'

/** progress: 0..1 portion of the route drawn solid (1 = all). dim: hub-mode faintness. */
export function RouteArcs({ journey, progress = 1, dim = false }:
  { journey: Journey; progress?: number; dim?: boolean }) {
  const { curve, totalLen } = useMemo(() => {
    const pts = journey.stops.slice(0, -1).flatMap((s, i) =>
      greatCirclePoints(s.coords, journey.stops[i + 1].coords, 48).slice(i ? 1 : 0))
    const curve = new THREE.CatmullRomCurve3(pts)
    return { curve, totalLen: pts.length }
  }, [journey])

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, totalLen * 2, 0.0035, 8, false),
    [curve, totalLen])

  // TubeGeometry index count scales linearly with tubularSegments — drawRange clips the head.
  const indexCount = geometry.index!.count
  geometry.setDrawRange(0, Math.floor(indexCount * Math.min(1, Math.max(0, progress))))

  // Dispose memoized geometry on unmount (or when journey changes and geometry is recreated)
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={journey.color} transparent
          opacity={dim ? 0.25 : 1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {journey.stops.map((s, i) => (
        <mesh key={i} position={latLngToVector3(s.coords.lat, s.coords.lng, 1.004)}>
          <sphereGeometry args={[0.008, 16, 16]} />
          <meshBasicMaterial color={journey.color} transparent opacity={dim ? 0.4 : 1} />
        </mesh>
      ))}
    </group>
  )
}
