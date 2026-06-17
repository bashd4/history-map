/**
 * BattleGroundTruth — DEV-only verification overlay.
 *
 * Press "g" while a battle is on screen to drop a labelled pin at EVERY authored
 * coordinate of the battle (movement waypoints, area-outline vertices, event
 * coords), each draped onto the real tile surface via the same geodetic
 * placement the arrows use. Hover a pin to read its source lat/lng.
 *
 * This is the "are we sure" check: if the pins sit exactly on the real features
 * in the Google tiles (a gunboat node on the river centreline, a redoubt on the
 * bluff), the data is right. If the pins are off, the data is wrong — and if the
 * pins are off by a constant amount everywhere, the *frame* is wrong (the bug
 * this overlay was built to catch). Because pins and arrows share
 * geodeticToVector3, a frame regression moves both together and is caught by
 * src/lib/geo.test.ts before it ever ships.
 *
 * Mounted only under import.meta.env.DEV (see GlobeScene), so it never reaches
 * production bundles.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { Battle } from '../data/schema'
import { geodeticToVector3 } from '../lib/geo'
import { terrainSampler, useTerrainHeightsVersion } from './useTerrainHeights'

// Lift pins ~130 m above the sampled surface so they read clearly over terrain.
const PIN_CLEARANCE = 0.00002
// Pin sphere radius in scene units (~190 m) — visible at battle zoom.
const PIN_RADIUS = 0.00003

type PinKind = 'path' | 'area' | 'event'

const KIND_COLOR: Record<PinKind, string> = {
  path: '#39d3ff', // cyan — movement waypoints (incl. gunboat river nodes)
  area: '#ffd23f', // amber — area outline vertices
  event: '#ff5cf0', // magenta — phase events
}

interface Pin {
  kind: PinKind
  label: string
  pos: THREE.Vector3
}

function drape(lat: number, lng: number): THREE.Vector3 {
  const r = terrainSampler.sampleRadius(lat, lng) + PIN_CLEARANCE
  return geodeticToVector3(lat, lng, r)
}

function PinMarker({ pin }: { pin: Pin }) {
  const labelRef = useRef<HTMLDivElement>(null)
  const color = KIND_COLOR[pin.kind]
  return (
    <group position={pin.pos}>
      <mesh
        renderOrder={20}
        onPointerOver={() => { if (labelRef.current) labelRef.current.style.opacity = '1' }}
        onPointerOut={() => { if (labelRef.current) labelRef.current.style.opacity = '0' }}
      >
        <sphereGeometry args={[PIN_RADIUS, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
      <Html zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
        <div
          ref={labelRef}
          style={{
            opacity: 0,
            transform: 'translate(10px, -50%)',
            padding: '2px 7px',
            borderRadius: '4px',
            background: 'rgba(10,8,6,0.9)',
            border: `1px solid ${color}`,
            color: '#f0e8d6',
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: '10px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {pin.label}
        </div>
      </Html>
    </group>
  )
}

export function BattleGroundTruth({ battle }: { battle: Battle }) {
  const [on, setOn] = useState(false)
  const heightsVersion = useTerrainHeightsVersion()

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info("[ground-truth] press 'g' to toggle authored-coordinate pins")
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing into an input; plain "g" toggles.
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'g' || e.key === 'G') {
        setOn((v) => {
          // eslint-disable-next-line no-console
          console.info(`[ground-truth] pins ${!v ? 'ON' : 'OFF'}`)
          return !v
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pins = useMemo<Pin[]>(() => {
    if (!on) return []
    const out: Pin[] = []
    battle.phases.forEach((ph) => {
      ph.movements.forEach((m) => {
        m.path.forEach((p, idx) => {
          const tag = `${m.side}${m.unit ? ` ${m.unit}` : ''}`
          out.push({
            kind: 'path',
            label: `${tag} ·${idx}  ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
            pos: drape(p.lat, p.lng),
          })
        })
      })
      ph.events?.forEach((ev) => {
        out.push({
          kind: 'event',
          label: `✶ ${ev.label}  ${ev.coords.lat.toFixed(5)}, ${ev.coords.lng.toFixed(5)}`,
          pos: drape(ev.coords.lat, ev.coords.lng),
        })
      })
    })
    battle.areas?.forEach((a) => {
      a.outline.forEach((p, idx) => {
        out.push({
          kind: 'area',
          label: `${a.name} ·${idx}  ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
          pos: drape(p.lat, p.lng),
        })
      })
    })
    return out
    // heightsVersion rebuilds drape positions when terrain refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, battle, heightsVersion])

  if (!on) return null
  return (
    <group>
      {pins.map((pin, i) => (
        <PinMarker key={i} pin={pin} />
      ))}
    </group>
  )
}
