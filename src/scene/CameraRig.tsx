import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { journeyById } from '../journeys'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { latLngToVector3 } from '../lib/geo'
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

/**
 * Drives the hub and journey cameras. Battle mode is intentionally NOT handled
 * here — once a battle is entered, BattleControls + OrbitControls own the camera
 * so the user can freely pan and zoom around the field.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const targetPos = useRef(HUB_POS.clone())
  const targetLook = useRef(ORIGIN.clone())
  const look = useRef(ORIGIN.clone())

  useFrame((_, dt) => {
    const dtc = Math.min(dt, 0.1) // cap against tab-resume teleport
    const { mode, journeyId, journeyT, zoom, flight, flightT } = useAppStore.getState()

    // Battle mode: OrbitControls (via BattleControls) owns the camera. Don't
    // touch it here or the rig would fight free pan/zoom every frame.
    if (mode === 'battle') return

    const journey = journeyId ? journeyById(journeyId) : null
    const k = 3.2 // damping stiffness

    if (mode === 'hub' || !journey) {
      // OrbitControls owns hub rotation — the rig only restores orbit RADIUS
      // (e.g. flying back out after a journey); radius-only damping composes with
      // OrbitControls, which preserves radius while rotating.
      const r = camera.position.length()
      const hubR = HUB_POS.length()
      if (Math.abs(r - hubR) > 1e-4) {
        camera.position.setLength(THREE.MathUtils.damp(r, hubR, k, dtc))
      }
      targetPos.current.copy(camera.position)
      targetLook.current.copy(ORIGIN)
      look.current.copy(ORIGIN)
      return
    }

    // Journey: direct-flight override uses a 2-stop cameraAt driven by flightT
    // for a clean great-circle hop; otherwise use journeyT. zoom multiplies the
    // altitude (wheel/pinch); the damping below smooths it.
    const c = flight
      ? cameraAt(flightT, getFlightStops(flight))
      : cameraAt(journeyT, stopsForCamera(journey))
    targetPos.current.copy(latLngToVector3(c.lat, c.lng, 1 + c.altitude * zoom))
    targetLook.current.copy(ORIGIN)

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, k, dtc)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, k, dtc)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, k, dtc)
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.current.x, k, dtc)
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.current.y, k, dtc)
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.current.z, k, dtc)
    camera.up.copy(WORLD_UP)
    camera.lookAt(look.current)
  })
  return null
}
