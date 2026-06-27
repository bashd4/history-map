# Realistic Journey Routes — Design

**Date:** 2026-06-26
**Status:** Approved (brainstorming) → ready for plan

---

## Problem

The journey route draws a single great-circle arc between each pair of consecutive
stops (`useRouteGeometry` in `src/scene/RouteArcs.tsx` calls
`greatCirclePoints(stopA.coords, stopB.coords, 48)`), and the camera flies the same
straight arc. But Grant's real movements often deviated sharply from a straight
line — most famously the **1852 transfer to the Pacific coast via Panama**
(Sackets Harbor, NY → steamer to the Caribbean → across the Isthmus → Pacific
steamer up to the Columbia → Fort Vancouver), which the app currently renders as a
straight line across the continent. We want the drawn path **and the fly-through**
to follow the real route for the legs where it materially deviated.

## Goal

Let a stop carry optional **waypoints** describing the real path taken to reach it
from the previous stop. The route line is drawn through those waypoints, and the
camera *travels* them (sweeps down to Panama and back up to Oregon). Applied to the
**major-deviation legs only** (sea voyages / Panama crossings / clear water detours);
overland legs that were roughly direct stay as today's great-circle.

## Non-Goals

- **Not** a thorough per-leg pass over all 70 chapters — only legs with a clear,
  well-documented real deviation get waypoints.
- **Not** changing stop indexing. Stop count, the timeline panel, `activeStop`,
  the chapter mapping, and dwell behaviour are untouched.
- **Not** making *non-adjacent* jumps follow the waypoints (see Camera below).

---

## Architecture

**Waypoints live on the destination stop:** `via?: LatLng[]` = the intermediate
points the route passes through to reach *this* stop from the *previous* one. This
keeps everything index-based unchanged — only the geometry of a single leg changes.
(Alternative considered: inserting waypoints as pass-through entries in the camera
stop array. Rejected — it perturbs the t↔stop-index mapping that the timeline
highlight, `activeStop`, and the 70-chapter structure all depend on.)

A leg `i` (from `stops[i]` to `stops[i+1]`) has the polyline:
`[stops[i].coords, ...(stops[i+1].via ?? []), stops[i+1].coords]`.
With no `via`, that's `[A, B]` — exactly today's behaviour.

## Components

### 1. Data model — `src/data/schema.ts`
Add to the `stop` object:
```ts
/** Real intermediate waypoints the route passes through to reach this stop from
 *  the previous one (e.g. a sea voyage via Panama). Omit for a direct line. */
via: z.array(latLng).optional(),
```
Backward-compatible: existing stops (no `via`) render identically.

### 2. Route line — `src/scene/RouteArcs.tsx` (`useRouteGeometry`)
Rework to build each leg from its polyline:
- For leg `i`, walk the sub-hops `[A, w1], [w1, w2], …, [wLast, B]`, great-circle
  each, and concatenate (de-duplicating shared endpoints as today's `.slice` does).
- **Proportional subdivision:** segments per sub-hop ∝ great-circle angle, so dot
  density stays even on both a 70 km Isthmus hop and a 5,000 km Pacific hop, and so
  point-index is ≈ arc length within a leg (load-bearing for the fill sync in §4):
  `segments = clamp(round(angle / STEP), MIN, MAX)` with **`STEP = 0.02` rad
  (~125 km/segment), `MIN = 2`, `MAX = 96`**. (The `MIN`/`MAX` clamp is what bounds
  how tightly the §4 sync holds on a very uneven leg — keep `MAX` generous.)
- **Arc bulge (`lift`):** `greatCirclePoints` bulges each arc by `lift·max(angle,0.15)`,
  i.e. **per sub-hop**. Decision: keep it — a long hop (the Pacific lane) bulges once,
  tiny hops (the Isthmus) barely bulge, so a multi-hop leg reads as a natural sequence
  of travel arcs, not a problem. No change to `greatCirclePoints`.
- Return **both** the flat `points` array **and** a `legStarts: number[]` — the
  cumulative point index where each leg begins — so the progressive fill (below)
  can map hops → exact point index. Today's single-`points` consumers keep working.

### 3. Camera follows the route — `src/lib/journeyCamera.ts`
- `stopsForCamera(journey)` must carry `via` through (currently drops it).
- `cameraAt(t, stops)`: the **dwell** branch is unchanged (holds at `stops[seg]`).
  The **travel** branch (currently a single `slerpUnit(A, B, tt)`) instead samples
  leg `seg`'s polyline **by cumulative great-circle arc length** at `tt`
  (`tt = ease((local − DWELL)/(1 − DWELL))`, the existing smoothstep). Even
  arc-length pacing → constant ground speed across uneven sub-hops (no lurch on the
  short Isthmus hop). Altitude still arcs to `CRUISE_ALT` via `sin(π·tt)` once
  across the whole leg. A per-leg polyline + cumulative-angle table is memoised
  (e.g. `WeakMap<Journey, …>`), mirroring `stopsCache`.
- `routeProgressAt(t, n)` continues to return progress in **hops** (`seg + tt`
  during travel, holding at `seg` through dwell) — the line tip already tracks this.

### 4. Line ↔ camera sync — `RouteArcsProgress`
The bright "traveled" line fills to `instanceCount`. With variable-length legs the
current uniform `segsPerHop` is wrong. Replace it: from `routeProgressAt` (hops =
`floor` leg + `frac`), interpolate into `legStarts` →
`drawn = legStarts[floor] + frac · (legStarts[floor+1] − legStarts[floor])`. This
keeps the bright tip glued to the camera, including mid-Pacific.

**Why this stays synced (the load-bearing invariant):** the camera tip sits at
*arc-length* fraction `tt` along the leg, while this fill interpolates `legStarts`
*linearly in point-index* at `frac = tt`. They coincide **because** §2 subdivides
each sub-hop proportionally to its angle, making point-index ≈ arc length within a
leg. If proportional subdivision were dropped or `MAX`-clamped too low on a very
uneven leg, the tip could drift by up to one sub-hop. The §-Testing sync test guards
this directly.

### 5. Camera-follow scope (a deliberate limitation)
Only the `journeyT`-tween path follows the waypoints: **adjacent** navigation
(arrow keys / next-prev one step) and timeline scrubbing run through `cameraAt`, so
they sweep the real route. **Non-adjacent** jumps (clicking a distant stop) use the
existing 2-stop direct great-circle flight in `useJourneyNavigation` and skip the
waypoints — acceptable, since the detour is meant to be experienced by stepping
through the chapters in order (the normal way), and a direct jump across the country
shouldn't detour through Panama anyway.

### 6. Data — researched waypoints
Read the relevant memoir chapters (Gutenberg #4367, already used for Shiloh) and pin
real waypoints, using authoritative geography (port cities, the Isthmus route) for
each:
- **Ch.15 Fort Vancouver** `via`: the 1852 outbound — Atlantic steamer lane →
  Aspinwall/Colón (~9.35, −79.90) → Panama City (~8.95, −79.53) → Pacific lane →
  San Francisco (~37.77, −122.42) → mouth of the Columbia → up-river to Fort
  Vancouver.
- **Ch.16 Galena** `via`: the 1854 return — San Francisco → Panama City → Isthmus →
  Aspinwall → Atlantic → New York → overland to Galena.
- **Mexican-War sea legs** where a straight line is clearly wrong: e.g. **Ch.4
  Corpus Christi** `via` (New Orleans → Gulf to Corpus Christi) and the **Veracruz**
  landing (re-embark on the Gulf coast → Veracruz). Confirm exact legs against the
  chapters before adding.
Overland legs (e.g. West Point ↔ Missouri, the close Civil-War moves) stay straight
unless a chapter clearly describes a major water/rail detour.

The two Panama crossings (Ch.15, Ch.16) are confirmed. The Mexican-War sea legs
(Ch.4 Corpus Christi; the Veracruz landing) are **research-tasks** in the plan: the
plan must verify, per chapter, which legs actually went by sea before adding `via`,
with an explicit acceptance check ("only legs whose chapter describes a sea/water
detour get waypoints") — don't fabricate detours the source doesn't support.

## Data flow

```
stop.via ──► useRouteGeometry ──► { points, legStarts }
                                      │            │
                                      ▼            ▼
                              <Line> (full route)  RouteArcsProgress fill (legStarts)
stop.via ──► stopsForCamera ──► cameraAt(t) ──► camera pos (arc-length along leg polyline)
                                   │
                                   └─► routeProgressAt(t) ──► hops ──► (legStarts) ──► instanceCount
```

## Error handling / edge cases
- **No `via` / empty `via`:** leg polyline is `[A, B]` → identical to today
  (regression-guard with a test).
- **Antimeridian / Pacific crossings:** handled by the existing `slerpUnit`
  (great-circle interpolation), as the Pacific hop requires.
- **Degenerate via** (a waypoint coincident with an endpoint): zero-length sub-hop
  contributes no points/arc; guard against divide-by-zero in arc-length sampling.
- **Camera altitude** uses the whole-leg `tt`, so a multi-hop leg still arcs out and
  back once (not once per sub-hop).

## Testing
Unit tests (`src/lib/journeyCamera.test.ts`, `src/lib/geo.test.ts` as needed):
- A leg with `via` produces a polyline through the waypoints; a leg without `via`
  is byte-for-byte the old two-point arc.
- Arc-length sampling at `tt = 0 / 0.5 / 1` returns the leg's start / mid-by-arc /
  end; even pacing verified on a deliberately uneven leg (one short + one long hop).
- `legStarts` is monotonic and its last entry equals `points.length`.
- Progressive-fill index from `routeProgressAt` + `legStarts` matches the camera's
  position at sampled `t` (the sync invariant).
- Existing journey-camera tests still pass (no `via` = unchanged).

Live verification (WebGL can't run headless): step through Ch.14 → Ch.15 on the
globe and confirm the camera sweeps down to Panama, across the Isthmus, and up to
Fort Vancouver, with the bright line tip tracking it.
