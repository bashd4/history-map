import type { Battle, LatLng, Movement } from '../data/schema'
import { geodeticToVector3, slerpUnit, vector3ToGeodetic } from './geo'
import { playbackAt } from './battlePlayback'

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
// unitPositionAt
// ---------------------------------------------------------------------------

export function unitPositionAt(track: PositionedTrack, battle: Battle, elapsed: number): LatLng | null {
  const segments = track.segments
  const firstPhase = segments[0].phaseIndex
  const lastPhase = segments[segments.length - 1].phaseIndex

  const { phaseIndex, phaseProgress } = playbackAt(battle, elapsed)

  // Outside the unit's existence window (before arrival / after departure) → hidden.
  if (phaseIndex < firstPhase || phaseIndex > lastPhase) return null

  const seg = segments.find((s) => s.phaseIndex === phaseIndex)
  if (!seg) return null
  if (seg.kind === 'rest') return seg.at

  // Move segment: interpolate along path by phaseProgress using slerp (great-circle).
  const path = seg.path
  const L = path.length - 1
  if (phaseProgress <= 0) return path[0]
  if (phaseProgress >= 1) return path[L]
  const f = phaseProgress * L
  const leg = Math.min(Math.floor(f), L - 1)
  const localT = f - leg
  const a = geodeticToVector3(path[leg].lat, path[leg].lng).normalize()
  const b = geodeticToVector3(path[leg + 1].lat, path[leg + 1].lng).normalize()
  return vector3ToGeodetic(slerpUnit(a, b, localT))
}
