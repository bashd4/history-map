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
import { terrainSampler, useTerrainHeightsVersion } from './useTerrainHeights'

// Clearance above the sampled terrain surface (~50 m in scene units).
// depthTest is false so nothing gets buried visually at this tight clearance.
const SURFACE_CLEARANCE = 0.000008

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
const CASING_OPACITY = 0.85
const CASING_COLOR = '#1a140c'

// Auto-fade timing constants (seconds)
const LABEL_FADE_HOLD = 2.5   // seconds at full opacity after completion
const LABEL_FADE_RAMP = 0.6   // seconds to ramp from 1 to 0

// Scratch objects — never allocate in the frame loop.
const _UP = new THREE.Vector3(0, 1, 0)
const _tangent = new THREE.Vector3()

/**
 * Collect all distinct (lat, lng) waypoints for a movement path, with
 * interpolated slerp steps, for pre-registering with the terrain sampler.
 */
/**
 * Recover geographic longitude from a unit vector produced by latLngToVector3.
 * latLngToVector3 encodes as theta = (lng + 180)*π/180, so atan2(v.z, -v.x)
 * returns theta (in degrees), not lng. We must subtract 180 and normalise.
 */
function recoverLng(v: THREE.Vector3): number {
  const theta = Math.atan2(v.z, -v.x) * (180 / Math.PI) // = lng + 180
  return theta - 180 < -180 ? theta + 180 : theta - 180  // normalise to [-180, 180]
}

function movementLatLngs(movement: Movement): Array<{ lat: number; lng: number }> {
  const out: Array<{ lat: number; lng: number }> = []
  for (let leg = 0; leg < movement.path.length - 1; leg++) {
    const from = movement.path[leg]
    const to = movement.path[leg + 1]
    const a = latLngToVector3(from.lat, from.lng).normalize()
    const b = latLngToVector3(to.lat, to.lng).normalize()
    const start = leg === 0 ? 0 : 1
    for (let i = start; i <= SEGS_PER_LEG; i++) {
      const t = i / SEGS_PER_LEG
      // Recover lat/lng from the slerped unit vector.
      const v = slerpUnit(a, b, t)
      const lat = Math.asin(Math.max(-1, Math.min(1, v.y))) * (180 / Math.PI)
      const lng = recoverLng(v)
      out.push({ lat, lng })
    }
  }
  return out
}

/** Build surface-hugging polyline points for a movement, draping onto terrain. */
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
      const v = slerpUnit(a, b, t)
      // Recover lat/lng for this interpolated point to look up sampled height
      const lat = Math.asin(Math.max(-1, Math.min(1, v.y))) * (180 / Math.PI)
      const lng = recoverLng(v)
      const surfaceR = terrainSampler.sampleRadius(lat, lng)
      pts.push(v.clone().multiplyScalar(surfaceR + SURFACE_CLEARANCE))
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
  const heightsVersion = useTerrainHeightsVersion()

  // Pre-register all path points with the sampler so they stay cached.
  // Re-registers whenever battle data changes (new battle loaded).
  useMemo(() => {
    const allPoints: Array<{ lat: number; lng: number }> = []
    battle.phases.forEach((phase) => {
      phase.movements.forEach((movement) => {
        allPoints.push(...movementLatLngs(movement))
      })
    })
    terrainSampler.registerPoints('arrows', allPoints)
  }, [battle])

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
  // heightsVersion triggers a rebuild when terrain data refreshes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle, heightsVersion])
}

type ArrowState = 'hidden' | 'completed' | 'current'

/**
 * Single animated movement arrow with dark casing for legibility.
 * Renders a casing (near-black, slightly wider) below the colored arrow.
 * Both lines animate in sync via shared instanceCount writes.
 *
 * The unit label (if any) rides the animated tip, auto-fades after completion,
 * and reappears on hover over the casing or cone.
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
  const casingRef = useRef<Line2>(null)
  const coneRef = useRef<THREE.Mesh>(null)
  // Last applied state — lets the static hidden/completed branches skip
  // redundant per-frame writes (only the current phase animates).
  const lastStateRef = useRef<ArrowState | null>(null)
  const totalSegs = points.length - 1

  // Label tracking refs — all driven imperatively; no React state at frame rate.
  const labelGroupRef = useRef<THREE.Group>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const completedAtRef = useRef<number | null>(null)
  const hoveredRef = useRef(false)

  const isDashed = movement.style === 'retreat' || movement.style === 'feint'
  const color = battle.sides[movement.side] ?? '#ffffff'
  const lineWidth = movement.style === 'advance' ? 2.5 : 2
  const casingWidth = lineWidth + 2

  const hasLabel = Boolean(movement.unit)

  useFrame(({ camera, clock }) => {
    const { battleElapsed, mode } = useAppStore.getState()
    if (mode !== 'battle') return

    const line = lineRef.current
    const casing = casingRef.current
    const cone = coneRef.current
    if (!line || !casing || !cone) return

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
        // Update completed-phase label opacity (fade / hover).
        if (hasLabel) {
          updateLabelOpacity(clock.elapsedTime)
        }
      }
      return
    }

    // Handle state transitions — reset label state when going to hidden.
    if (state === 'hidden' && lastStateRef.current !== 'hidden') {
      completedAtRef.current = null
    }

    lastStateRef.current = state

    if (state === 'hidden') {
      line.geometry.instanceCount = 0
      casing.geometry.instanceCount = 0
      cone.visible = false
      if (hasLabel && divRef.current) {
        divRef.current.style.opacity = '0'
      }
      return
    }

    const lineMat = line.material as THREE.Material
    const casingMat = casing.material as THREE.Material
    const coneMat = cone.material as THREE.Material

    if (state === 'completed') {
      // Fully drawn, faded.
      line.geometry.instanceCount = totalSegs
      casing.geometry.instanceCount = totalSegs
      lineMat.opacity = OPACITY_DONE
      casingMat.opacity = CASING_OPACITY * 0.3 // casing dims proportionally
      const tip = points[points.length - 1]
      cone.position.copy(tip)
      _tangent.subVectors(tip, points[points.length - 2]).normalize()
      cone.quaternion.setFromUnitVectors(_UP, _tangent)
      cone.scale.setScalar(screenScale(camera, tip, CONE_FRAC, CONE_MIN, CONE_MAX))
      cone.visible = true
      coneMat.opacity = OPACITY_DONE

      if (hasLabel) {
        // Move label to the completed tip position.
        labelGroupRef.current?.position.copy(tip)
        // Record completion time once.
        if (completedAtRef.current === null) {
          completedAtRef.current = clock.elapsedTime
        }
        updateLabelOpacity(clock.elapsedTime)
      }
      return
    }

    // Current phase — animate progressively every frame
    const drawnSegs = Math.max(0, Math.floor(phaseProgress * totalSegs))
    // Write both refs in sync
    line.geometry.instanceCount = drawnSegs
    casing.geometry.instanceCount = drawnSegs
    lineMat.opacity = OPACITY_CURRENT
    casingMat.opacity = CASING_OPACITY

    // Reset completedAt when replaying from the start of this phase.
    if (phaseProgress < 0.02) {
      completedAtRef.current = null
    }

    if (drawnSegs < 2 || phaseProgress < 0.02) {
      cone.visible = false
      if (hasLabel && divRef.current) {
        divRef.current.style.opacity = '0'
      }
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

    if (hasLabel) {
      // Move label group to the tip.
      labelGroupRef.current?.position.copy(tip)
      if (divRef.current) {
        divRef.current.style.opacity = String(OPACITY_CURRENT)
      }
    }
  })

  /** Compute and apply label opacity imperatively — no React state. */
  function updateLabelOpacity(now: number) {
    const div = divRef.current
    if (!div) return

    if (hoveredRef.current) {
      div.style.opacity = String(OPACITY_CURRENT)
      return
    }

    const completedAt = completedAtRef.current
    if (completedAt === null) {
      div.style.opacity = '0'
      return
    }

    const age = now - completedAt
    if (age < LABEL_FADE_HOLD) {
      div.style.opacity = String(OPACITY_CURRENT)
    } else {
      const t = Math.min(1, (age - LABEL_FADE_HOLD) / LABEL_FADE_RAMP)
      div.style.opacity = String(OPACITY_CURRENT * (1 - t))
    }
  }

  function onPointerOver() {
    hoveredRef.current = true
    document.body.style.cursor = 'pointer'
    // Immediately reveal label.
    if (divRef.current) {
      divRef.current.style.opacity = String(OPACITY_CURRENT)
    }
  }

  function onPointerOut() {
    hoveredRef.current = false
    document.body.style.cursor = ''
  }

  return (
    <group>
      {/* Casing — rendered below the colored arrow for legibility */}
      <Line
        ref={casingRef}
        points={points}
        color={CASING_COLOR}
        lineWidth={casingWidth}
        dashed={isDashed}
        dashScale={isDashed ? 5 : undefined}
        transparent
        opacity={CASING_OPACITY}
        toneMapped={false}
        depthWrite={false}
        depthTest={false}
        renderOrder={9}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
      {/* Colored arrow — on top of casing */}
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
      <mesh
        ref={coneRef}
        visible={false}
        renderOrder={10}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
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
      {hasLabel && (
        // group ref drives the 3-D position; Html re-projects every frame.
        <group ref={labelGroupRef} position={points[0]}>
          <Html zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
            <div
              ref={divRef}
              style={{
                opacity: 0,
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontVariant: 'small-caps',
                fontSize: '10px',
                letterSpacing: '0.04em',
                color,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 3px rgba(0,0,0,.95), 0 0 8px rgba(0,0,0,.7)',
                userSelect: 'none',
                display: 'inline-block',
                transform: 'translate(12px, -16px)',
                transition: 'none',
              }}
            >
              {movement.unit}
            </div>
          </Html>
        </group>
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
