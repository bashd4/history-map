import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Battle, LatLng } from '../data/schema'
import { geodeticToVector3, offsetLatLng } from '../lib/geo'
import { battleFrameAltitude } from '../lib/battleExtent'
import { useAppStore } from '../state/store'
import { reliefSharpFloor } from './BattleBasemap'

const WORLD_UP = new THREE.Vector3(0, 1, 0)

interface Framing {
  pos: THREE.Vector3
  look: THREE.Vector3
  up: THREE.Vector3
}

/** Curated camera framing for a battle view — geodetic so it registers with the
 *  streamed tiles (see geo.ts). Map = straight down; Field = oblique from the
 *  battle's fieldAzimuth with a radial up so the horizon stays level. */
function framingFor(site: LatLng, frameAlt: number, view: 'map' | 'field', battle: Battle): Framing {
  const look = geodeticToVector3(site.lat, site.lng, 1)
  if (view === 'map') {
    return { pos: geodeticToVector3(site.lat, site.lng, 1 + frameAlt), look, up: WORLD_UP.clone() }
  }
  const azimuth = (((battle.fieldAzimuth ?? 180) % 360) + 360) % 360
  const camLL = offsetLatLng(site, azimuth, frameAlt * 0.9) // angular standoff
  return {
    pos: geodeticToVector3(camLL.lat, camLL.lng, 1 + frameAlt * 0.55),
    look,
    up: geodeticToVector3(site.lat, site.lng, 1).normalize(), // radial: level horizon
  }
}

/**
 * Owns the battle camera. On entering a battle — and whenever the Map/Field view
 * changes — it eases the camera to the curated framing, then mounts OrbitControls
 * so the user can freely pan and zoom around the field. Map view stays top-down
 * (pan + zoom); Field view is oblique and also rotatable.
 *
 * While the easing plays, OrbitControls is unmounted so the two never fight over
 * the camera; once settled it mounts and takes sole ownership.
 */
export function BattleControls({ site, battle }: { site: LatLng; battle: Battle }) {
  const camera = useThree((s) => s.camera)
  const battleView = useAppStore((s) => s.battleView)
  const battleBasemap = useAppStore((s) => s.battleBasemap)
  const frameAlt = battleFrameAltitude(battle, site)
  const sharpFloor = battleBasemap === 'relief' ? reliefSharpFloor(battle, site) : 0
  const framing = useRef<Framing>(framingFor(site, frameAlt, battleView, battle))
  const [framed, setFramed] = useState(false)

  // Re-frame on mount and on every view / battle change.
  useEffect(() => {
    framing.current = framingFor(site, frameAlt, battleView, battle)
    setFramed(false)
  }, [site, frameAlt, battleView, battle])

  useFrame((_, dt) => {
    if (framed) return // OrbitControls owns the camera once framed
    const t = framing.current
    const dtc = Math.min(dt, 0.1)
    const k = 4
    camera.position.x = THREE.MathUtils.damp(camera.position.x, t.pos.x, k, dtc)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, t.pos.y, k, dtc)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, t.pos.z, k, dtc)
    camera.up.lerp(t.up, 1 - Math.exp(-k * dtc)).normalize()
    camera.lookAt(t.look)
    if (camera.position.distanceTo(t.pos) < Math.max(0.0004, frameAlt * 0.03)) {
      camera.position.copy(t.pos)
      camera.up.copy(t.up)
      camera.lookAt(t.look)
      setFramed(true) // settled → hand off to OrbitControls
    }
  })

  if (!framed) return null
  const t = framing.current
  return (
    <OrbitControls
      makeDefault
      enablePan
      enableZoom
      enableRotate={battleView === 'field'}
      enableDamping
      dampingFactor={0.12}
      screenSpacePanning
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.7}
      minDistance={Math.max(0.001, frameAlt * 0.12, Math.min(sharpFloor, frameAlt * 0.6))}
      maxDistance={frameAlt * 4}
      target={[t.look.x, t.look.y, t.look.z]}
      // Map (top-down): left-drag PANS like a map. Field (oblique): left-drag
      // rotates, right-drag/two-finger pans.
      mouseButtons={
        battleView === 'field'
          ? { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
          : { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
      }
      touches={
        battleView === 'field'
          ? { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
          : { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }
      }
    />
  )
}
