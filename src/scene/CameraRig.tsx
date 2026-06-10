import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { journeyById } from '../journeys'
import { cameraAt } from '../lib/journeyCamera'
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
    const { mode, journeyId, scrollT, battleStopIndex } = useAppStore.getState()
    const journey = journeyId ? journeyById(journeyId) : null

    if (mode === 'hub' || !journey) {
      targetPos.current.copy(HUB_POS)
      targetLook.current.copy(ORIGIN)
    } else if (mode === 'journey') {
      const c = cameraAt(scrollT, journey.stops.map((s) => ({ ...s.coords, camera: s.camera })))
      targetPos.current.copy(latLngToVector3(c.lat, c.lng, 1 + c.altitude))
      targetLook.current.copy(ORIGIN)
    } else if (mode === 'battle' && battleStopIndex != null) {
      const site = journey.stops[battleStopIndex].coords
      targetPos.current.copy(latLngToVector3(site.lat, site.lng, 1 + BATTLE_ALT))
      targetLook.current.copy(latLngToVector3(site.lat, site.lng, 1)) // straight down
    }

    const k = 3.2 // damping stiffness
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, k, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, k, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, k, dt)
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.current.x, k, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.current.y, k, dt)
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.current.z, k, dt)
    camera.up.set(0, 1, 0)
    camera.lookAt(look.current)
  })
  return null
}
