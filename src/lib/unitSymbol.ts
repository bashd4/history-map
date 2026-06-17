import type { Movement } from '../data/schema'

type Echelon = NonNullable<Movement['echelon']>

/**
 * APP-6 echelon ticks drawn above a unit's frame.
 * (The branch glyph is an SVG shape switched on `movement.branch` directly in
 * the counter component — no mapper needed, since `branch` is already the
 * discriminant.)
 */
const ECHELON_TICKS: Record<Echelon, string> = {
  corps: 'XXX',
  division: 'XX',
  brigade: 'X',
  regiment: 'III',
  flotilla: '≈',
}

export function echelonTicks(echelon: Echelon): string {
  return ECHELON_TICKS[echelon]
}
