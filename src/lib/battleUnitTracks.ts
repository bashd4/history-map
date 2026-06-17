import type { Battle, LatLng, Movement } from '../data/schema'
import { geodeticToVector3, slerpUnit, vector3ToGeodetic } from './geo'
import { playbackAt } from './battlePlayback'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnitTrack {
  unit: string
  side: string
  branch: Movement['branch']
  echelon: Movement['echelon']
  strength?: number
  segments: Array<
    | { kind: 'rest'; phaseIndex: number; at: LatLng }
    | { kind: 'move'; phaseIndex: number; path: LatLng[]; style: Movement['style'] }
  >
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new WeakMap<Battle, UnitTrack[]>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Last coordinate of a segment's path/at position. */
function segmentEndpoint(seg: UnitTrack['segments'][number]): LatLng {
  if (seg.kind === 'rest') return seg.at
  return seg.path[seg.path.length - 1]
}

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
  const byUnit = new Map<
    string,
    Array<{ phaseIndex: number; movement: Movement }>
  >()

  for (let phaseIndex = 0; phaseIndex < battle.phases.length; phaseIndex++) {
    const phase = battle.phases[phaseIndex]
    for (const movement of phase.movements) {
      if (!movement.unit) continue
      const key = movement.unit
      if (!byUnit.has(key)) byUnit.set(key, [])
      byUnit.get(key)!.push({ phaseIndex, movement })
    }
  }

  // 2. Build a UnitTrack for each unit.
  const tracks: UnitTrack[] = []

  for (const [unitName, entries] of byUnit) {
    // Sort by phaseIndex (should already be ordered, but sort defensively).
    entries.sort((a, b) => a.phaseIndex - b.phaseIndex)

    const first = entries[0].movement

    // Validate consistency of immutable fields across all movements for this unit.
    for (const { movement } of entries.slice(1)) {
      if (movement.branch !== first.branch) {
        throw new Error(
          `Unit "${unitName}" has conflicting branch: "${first.branch}" vs "${movement.branch}"`,
        )
      }
      if (movement.echelon !== first.echelon) {
        throw new Error(
          `Unit "${unitName}" has conflicting echelon: "${first.echelon}" vs "${movement.echelon}"`,
        )
      }
      if (movement.side !== first.side) {
        throw new Error(
          `Unit "${unitName}" has conflicting side: "${first.side}" vs "${movement.side}"`,
        )
      }
      // strength is intentionally NOT validated — it is optional and may legitimately
      // differ across phases (e.g. losses). The first movement's value is carried.
    }

    const firstPhase = entries[0].phaseIndex
    const lastPhase = battle.phases.length - 1

    // Index of entries by phaseIndex for O(1) lookup.
    const entryByPhase = new Map(entries.map((e) => [e.phaseIndex, e]))

    const segments: UnitTrack['segments'] = []
    // Track the running endpoint as we build segments.
    let lastEndpoint: LatLng | null = null

    for (let pi = firstPhase; pi <= lastPhase; pi++) {
      const entry = entryByPhase.get(pi)

      if (entry) {
        // Move segment — possibly gap-bridge by prepending last endpoint.
        let path = [...entry.movement.path]
        if (lastEndpoint !== null && !latLngEqual(lastEndpoint, path[0])) {
          path = [lastEndpoint, ...path]
        }
        segments.push({ kind: 'move', phaseIndex: pi, path, style: entry.movement.style })
        lastEndpoint = path[path.length - 1]
      } else {
        // Rest segment at the last known position.
        // lastEndpoint is guaranteed non-null because pi >= firstPhase and
        // firstPhase's move sets it; subsequent phases inherit it.
        const at = lastEndpoint!
        segments.push({ kind: 'rest', phaseIndex: pi, at })
        // lastEndpoint stays the same.
      }
    }

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
// unitPositionAt
// ---------------------------------------------------------------------------

export function unitPositionAt(
  track: UnitTrack,
  battle: Battle,
  elapsed: number,
): LatLng | null {
  const { phaseIndex, phaseProgress, done } = playbackAt(battle, elapsed)

  const segments = track.segments

  // done / guard cases return the track's final endpoint. (Inlined rather than a
  // per-call closure — unitPositionAt runs every frame, once per unit.)
  if (done) {
    return segmentEndpoint(segments[segments.length - 1])
  }

  // Find the segment for this phase.
  const seg = segments.find((s) => s.phaseIndex === phaseIndex)

  if (!seg) {
    // phaseIndex is before the unit's first segment → unit hasn't appeared.
    if (phaseIndex < segments[0].phaseIndex) return null
    // phaseIndex is beyond the last segment (guard — shouldn't happen).
    return segmentEndpoint(segments[segments.length - 1])
  }

  if (seg.kind === 'rest') {
    return seg.at
  }

  // Move segment: interpolate along path by phaseProgress using slerp.
  const path = seg.path
  const L = path.length - 1

  // Edge cases for exact endpoints.
  if (phaseProgress <= 0) return path[0]
  if (phaseProgress >= 1) return path[L]

  const f = phaseProgress * L
  const leg = Math.min(Math.floor(f), L - 1)
  const localT = f - leg

  const a = geodeticToVector3(path[leg].lat, path[leg].lng).normalize()
  const b = geodeticToVector3(path[leg + 1].lat, path[leg + 1].lng).normalize()
  return vector3ToGeodetic(slerpUnit(a, b, localT))
}
