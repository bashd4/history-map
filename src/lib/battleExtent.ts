import type { Battle, LatLng } from '../data/schema'
import { latLngToVector3 } from './geo'

const cache = new WeakMap<Battle, number>()

/**
 * The battle's radius on the unit sphere (radians): the 90th-percentile angular
 * distance from the site over all waypoints/events/area outlines. A high
 * percentile (not the max) so a single far retreat or approach march doesn't
 * blow up the framing — the bulk of the action defines the frame and the rare
 * outlier runs off the edge, the classic battle-map look.
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
  battle.areas?.forEach((a) => a.outline.forEach(consider))
  dists.sort((a, b) => a - b)
  const extent = dists.length ? dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.9))] : 0
  cache.set(battle, extent)
  return extent
}

/**
 * Camera altitude (globe radii) that frames the battle as tightly as possible
 * while keeping the whole battle in view. Derived from the map-view geometry:
 * the camera looks straight down with a 45° fov, so the visible ground radius
 * is altitude·tan(22.5°) ≈ altitude·0.414. The ×3.3 factor sets the battle's
 * 90th-percentile radius to fill the frame's shorter (vertical) axis with a
 * little margin, accounting for the playback footer that covers the lower band.
 * `battle.frameScale` (default 1) lets a battle frame tighter on its core fight
 * when long approach marches would otherwise inflate the extent (e.g. Shiloh).
 * Clamped to [~6 km, ~380 km] — only a safety floor/ceiling, so each battle is
 * sized to its own footprint (Shiloh ~2 km dives close; Vicksburg ~40 km wide).
 */
export function battleFrameAltitude(battle: Battle, site: LatLng): number {
  const scale = battle.frameScale ?? 1
  return Math.min(0.06, Math.max(0.0009, battleExtent(battle, site) * 3.3 * scale))
}
