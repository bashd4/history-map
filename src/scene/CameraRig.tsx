import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { journeyById } from '../journeys'
import { cameraAt, stopsForCamera } from '../lib/journeyCamera'
import { latLngToVector3 } from '../lib/geo'
import { useAppStore } from '../state/store'

const HUB_POS = new THREE.Vector3(0, 0.4, 2.8)
const ORIGIN = new THREE.Vector3(0, 0, 0)
const BATTLE_ALT = 0.012 // ~75 km bird's-eye over the battlefield

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const targetPos = useRef(HUB_POS.clone())
  const targetLook = useRef(ORIGIN.clone())
  const look = useRef(ORIGIN.clone())

  useFrame((_, dt) => {
    const dtc = Math.min(dt, 0.1) // cap against tab-resume teleport
    const { mode, journeyId, journeyT, battleStopIndex } = useAppStore.getState()
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
      const c = cameraAt(journeyT, stopsForCamera(journey))
      targetPos.current.copy(latLngToVector3(c.lat, c.lng, 1 + c.altitude))
      targetLook.current.copy(ORIGIN)
    } else if (mode === 'battle' && battleStopIndex != null) {
      const stop = journey.stops[battleStopIndex]
      if (!stop) return
      const site = stop.coords
      targetPos.current.copy(latLngToVector3(site.lat, site.lng, 1 + BATTLE_ALT))
      targetLook.current.copy(latLngToVector3(site.lat, site.lng, 1)) // straight down
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, k, dtc)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, k, dtc)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, k, dtc)
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.current.x, k, dtc)
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.current.y, k, dtc)
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.current.z, k, dtc)
    camera.up.set(0, 1, 0)
    camera.lookAt(look.current)
  })
  return null
}
