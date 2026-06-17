import * as THREE from 'three'
import type { Battle, LatLng, Movement } from '../data/schema'
import { geodeticToVector3, slerpUnit, vector3ToGeodetic } from './geo'
import { phaseSeconds } from './battlePlayback'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackSegment =
  | { kind: 'rest'; phaseIndex: number; at: LatLng }
  | { kind: 'move'; phaseIndex: number; path: LatLng[]; style: Movement['style'] }

export interface UnitTrack {
  unit: string
  side: string
  branch: Movement['branch']
  echelon: Movement['echelon']
  strength?: number
  segments: TrackSegment[]
}

/** A positioned track is anything with phase-keyed segments — units and the
 *  commander both interpolate through `unitPositionAt` off this shape. */
export interface PositionedTrack {
  segments: TrackSegment[]
}

/** The journey protagonist's personal track across a battle. */
export interface CommanderTrack extends PositionedTrack {
  name: string
  side: string
}

/** One leg of a track before segment expansion. */
interface SegmentInput {
  phaseIndex: number
  path: LatLng[]
  style: Movement['style']
  arrives?: boolean
  departs?: boolean
}

/**
 * Expand a unit's (or the commander's) sorted movement legs into a per-phase
 * segment list spanning its existence window. Phases without a leg become
 * `rest` at the last known position; consecutive legs are gap-bridged so a unit
 * never teleports between them.
 *
 *  - default: present from phase 0, resting at its start position until it first
 *    acts — deployed forces don't pop in when they finally move.
 *  - `arrives`: a reinforcement / late entry that appears only when it first moves.
 *  - `departs`: hands off / withdraws after its last move (e.g. a corps that
 *    splits into its divisions) rather than lingering to the end.
 */
function buildSegments(entries: SegmentInput[], lastBattlePhase: number): TrackSegment[] {
  const firstMovePhase = entries[0].phaseIndex
  const lastMovePhase = entries[entries.length - 1].phaseIndex
  const arrives = entries.some((e) => e.arrives)
  const departs = entries.some((e) => e.departs)
  const existStart = arrives ? firstMovePhase : 0
  const existEnd = departs ? lastMovePhase : lastBattlePhase
  const startRestPos = entries[0].path[0]

  const entryByPhase = new Map(entries.map((e) => [e.phaseIndex, e]))
  const segments: TrackSegment[] = []
  let lastEndpoint: LatLng | null = null

  for (let pi = existStart; pi <= existEnd; pi++) {
    const entry = entryByPhase.get(pi)
    if (entry) {
      // Move segment — gap-bridge by prepending the current resting position.
      let path = [...entry.path]
      const from = lastEndpoint ?? startRestPos
      if (!latLngEqual(from, path[0])) path = [from, ...path]
      segments.push({ kind: 'move', phaseIndex: pi, path, style: entry.style })
      lastEndpoint = path[path.length - 1]
    } else {
      // Rest at the last known position (or the start position before first move).
      segments.push({ kind: 'rest', phaseIndex: pi, at: lastEndpoint ?? startRestPos })
    }
  }
  return segments
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new WeakMap<Battle, UnitTrack[]>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * True when two LatLng values are equal to 5 decimal places (~1 m precision).
 * Used to avoid prepending a duplicate point when bridging a gap.
 */
function latLngEqual(a: LatLng, b: LatLng): boolean {
  return (
    Math.round(a.lat * 1e5) === Math.round(b.lat * 1e5) &&
    Math.round(a.lng * 1e5) === Math.round(b.lng * 1e5)
  )
}

// ---------------------------------------------------------------------------
// battleUnitTracks
// ---------------------------------------------------------------------------

export function battleUnitTracks(battle: Battle): UnitTrack[] {
  const cached = cache.get(battle)
  if (cached) return cached

  // 1. Gather per-unit movements, tagged with their phase index.
  const byUnit = new Map<string, Array<{ phaseIndex: number; movement: Movement }>>()
  for (let phaseIndex = 0; phaseIndex < battle.phases.length; phaseIndex++) {
    for (const movement of battle.phases[phaseIndex].movements) {
      if (!movement.unit) continue
      const key = movement.unit
      if (!byUnit.has(key)) byUnit.set(key, [])
      byUnit.get(key)!.push({ phaseIndex, movement })
    }
  }

  const lastBattlePhase = battle.phases.length - 1
  const tracks: UnitTrack[] = []

  for (const [unitName, entries] of byUnit) {
    entries.sort((a, b) => a.phaseIndex - b.phaseIndex)
    const first = entries[0].movement

    // Immutable fields must agree across a unit's movements (type system can't catch
    // a hand-edit that gives one unit two branches/echelons/sides).
    for (const { movement } of entries.slice(1)) {
      if (movement.branch !== first.branch) {
        throw new Error(`Unit "${unitName}" has conflicting branch: "${first.branch}" vs "${movement.branch}"`)
      }
      if (movement.echelon !== first.echelon) {
        throw new Error(`Unit "${unitName}" has conflicting echelon: "${first.echelon}" vs "${movement.echelon}"`)
      }
      if (movement.side !== first.side) {
        throw new Error(`Unit "${unitName}" has conflicting side: "${first.side}" vs "${movement.side}"`)
      }
      // strength is intentionally NOT validated — it is optional and may legitimately
      // differ across phases (e.g. losses). The first movement's value is carried.
    }

    const segments = buildSegments(
      entries.map((e) => ({
        phaseIndex: e.phaseIndex,
        path: e.movement.path,
        style: e.movement.style,
        arrives: e.movement.arrives,
        departs: e.movement.departs,
      })),
      lastBattlePhase,
    )

    tracks.push({
      unit: unitName,
      side: first.side,
      branch: first.branch,
      echelon: first.echelon,
      strength: first.strength,
      segments,
    })
  }

  cache.set(battle, tracks)
  return tracks
}

// ---------------------------------------------------------------------------
// commanderTrack
// ---------------------------------------------------------------------------

const commanderCache = new WeakMap<Battle, CommanderTrack | null>()

/**
 * Build the protagonist commander's personal track (or null if the battle has
 * no authored commander). Reuses the same segment engine as units, so the
 * marker glides, holds, and arrives by the identical rules.
 */
export function commanderTrack(battle: Battle): CommanderTrack | null {
  if (commanderCache.has(battle)) return commanderCache.get(battle)!
  const c = battle.commander
  if (!c) {
    commanderCache.set(battle, null)
    return null
  }
  const entries: SegmentInput[] = c.movements
    .map((m) => ({ phaseIndex: m.phase, path: m.path, style: 'advance' as const, arrives: m.arrives }))
    .sort((a, b) => a.phaseIndex - b.phaseIndex)
  const track: CommanderTrack = {
    name: c.name,
    side: c.side,
    segments: buildSegments(entries, battle.phases.length - 1),
  }
  commanderCache.set(battle, track)
  return track
}

// ---------------------------------------------------------------------------
// Continuous timeline (arc-length pacing)
// ---------------------------------------------------------------------------

/**
 * A maximal run of consecutive moving phases, flattened into one polyline with
 * cumulative great-circle length. The unit traverses it at constant ground speed
 * (arc-length paced) over [tStart, tEnd] with a smooth ease in/out — so it
 * accelerates from rest, glides across phase seams without a velocity jump, and
 * decelerates back to rest. This is what makes the battle read as one continuous
 * motion rather than per-phase bursts.
 */
interface MotionRun {
  tStart: number
  tEnd: number
  pts: THREE.Vector3[] // unit vectors
  cum: number[] // cumulative angular length; cum[last] = total
  total: number
  endLatLng: LatLng // raw final point — returned exactly while holding (no vector round-trip)
}

interface Timeline {
  tAppear: number // hidden before this (arrival)
  tVanish: number // hidden at/after this (departure); Infinity if it stays to the end
  startPos: LatLng // held position before the first motion run
  runs: MotionRun[]
}

const timelineCache = new WeakMap<PositionedTrack, Timeline>()

/** Cumulative [start, end] wall-clock seconds for each phase. */
function phaseWindows(battle: Battle): { start: number[]; end: number[] } {
  const durs = phaseSeconds(battle)
  const start: number[] = []
  const end: number[] = []
  let acc = 0
  for (let i = 0; i < durs.length; i++) {
    start[i] = acc
    acc += durs[i]
    end[i] = acc
  }
  return { start, end }
}

function smoothstep(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t
  return x * x * (3 - 2 * x)
}

function buildTimeline(track: PositionedTrack, battle: Battle): Timeline {
  const cached = timelineCache.get(track)
  if (cached) return cached

  const { start, end } = phaseWindows(battle)
  const segs = track.segments
  const firstPhase = segs[0].phaseIndex
  const lastPhase = segs[segs.length - 1].phaseIndex
  const seg0 = segs[0]
  const startPos = seg0.kind === 'rest' ? seg0.at : seg0.path[0]

  // Group consecutive 'move' segments into runs (a unit moving in phases 3-4-5
  // becomes ONE run, so it glides through without stopping at each seam).
  const runs: MotionRun[] = []
  let i = 0
  while (i < segs.length) {
    if (segs[i].kind !== 'move') {
      i++
      continue
    }
    const runStartPhase = segs[i].phaseIndex
    const rawPts: LatLng[] = []
    let j = i
    while (j < segs.length && segs[j].kind === 'move') {
      const mseg = segs[j] as Extract<TrackSegment, { kind: 'move' }>
      for (const p of mseg.path) {
        const last = rawPts[rawPts.length - 1]
        if (!last || !latLngEqual(last, p)) rawPts.push(p)
      }
      j++
    }
    const pts = rawPts.map((p) => geodeticToVector3(p.lat, p.lng).normalize())
    const cum = [0]
    for (let k = 1; k < pts.length; k++) cum[k] = cum[k - 1] + pts[k - 1].angleTo(pts[k])
    runs.push({
      tStart: start[runStartPhase],
      tEnd: end[segs[j - 1].phaseIndex],
      pts,
      cum,
      total: cum[cum.length - 1],
      endLatLng: rawPts[rawPts.length - 1],
    })
    i = j
  }

  // A unit whose track ends before the last battle phase has `departs` — it
  // vanishes after its window; otherwise it holds its final position to the end.
  const departed = lastPhase < battle.phases.length - 1
  const timeline: Timeline = {
    tAppear: start[firstPhase],
    tVanish: departed ? end[lastPhase] : Infinity,
    startPos,
    runs,
  }
  timelineCache.set(track, timeline)
  return timeline
}

// ---------------------------------------------------------------------------
// unitPositionAt
// ---------------------------------------------------------------------------

/**
 * Position of a unit (or the commander) on a single continuous battle clock.
 * Motion is arc-length paced with an ease in/out per motion run, so speed is
 * smooth across phase boundaries; the unit holds position while resting and is
 * null while off-field (before arrival / after departure).
 */
export function unitPositionAt(track: PositionedTrack, battle: Battle, elapsed: number): LatLng | null {
  const tl = buildTimeline(track, battle)
  if (elapsed < tl.tAppear || elapsed >= tl.tVanish) return null

  // `held` is the exact resting position (no vector round-trip) used whenever the
  // unit is stationary — before a run, between runs, or after the last one.
  let held: LatLng = tl.startPos
  for (const run of tl.runs) {
    if (elapsed < run.tStart) return held // holding before this run starts
    if (elapsed <= run.tEnd) {
      if (run.total < 1e-9) return run.endLatLng
      const u = smoothstep((elapsed - run.tStart) / (run.tEnd - run.tStart))
      const target = u * run.total
      let k = 1
      while (k < run.cum.length && run.cum[k] < target) k++
      const segLen = run.cum[k] - run.cum[k - 1]
      const localT = segLen > 1e-12 ? (target - run.cum[k - 1]) / segLen : 0
      return vector3ToGeodetic(slerpUnit(run.pts[k - 1], run.pts[k], localT))
    }
    held = run.endLatLng // past this run → hold its end until the next
  }
  return held // after the last run → hold the final position
}
