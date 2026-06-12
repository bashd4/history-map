import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Battle, Movement } from '../data/schema'
import { latLngToVector3, slerpUnit } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { screenScale } from '../lib/screenScale'
import { useAppStore } from '../state/store'

// Arrow altitude — ~3.8 km above surface, clears Austerlitz heights (~300 m)
const ARROW_ALT = 1.0006

/** Number of slerp segments per leg of a movement path */
const SEGS_PER_LEG = 24

/**
 * Arrowhead cone screen-fraction — tuned so at battle altitude (camera ~0.012
 * from surface) the arrowhead is ~5–8% of the frustum half-height. Clamped so
 * it never disappears (min) or dominates while the camera is still far away
 * during the dive-in transition (max).
 */
const CONE_FRAC = 0.018
// Min is a far-range safety net only — keep it below the screen-fraction value
// at close zoom (d ≈ 0.005) so zoomed-in field views don't inflate the cone.
const CONE_MIN = 0.00005
const CONE_MAX = 0.002

const OPACITY_CURRENT = 0.95
const OPACITY_DONE = 0.4

// Scratch objects — never allocate in the frame loop.
const _UP = new THREE.Vector3(0, 1, 0)
const _tangent = new THREE.Vector3()

/** Build surface-hugging polyline points for a movement. */
function buildMovementPoints(movement: Movement): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let leg = 0; leg < movement.path.length - 1; leg++) {
    const from = movement.path[leg]
    const to = movement.path[leg + 1]
    const a = latLngToVector3(from.lat, from.lng).normalize()
    const b = latLngToVector3(to.lat, to.lng).normalize()
    const start = leg === 0 ? 0 : 1 // avoid duplicate point at leg joints
    for (let i = start; i <= SEGS_PER_LEG; i++) {
      const t = i / SEGS_PER_LEG
      pts.push(slerpUnit(a, b, t).multiplyScalar(ARROW_ALT))
    }
  }
  return pts
}

/** Flat list of all movements across all phases, tagged with phase index. */
interface TaggedMovement {
  phaseIndex: number
  movIndex: number
  movement: Movement
  points: THREE.Vector3[]
}

function useBattleMovements(battle: Battle): TaggedMovement[] {
  return useMemo(() => {
    const result: TaggedMovement[] = []
    battle.phases.forEach((phase, phaseIndex) => {
      phase.movements.forEach((movement, movIndex) => {
        result.push({
          phaseIndex,
          movIndex,
          movement,
          points: buildMovementPoints(movement),
        })
      })
    })
    return result
  }, [battle])
}

type ArrowState = 'hidden' | 'completed' | 'current'

/** Visibility state for a phase-bound annotation — same rules as the arrows. */
function arrowStateAt(battle: Battle, phaseIndex: number, elapsed: number): ArrowState {
  const { phaseIndex: currentPhase, done } = playbackAt(battle, elapsed)
  return phaseIndex > currentPhase ? 'hidden'
    : phaseIndex < currentPhase || done ? 'completed'
    : 'current'
}

/**
 * Unit name at the path midpoint, colored by side. Matches the arrow's
 * visibility/fade: full when current, dimmed when completed, hidden when
 * future. React subscription to battleElapsed is acceptable here —
 * BattleOverlay already re-renders at that frequency.
 */
function UnitLabel({
  battle,
  phaseIndex,
  unit,
  color,
  position,
}: {
  battle: Battle
  phaseIndex: number
  unit: string
  color: string
  position: THREE.Vector3
}) {
  const battleElapsed = useAppStore((s) => s.battleElapsed)
  const state = arrowStateAt(battle, phaseIndex, battleElapsed)
  if (state === 'hidden') return null

  return (
    <Html position={position} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
      <span style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontVariant: 'small-caps',
        fontSize: '10px',
        letterSpacing: '0.04em',
        color,
        opacity: state === 'completed' ? OPACITY_DONE : OPACITY_CURRENT,
        whiteSpace: 'nowrap',
        textShadow: '0 1px 3px rgba(0,0,0,.95), 0 0 8px rgba(0,0,0,.7)',
        userSelect: 'none',
        display: 'inline-block',
        transform: 'translate(-50%, -130%)',
      }}>
        {unit}
      </span>
    </Html>
  )
}

/**
 * Single animated movement arrow. `battle` is read in useFrame via closure —
 * safe because r3f keeps the latest frame callback per render.
 */
function MovementArrow({
  tagged,
  battle,
}: {
  tagged: TaggedMovement
  battle: Battle
}) {
  const { movement, points, phaseIndex } = tagged
  const lineRef = useRef<Line2>(null)
  const coneRef = useRef<THREE.Mesh>(null)
  // Last applied state — lets the static hidden/completed branches skip
  // redundant per-frame writes (only the current phase animates).
  const lastStateRef = useRef<ArrowState | null>(null)
  const totalSegs = points.length - 1

  const isDashed = movement.style === 'retreat' || movement.style === 'feint'
  const color = battle.sides[movement.side] ?? '#ffffff'
  const lineWidth = movement.style === 'advance' ? 2.5 : 2

  useFrame(({ camera }) => {
    const { battleElapsed, mode } = useAppStore.getState()
    if (mode !== 'battle') return

    const line = lineRef.current
    const cone = coneRef.current
    if (!line || !cone) return

    const { phaseIndex: currentPhase, phaseProgress, done } =
      playbackAt(battle, battleElapsed)

    // When playback is done, every phase — including the last — is completed.
    const state: ArrowState =
      phaseIndex > currentPhase ? 'hidden'
      : phaseIndex < currentPhase || done ? 'completed'
      : 'current'

    if (state !== 'current' && lastStateRef.current === state) {
      // Static state already applied. The cone scale still tracks the camera
      // (it keeps damping briefly after entering battle) — one cheap write.
      if (state === 'completed') {
        cone.scale.setScalar(
          screenScale(camera, cone.position, CONE_FRAC, CONE_MIN, CONE_MAX))
      }
      return
    }
    lastStateRef.current = state

    if (state === 'hidden') {
      line.geometry.instanceCount = 0
      cone.visible = false
      return
    }

    const lineMat = line.material as THREE.Material
    const coneMat = cone.material as THREE.Material

    if (state === 'completed') {
      // Fully drawn, faded
      line.geometry.instanceCount = totalSegs
      lineMat.opacity = OPACITY_DONE
      const tip = points[points.length - 1]
      cone.position.copy(tip)
      _tangent.subVectors(tip, points[points.length - 2]).normalize()
      cone.quaternion.setFromUnitVectors(_UP, _tangent)
      cone.scale.setScalar(screenScale(camera, tip, CONE_FRAC, CONE_MIN, CONE_MAX))
      cone.visible = true
      coneMat.opacity = OPACITY_DONE
      return
    }

    // Current phase — animate progressively every frame
    const drawnSegs = Math.max(0, Math.floor(phaseProgress * totalSegs))
    line.geometry.instanceCount = drawnSegs
    lineMat.opacity = OPACITY_CURRENT

    if (drawnSegs < 2 || phaseProgress < 0.02) {
      cone.visible = false
      return
    }

    const tipIdx = Math.min(drawnSegs, points.length - 1)
    const tip = points[tipIdx]
    cone.position.copy(tip)
    _tangent.subVectors(tip, points[Math.max(0, tipIdx - 1)]).normalize()
    cone.quaternion.setFromUnitVectors(_UP, _tangent)
    cone.scale.setScalar(screenScale(camera, tip, CONE_FRAC, CONE_MIN, CONE_MAX))
    cone.visible = true
    coneMat.opacity = OPACITY_CURRENT
  })

  return (
    <group>
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={lineWidth}
        dashed={isDashed}
        dashScale={isDashed ? 5 : undefined}
        transparent
        opacity={OPACITY_CURRENT}
        toneMapped={false}
        depthWrite={false}
        depthTest={false}
        renderOrder={10}
      />
      <mesh ref={coneRef} visible={false} renderOrder={10}>
        <coneGeometry args={[1, 2, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={OPACITY_CURRENT}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      {movement.unit && (
        <UnitLabel
          battle={battle}
          phaseIndex={phaseIndex}
          unit={movement.unit}
          color={color}
          position={points[Math.floor(points.length / 2)]}
        />
      )}
    </group>
  )
}

export function BattleArrows({ battle }: { battle: Battle }) {
  const movements = useBattleMovements(battle)

  return (
    <group>
      {movements.map((tagged) => (
        <MovementArrow
          key={`${tagged.phaseIndex}-${tagged.movIndex}`}
          tagged={tagged}
          battle={battle}
        />
      ))}
    </group>
  )
}
