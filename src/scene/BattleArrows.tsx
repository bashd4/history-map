import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { Battle, Movement } from '../data/schema'
import { latLngToVector3, slerpUnit } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'

// Arrow altitude — ~3.8 km above surface, clears Austerlitz heights (~300 m)
const ARROW_ALT = 1.0006

const COLORS: Record<'french' | 'coalition', string> = {
  french: '#4d8fdb',
  coalition: '#c0392b',
}

/** Number of slerp segments per leg of a movement path */
const SEGS_PER_LEG = 24

/**
 * World-space scale for the arrowhead cone mesh — proportional to camera
 * distance so the arrowhead appears at constant screen size across zoom levels.
 * Tuned so at battle altitude (camera ~0.015 from surface) the arrowhead is
 * ~5–8% of the frustum half-height (clearly visible but not overwhelming).
 */
const CONE_FRAC = 0.035

function arrowheadScale(camera: THREE.Camera, tipPos: THREE.Vector3): number {
  const d = camera.position.distanceTo(tipPos)
  const fov = (camera as THREE.PerspectiveCamera).fov ?? 45
  const s = d * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * CONE_FRAC
  // Clamp so it never disappears (min) or dominates when camera is far away (max)
  return THREE.MathUtils.clamp(s, 0.0003, 0.004)
}

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

/** Single animated movement arrow. battle passed via ref so useFrame stays stable. */
function MovementArrow({
  tagged,
  battleRef,
}: {
  tagged: TaggedMovement
  battleRef: React.RefObject<Battle>
}) {
  const { movement, points, phaseIndex } = tagged
  const lineRef = useRef<Line2>(null)
  const coneRef = useRef<THREE.Mesh>(null)
  const totalSegs = points.length - 1

  const isDashed = movement.style === 'retreat' || movement.style === 'feint'
  const color = COLORS[movement.side]
  const lineWidth = movement.style === 'advance' ? 5 : 4

  useFrame(({ camera }) => {
    const { battleElapsed, mode } = useAppStore.getState()
    if (mode !== 'battle') return

    const battle = battleRef.current
    if (!battle) return

    const { phaseIndex: currentPhase, phaseProgress } = playbackAt(battle, battleElapsed)

    const line = lineRef.current
    const cone = coneRef.current
    if (!line || !cone) return

    if (phaseIndex > currentPhase) {
      // Future phase — hide
      line.geometry.instanceCount = 0
      cone.visible = false
      return
    }

    if (phaseIndex < currentPhase) {
      // Completed phase — fully drawn, faded
      line.geometry.instanceCount = totalSegs
      const mat = line.material as THREE.Material & { opacity?: number }
      if (mat && 'opacity' in mat) mat.opacity = 0.45

      // Show arrowhead at the full tip
      const tip = points[points.length - 1]
      cone.position.copy(tip)
      const secondToLast = points[points.length - 2]
      const tangent = tip.clone().sub(secondToLast).normalize()
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
      cone.scale.setScalar(arrowheadScale(camera, tip))
      cone.visible = true
      const coneMat = cone.material as THREE.Material & { opacity?: number }
      if (coneMat && 'opacity' in coneMat) coneMat.opacity = 0.45
      return
    }

    // Current phase — animate progressively
    const drawnSegs = Math.max(0, Math.floor(phaseProgress * totalSegs))
    line.geometry.instanceCount = drawnSegs
    const mat = line.material as THREE.Material & { opacity?: number }
    if (mat && 'opacity' in mat) mat.opacity = 0.95

    if (drawnSegs < 2 || phaseProgress < 0.02) {
      cone.visible = false
      return
    }

    // Position cone at current tip
    const tipIdx = Math.min(drawnSegs, points.length - 1)
    const tip = points[tipIdx]
    const prevIdx = Math.max(0, tipIdx - 1)
    const prev = points[prevIdx]

    cone.position.copy(tip)
    const tangent = tip.clone().sub(prev).normalize()
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    cone.scale.setScalar(arrowheadScale(camera, tip))
    cone.visible = true
    const coneMat = cone.material as THREE.Material & { opacity?: number }
    if (coneMat && 'opacity' in coneMat) coneMat.opacity = 0.95
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
        opacity={0.95}
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
          opacity={0.95}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  )
}

export function BattleArrows({ battle }: { battle: Battle }) {
  const movements = useBattleMovements(battle)
  // Stable ref so MovementArrow useFrame closures always see the latest battle
  const battleRef = useRef<Battle>(battle)
  battleRef.current = battle

  return (
    <group>
      {movements.map((tagged) => (
        <MovementArrow
          key={`${tagged.phaseIndex}-${tagged.movIndex}`}
          tagged={tagged}
          battleRef={battleRef}
        />
      ))}
    </group>
  )
}
