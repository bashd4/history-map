import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { journeyById } from '../journeys'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { geodeticToVector3, latLngToVector3, offsetLatLng } from '../lib/geo'
import { battleFrameAltitude } from '../lib/battleExtent'
import { useAppStore, type FlightState } from '../state/store'
import type { LatLng } from '../data/schema'

// Module-level scratch array for direct-flight 2-stop cameraAt calls.
// Rebuilt only when the flight reference changes — avoids per-frame allocation.
let _flightRef: FlightState | null = null
const _flightStops: Array<LatLng & { camera?: { altitude: number } }> = [
  { lat: 0, lng: 0, camera: { altitude: 0 } },
  { lat: 0, lng: 0, camera: { altitude: 0 } },
]
function getFlightStops(flight: FlightState): typeof _flightStops {
  if (flight !== _flightRef) {
    _flightRef = flight
    _flightStops[0].lat = flight.from.lat
    _flightStops[0].lng = flight.from.lng
    _flightStops[0].camera!.altitude = flight.from.altitude
    _flightStops[1].lat = flight.to.lat
    _flightStops[1].lng = flight.to.lng
    _flightStops[1].camera!.altitude = flight.to.altitude
  }
  return _flightStops
}

const HUB_POS = new THREE.Vector3(0, 0.4, 2.8)
const ORIGIN = new THREE.Vector3(0, 0, 0)
const WORLD_UP = new THREE.Vector3(0, 1, 0)
const BATTLE_ALT = 0.012 // ~75 km bird's-eye over the battlefield

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const targetPos = useRef(HUB_POS.clone())
  const targetLook = useRef(ORIGIN.clone())
  const look = useRef(ORIGIN.clone())
  // Up-vector hint, damped like the rest of the rig. World +Y everywhere
  // except battle field/orbit, where the site's radial direction keeps the
  // horizon level (world-Y up rolls the horizon ~40° at Austerlitz's latitude
  // when looking obliquely along the surface).
  const targetUp = useRef(WORLD_UP.clone())
  const up = useRef(WORLD_UP.clone())

  useFrame((state, dt) => {
    const dtc = Math.min(dt, 0.1) // cap against tab-resume teleport
    const { mode, journeyId, journeyT, battleStopIndex, zoom, battleView, flight, flightT } =
      useAppStore.getState()
    const journey = journeyId ? journeyById(journeyId) : null
    const k = 3.2 // damping stiffness

    if (mode === 'hub' || !journey) {
      // OrbitControls owns hub rotation — sync so journey flights start from
      // wherever the user dragged the globe, and don't fight the controls.
      // The rig only restores orbit RADIUS (e.g. flying back out after a journey);
      // radius-only damping composes with OrbitControls, which preserves radius
      // while rotating, so drag and autoRotate are never fought.
      // Assumes enableZoom={false} on OrbitControls — the rig owns radius.
      const r = camera.position.length()
      const hubR = HUB_POS.length()
      if (Math.abs(r - hubR) > 1e-4) {
        camera.position.setLength(THREE.MathUtils.damp(r, hubR, k, dtc))
      }
      targetPos.current.copy(camera.position)
      targetLook.current.copy(ORIGIN)
      look.current.copy(ORIGIN)
      return
    } else if (mode === 'journey') {
      // Direct-flight override: use a 2-stop cameraAt driven by flightT for a
      // clean great-circle hop. Otherwise use journeyT as usual.
      const c = flight
        ? cameraAt(flightT, getFlightStops(flight))
        : cameraAt(journeyT, stopsForCamera(journey))
      // zoom multiplies altitude (wheel/pinch); the damping below smooths it.
      targetPos.current.copy(latLngToVector3(c.lat, c.lng, 1 + c.altitude * zoom))
      targetLook.current.copy(ORIGIN)
    } else if (mode === 'battle' && battleStopIndex != null) {
      const stop = journey.stops[battleStopIndex]
      if (!stop) return
      const site = stop.coords
      // Auto-frame: compact battles (Shiloh ~5 km) get a close view, campaign-
      // scale ones (Vicksburg ~200 km) a wide one — derived from the battle's
      // own waypoints/landmarks rather than a fixed altitude.
      const frameAlt = stop.battle ? battleFrameAltitude(stop.battle, site) : BATTLE_ALT
      if (battleView === 'map') {
        // Geodetic placement so the camera centres on the (geodetic) arrows and
        // the tile terrain beneath them — not ~20 km off. See geo.ts.
        targetPos.current.copy(geodeticToVector3(site.lat, site.lng, 1 + frameAlt * zoom))
        targetLook.current.copy(geodeticToVector3(site.lat, site.lng, 1)) // straight down
        targetUp.current.copy(WORLD_UP)
      } else {
        // field / orbit: stand off from the site at a low oblique altitude and
        // look back at the surface point — tilted view that shows relief.
        const azimuth = stop.battle?.fieldAzimuth ?? 180
        const bearing =
          battleView === 'orbit'
            ? azimuth + state.clock.elapsedTime * 4 // slow circle, 4°/s
            : azimuth
        // Stand off ~0.9× the frame radius and rise ~0.55× — a ~30° oblique
        // that fills the frame with the battlefield instead of parking it at
        // the horizon. zoom scales the whole standoff triangle.
        const groundDist = frameAlt * 0.9 * zoom // angular standoff (radians)
        const camLL = offsetLatLng(site, ((bearing % 360) + 360) % 360, groundDist)
        targetPos.current.copy(
          geodeticToVector3(camLL.lat, camLL.lng, 1 + frameAlt * 0.55 * zoom))
        targetLook.current.copy(geodeticToVector3(site.lat, site.lng, 1))
        targetUp.current.copy(geodeticToVector3(site.lat, site.lng, 1)) // radial up: level horizon
      }
    }

    if (mode !== 'battle') targetUp.current.copy(WORLD_UP)

    // Orbit's target moves continuously — damp k=3.2 lags enough to shrink the
    // circle; a stiffer tracker keeps the radius while staying smooth.
    const kp = mode === 'battle' && battleView === 'orbit' ? 8 : k

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, kp, dtc)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, kp, dtc)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, kp, dtc)
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.current.x, k, dtc)
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.current.y, k, dtc)
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.current.z, k, dtc)
    up.current.x = THREE.MathUtils.damp(up.current.x, targetUp.current.x, k, dtc)
    up.current.y = THREE.MathUtils.damp(up.current.y, targetUp.current.y, k, dtc)
    up.current.z = THREE.MathUtils.damp(up.current.z, targetUp.current.z, k, dtc)
    if (up.current.lengthSq() > 1e-6) up.current.normalize()
    else up.current.copy(targetUp.current)
    camera.up.copy(up.current)
    camera.lookAt(look.current)
  })
  return null
}
