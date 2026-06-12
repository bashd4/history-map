import { useMemo, type CSSProperties } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Battle } from '../data/schema'
import { latLngToVector3 } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'

// Just above the arrow layer's surface footprint, below the camera.
const LABEL_ALT = 1.0008

const KIND_COLOR: Record<string, string> = {
  terrain: '#cfc4ab',
  water: '#9fc4d4',
  settlement: '#e8dcc3',
}

const baseLabelStyle: CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  whiteSpace: 'nowrap',
  textShadow: '0 1px 3px rgba(0,0,0,.95), 0 0 8px rgba(0,0,0,.7)',
  userSelect: 'none',
  transform: 'translate(6px, -50%)',
}

/**
 * Landmark + phase-event labels for battle mode. DOM labels via drei <Html>
 * (constant screen size, no pointer events, layered below the battle overlay
 * at z-index 20). Mounted only while a battle is active.
 */
export function BattleAnnotations({ battle }: { battle: Battle }) {
  // React subscription at battleElapsed frequency is acceptable here —
  // BattleOverlay already re-renders at the same rate.
  const battleElapsed = useAppStore((s) => s.battleElapsed)
  const { phaseIndex: currentPhase, done } = playbackAt(battle, battleElapsed)

  const landmarks = useMemo(
    () =>
      (battle.landmarks ?? []).map((lm) => ({
        ...lm,
        pos: latLngToVector3(lm.coords.lat, lm.coords.lng, LABEL_ALT),
      })),
    [battle],
  )

  const events = useMemo(() => {
    const out: Array<{ phaseIndex: number; label: string; pos: THREE.Vector3 }> = []
    battle.phases.forEach((phase, phaseIndex) => {
      for (const ev of phase.events ?? []) {
        out.push({
          phaseIndex,
          label: ev.label,
          pos: latLngToVector3(ev.coords.lat, ev.coords.lng, LABEL_ALT),
        })
      }
    })
    return out
  }, [battle])

  return (
    <group>
      {/* Landmarks — always visible during battle */}
      {landmarks.map((lm) => (
        <group key={lm.name} position={lm.pos}>
          <mesh renderOrder={11}>
            {/* ~3 px at battle altitude (0.012): 2r/frustumHeight ≈ 0.4% */}
            <sphereGeometry args={[0.00002, 8, 8]} />
            <meshBasicMaterial color="#e8b54a" toneMapped={false}
              depthWrite={false} depthTest={false} />
          </mesh>
          <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
            <span style={{
              ...baseLabelStyle,
              fontStyle: 'italic',
              fontSize: '11px',
              color: KIND_COLOR[lm.kind ?? 'terrain'] ?? KIND_COLOR.terrain,
              display: 'inline-block',
            }}>
              {lm.name}
            </span>
          </Html>
        </group>
      ))}

      {/* Events — visible once their phase is current or past; past fades to 60% */}
      {events.map((ev, i) => {
        if (ev.phaseIndex > currentPhase) return null
        const isPast = ev.phaseIndex < currentPhase || done
        return (
          <group key={`${ev.phaseIndex}-${i}`} position={ev.pos}>
            <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              <span style={{
                ...baseLabelStyle,
                fontSize: '11px',
                color: '#e8b54a',
                opacity: isPast ? 0.6 : 1,
                display: 'inline-block',
              }}>
                ✶ {ev.label}
              </span>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
