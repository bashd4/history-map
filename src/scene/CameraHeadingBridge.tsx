import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geodeticToVector3 } from '../lib/geo'
import { metersPerPixel, screenAngleFromUp } from '../lib/mapScale'
import { useAppStore } from '../state/store'
import type { LatLng } from '../data/schema'

const NORTH_EPS = 0.0005 // small north step in radians for the tangent

/** Reads the battle camera each frame and publishes the screen-angle of true
 *  north + ground metres-per-pixel to the store (throttled, change-gated) so the
 *  DOM compass + scale bar can render without per-frame React churn.
 *
 *  Accuracy note: `metersPerPixel` is derived from the camera→site distance and
 *  the straight-down vertical-span model in `mapScale.ts`. It is only accurate
 *  for a top-down (Map view) camera framed on the site. In oblique Field view, or
 *  once the user pans the site away from screen-centre, the reported m/px drifts
 *  from the ground actually under the viewport — consumers (scale bar) should
 *  treat it as a Map-view-at-site figure. `northAngle` is exact in all framings. */
export function CameraHeadingBridge({ site }: { site: LatLng }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const setMapMetrics = useAppStore((s) => s.setMapMetrics)
  const tAcc = useRef(0)

  useFrame((_, dt) => {
    // throttle ~10 Hz via accumulator
    tAcc.current += dt
    if (tAcc.current < 0.1) return
    tAcc.current = 0

    const siteV = geodeticToVector3(site.lat, site.lng, 1)
    const northV = geodeticToVector3(site.lat + NORTH_EPS * (180 / Math.PI), site.lng, 1)
    const a = siteV.clone().project(camera) // NDC
    const b = northV.clone().project(camera)
    // NDC → screen px (y-down)
    const ax = (a.x * 0.5 + 0.5) * size.width, ay = (-a.y * 0.5 + 0.5) * size.height
    const bx = (b.x * 0.5 + 0.5) * size.width, by = (-b.y * 0.5 + 0.5) * size.height
    const northAngle = screenAngleFromUp(ax, ay, bx, by)

    const dist = camera.position.distanceTo(siteV)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const mpp = metersPerPixel(dist, fov, size.height)

    const prev = useAppStore.getState()
    if (Math.abs(prev.northAngle - northAngle) < 0.0087 &&
        Math.abs(prev.metersPerPixel - mpp) < mpp * 0.01) return // <0.5°, <1%
    setMapMetrics({ northAngle, metersPerPixel: mpp })
  })
  return null
}
