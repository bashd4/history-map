/**
 * counterLayout — screen-space collision avoidance for unit counters.
 *
 * Each visible UnitCounter reports its projected screen position every frame;
 * `resolve()` (run once per frame from BattleUnits) computes a de-overlap TARGET
 * offset for each counter and then DAMPS the applied offset toward that target.
 * Damping (rather than snapping the offset each frame) is essential: counters
 * move every frame, so a freshly-snapped offset would jitter/flicker. Counters
 * read their smoothed offset and apply it as a CSS translate.
 *
 * Module-level singleton, mirroring terrainRegistry/terrainSampler.
 */

interface Slot {
  x: number // reported base screen-x (px)
  y: number
  ox: number // smoothed (applied) offset
  oy: number
  tx: number // de-overlap target offset (recomputed each resolve)
  ty: number
  seen: number // frame index of the last report (to drop stale/hidden counters)
}

// Min centre-to-centre screen distance before two counters are pushed apart (px).
const SEPARATION = 26
// Max offset a counter may be nudged from its true position (px). Kept small:
// a counter's position IS the information on a battle map, so de-overlap must
// never shove it far from the real ground (a big nudge at a wide frame =
// hundreds of metres of apparent misplacement). Gentle separation only.
const MAX_OFFSET = 12
// Per-frame damping toward the target offset (lower = smoother / slower).
const DAMP = 0.18

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
      this.slots.set(id, { x, y, ox: 0, oy: 0, tx: 0, ty: 0, seen: this.frame })
    }
  }

  /** Current smoothed offset for a counter (zero if unknown/hidden). */
  offset(id: string): { x: number; y: number } {
    const s = this.slots.get(id)
    return s ? { x: s.ox, y: s.oy } : { x: 0, y: 0 }
  }

  /** Counter went hidden — drop it so it stops participating immediately. */
  forget(id: string): void {
    this.slots.delete(id)
  }

  /** Recompute de-overlap targets and damp toward them; run once per frame. */
  resolve(): void {
    this.frame++
    const live: Slot[] = []
    for (const s of this.slots.values()) {
      if (s.seen >= this.frame - 2) live.push(s)
    }

    // Recompute a fresh target offset from the base positions (no feedback from
    // last frame's offsets — that's what caused oscillation).
    for (const s of live) {
      s.tx = 0
      s.ty = 0
    }
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i]
          const b = live[j]
          let dx = b.x + b.tx - (a.x + a.tx)
          let dy = b.y + b.ty - (a.y + a.ty)
          let d = Math.hypot(dx, dy)
          if (d >= SEPARATION) continue
          if (d < 0.01) {
            // Coincident — split deterministically (stable across frames).
            dx = a.x <= b.x ? -1 : 1
            dy = 0
            d = 1
          }
          const push = (SEPARATION - d) / 2
          dx /= d
          dy /= d
          a.tx -= dx * push
          a.ty -= dy * push
          b.tx += dx * push
          b.ty += dy * push
        }
      }
    }
    // Clamp the target, then damp the applied offset toward it (smooth, no jitter).
    for (const s of live) {
      s.tx = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, s.tx))
      s.ty = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, s.ty))
      s.ox += (s.tx - s.ox) * DAMP
      s.oy += (s.ty - s.oy) * DAMP
    }
  }

  clear(): void {
    this.slots.clear()
  }
}

export const counterLayout = new CounterLayout()
