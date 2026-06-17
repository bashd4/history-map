/**
 * counterLayout — screen-space collision avoidance for unit counters.
 *
 * Each visible UnitCounter reports its projected screen position every frame;
 * `resolve()` (run once per frame from BattleUnits) pushes overlapping counters
 * apart and relaxes them back together when there's room. Counters read their
 * offset and apply it as a CSS translate on the counter DOM. This keeps clustered
 * units (and their strength numbers) legible and makes hover targets unambiguous.
 *
 * Module-level singleton, mirroring terrainRegistry/terrainSampler.
 */

interface Slot {
  x: number // reported base screen-x (px)
  y: number
  ox: number // resolved offset
  oy: number
  seen: number // frame index of the last report (to drop stale/hidden counters)
}

// Min centre-to-centre screen distance before two counters are pushed apart (px).
const SEPARATION = 38
// Max offset a counter may be nudged from its true position (px) — keep it near
// the real location so the map stays honest.
const MAX_OFFSET = 30
// Pull settled counters back toward their true position each frame.
const RELAX = 0.82

class CounterLayout {
  private slots = new Map<string, Slot>()
  private frame = 0

  /** A visible counter reports its true projected screen position each frame. */
  report(id: string, x: number, y: number): void {
    const s = this.slots.get(id)
    if (s) {
      s.x = x
      s.y = y
      s.seen = this.frame
    } else {
      this.slots.set(id, { x, y, ox: 0, oy: 0, seen: this.frame })
    }
  }

  /** Current resolved offset for a counter (zero if unknown/hidden). */
  offset(id: string): { x: number; y: number } {
    const s = this.slots.get(id)
    return s ? { x: s.ox, y: s.oy } : { x: 0, y: 0 }
  }

  /** Counter went hidden — drop it so it stops participating immediately. */
  forget(id: string): void {
    this.slots.delete(id)
  }

  /** Push apart any overlapping counters; run once per frame after reports. */
  resolve(): void {
    this.frame++
    const live: Slot[] = []
    for (const s of this.slots.values()) {
      if (s.seen >= this.frame - 2) live.push(s)
    }
    // Relax toward the true position.
    for (const s of live) {
      s.ox *= RELAX
      s.oy *= RELAX
    }
    // A few relaxation iterations of pairwise separation.
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i]
          const b = live[j]
          let dx = b.x + b.ox - (a.x + a.ox)
          let dy = b.y + b.oy - (a.y + a.oy)
          let d = Math.hypot(dx, dy)
          if (d >= SEPARATION) continue
          if (d < 0.01) {
            // Exactly coincident — split deterministically along x.
            dx = 1
            dy = 0
            d = 1
          }
          const push = (SEPARATION - d) / 2
          dx /= d
          dy /= d
          a.ox -= dx * push
          a.oy -= dy * push
          b.ox += dx * push
          b.oy += dy * push
        }
      }
    }
    // Clamp so a counter never strays too far from its real location.
    for (const s of live) {
      s.ox = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, s.ox))
      s.oy = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, s.oy))
    }
  }

  clear(): void {
    this.slots.clear()
  }
}

export const counterLayout = new CounterLayout()
