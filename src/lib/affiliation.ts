import type { Journey } from '../data/schema'

export type Affiliation = 'friendly' | 'hostile'
/** Frame shape source of truth: the journey's protagonist side renders as the
 *  friendly rectangle; every other side is the hostile diamond. */
export function affiliationOf(journey: Pick<Journey, 'protagonistSide'>, sideKey: string): Affiliation {
  return sideKey === journey.protagonistSide ? 'friendly' : 'hostile'
}
