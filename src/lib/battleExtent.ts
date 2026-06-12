import type { Battle, LatLng } from '../data/schema'
import { latLngToVector3 } from './geo'

const cache = new WeakMap<Battle, number>()

/**
 * The battle's CORE radius on the unit sphere (radians): the 80th-percentile
 * angular distance from the site over all waypoints/events/landmarks. A
 * percentile (not the max) so outliers — a retreat toward a distant town, an
 * approach march — don't blow up the framing; classic battle maps frame the
 * core and let retreats run off the edge.
 */
export function battleExtent(battle: Battle, site: LatLng): number {
  const cached = cache.get(battle)
  if (cached != null) return cached
  const siteV = latLngToVector3(site.lat, site.lng).normalize()
  const dists: number[] = []
  const consider = (p: LatLng) => {
    dists.push(latLngToVector3(p.lat, p.lng).normalize().angleTo(siteV))
  }
  for (const ph of battle.phases) {
    for (const m of ph.movements) m.path.forEach(consider)
    ph.events?.forEach((e) => consider(e.coords))
  }
  battle.landmarks?.forEach((l) => consider(l.coords))
  dists.sort((a, b) => a - b)
  const extent = dists.length ? dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.8))] : 0
  cache.set(battle, extent)
  return extent
}

/** Camera altitude (in globe radii) that frames the battle core: scales with
 *  extent, clamped to a sensible range (~32 km close, ~380 km wide). */
export function battleFrameAltitude(battle: Battle, site: LatLng): number {
  return Math.min(0.06, Math.max(0.005, battleExtent(battle, site) * 3))
}
