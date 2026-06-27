# Realistic Journey Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a stop carry optional `via` waypoints so the journey route line **and** the camera fly-through follow Grant's real path (e.g. the 1852 Pacific-coast journey via Panama) instead of a straight great-circle, for the major-deviation legs.

**Architecture:** `via` lives on the *destination* stop and only changes one leg's geometry — stop indexing, the timeline, `activeStop`, and dwell behaviour are untouched. The route line and `cameraAt`'s travel phase both traverse the leg polyline `[prevStop, ...via, thisStop]`; the camera paces by great-circle arc length; the bright "traveled" tip stays synced via a per-leg point-index table (`legStarts`).

**Tech Stack:** Vite + React 19 + TypeScript + @react-three/fiber + @react-three/drei + three + zustand + Vitest.

**Spec:** `docs/superpowers/specs/2026-06-26-realistic-routes-design.md`

**Project note:** Solo side-project on `main`; commits are local and the **user gates all pushes/deploys**. Per-task `git commit` steps are local-only — do NOT push or deploy. Gate every commit on a clean build with `npm run build` (which runs `tsc -b` — stricter than `tsc --noEmit`, has `noUnusedLocals/Parameters`); never gate with `npx tsc --noEmit | head` (masks the exit code — a recurring past failure). Run tests with `npm test`; a single file with `npx vitest run <file>`.

**Conventions:** Vitest, co-located `*.test.ts`, `import { describe, expect, it } from 'vitest'`. The globe is radius 1; lat/lng↔vector via `latLngToVector3`/`vecToLatLng` (spherical) for the journey layer (NOT the geodetic battle layer).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/data/schema.ts` | Add optional `via` to the stop schema | **Modify** |
| `src/lib/geo.ts` | New pure `sampleArcByLength` (arc-length point on a polyline) | **Modify** |
| `src/lib/geo.test.ts` | Tests for `sampleArcByLength` | **Modify** |
| `src/lib/journeyCamera.ts` | `cameraAt` travel phase walks the leg polyline by arc length; `stopsForCamera` carries `via`; stops type gains `via?` | **Modify** |
| `src/lib/journeyCamera.test.ts` | Tests: via-leg sampling, no-via regression | **Modify** |
| `src/scene/RouteArcs.tsx` | `useRouteGeometry` builds legs through `via` (proportional subdivision) and returns `{ points, legStarts }`; `RouteArcsProgress` fill uses `legStarts` | **Modify** |
| `src/journeys/grant/stops1.ts` | Add researched `via` to Ch.15 / Ch.16 (and any confirmed Mexican-War sea leg) | **Modify** |

---

## Task 1: `via` field on the stop schema

**Files:**
- Modify: `src/data/schema.ts` (the `const stop = z.object({…})`, ~line 125)
- Test: `src/data/journeys.test.ts` (schema validation already runs per journey)

- [ ] **Step 1: Add the field.** In the `stop` object, after `camera: …optional(),` add:
```ts
  /** Real intermediate waypoints the route passes through to reach this stop from
   *  the previous one (e.g. a sea voyage via Panama). Omit for a direct line. */
  via: z.array(latLng).optional(),
```
(`latLng` is already defined at the top of the file. The exported `Stop` type updates automatically.)

- [ ] **Step 2: Verify.** `npm run build` (clean) and `npm test` (the existing `journeys.test.ts` schema-validation loop still passes — no stop has `via` yet, so nothing changes).

- [ ] **Step 3: Commit.**
```bash
git add src/data/schema.ts
git commit -m "feat(routes): optional via waypoints on the stop schema"
```

---

## Task 2: `sampleArcByLength` — pure arc-length sampler (TDD)

A unit-vector point at arc-length fraction `tt` along a polyline of unit vectors. Lives in `geo.ts` next to `slerpUnit`.

**Files:**
- Modify: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

- [ ] **Step 1: Write the failing tests.** Add to `src/lib/geo.test.ts`:
```ts
import { sampleArcByLength, latLngToVector3 } from './geo'
// (add sampleArcByLength to the existing import if geo.test already imports from './geo')

describe('sampleArcByLength', () => {
  const v = (lat: number, lng: number) => latLngToVector3(lat, lng).normalize()

  it('returns the endpoints at tt=0 and tt=1', () => {
    const verts = [v(0, 0), v(0, 30), v(0, 90)]
    expect(sampleArcByLength(verts, 0).angleTo(verts[0])).toBeCloseTo(0, 6)
    expect(sampleArcByLength(verts, 1).angleTo(verts[2])).toBeCloseTo(0, 6)
  })

  it('paces by arc length, not by segment count (uneven hops)', () => {
    // hop A→B is 10°, hop B→C is 90°; total 100°. tt=0.5 → 50° from A (40° past B).
    const verts = [v(0, 0), v(0, 10), v(0, 100)]
    const p = sampleArcByLength(verts, 0.5)
    expect(p.angleTo(verts[0])).toBeCloseTo((50 * Math.PI) / 180, 4)
  })

  it('handles a 2-point polyline like a plain slerp', () => {
    const verts = [v(0, 0), v(0, 80)]
    expect(sampleArcByLength(verts, 0.25).angleTo(verts[0])).toBeCloseTo((20 * Math.PI) / 180, 5)
  })

  it('degenerate (all coincident) returns the first vertex', () => {
    const verts = [v(10, 20), v(10, 20)]
    expect(sampleArcByLength(verts, 0.7).angleTo(verts[0])).toBeCloseTo(0, 6)
  })
})
```
(Drop the `await import` line if it complicates — the `angleTo` assertions are sufficient.)

- [ ] **Step 2: Run → fail.** `npx vitest run src/lib/geo.test.ts` — FAIL (not exported).

- [ ] **Step 3: Implement** in `src/lib/geo.ts`:
```ts
/** Point (unit vector) at arc-length fraction `tt`∈[0,1] along a polyline of unit
 *  vectors, paced by cumulative great-circle angle so speed is even across uneven
 *  hops. A 2-vertex input is a plain great-circle slerp. */
export function sampleArcByLength(verts: THREE.Vector3[], tt: number): THREE.Vector3 {
  if (verts.length <= 1) return verts[0].clone()
  const ang: number[] = []
  let total = 0
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i].angleTo(verts[i + 1])
    ang.push(a)
    total += a
  }
  if (total < 1e-9) return verts[0].clone()
  const target = Math.min(1, Math.max(0, tt)) * total
  let acc = 0
  for (let i = 0; i < ang.length; i++) {
    if (acc + ang[i] >= target || i === ang.length - 1) {
      const local = ang[i] < 1e-9 ? 0 : (target - acc) / ang[i]
      return slerpUnit(verts[i], verts[i + 1], local)
    }
    acc += ang[i]
  }
  return verts[verts.length - 1].clone()
}
```

- [ ] **Step 4: Run → pass.** `npx vitest run src/lib/geo.test.ts` — PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat(routes): sampleArcByLength — arc-length point on a polyline"
```

---

## Task 3: Camera follows the leg polyline (`journeyCamera`)

**Files:**
- Modify: `src/lib/journeyCamera.ts`
- Test: `src/lib/journeyCamera.test.ts`

- [ ] **Step 1: Write the failing tests.** Add to `src/lib/journeyCamera.test.ts`:
```ts
import { cameraAt } from './journeyCamera'
// helper: a 2-stop journey where stop 1 has a `via` that bends north
const stopsViaNorth = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 60, via: [{ lat: 40, lng: 30 }] }, // bend up to 40°N mid-leg
] as Parameters<typeof cameraAt>[1]
const stopsStraight = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 60 },
] as Parameters<typeof cameraAt>[1]

describe('cameraAt with via', () => {
  it('passes near the via point mid-travel, not the straight midpoint', () => {
    // mid-travel t: DWELL=0.4, so travel spans local 0.4..1 of segment 0 (seg width 1/2).
    // Pick t so local ≈ 0.7 → tt ≈ ease(0.5) = 0.5 (mid-leg by arc).
    const t = (0 + 0.7) / 2 // seg 0, local 0.7
    const cam = cameraAt(t, stopsViaNorth)
    expect(cam.lat).toBeGreaterThan(20) // way north of the 0°-lat straight line
    expect(cam.activeStop).toBeNull()
  })

  it('with no via, travel is unchanged (regression)', () => {
    const t = (0 + 0.7) / 2
    const cam = cameraAt(t, stopsStraight)
    expect(cam.lat).toBeCloseTo(0, 1) // stays on the equator
  })

  it('dwell is unchanged with or without via', () => {
    const cam = cameraAt(0.1, stopsViaNorth) // local 0.2 < DWELL → dwell at stop 0
    expect(cam).toMatchObject({ lat: 0, lng: 0, activeStop: 0 })
  })
})
```

- [ ] **Step 2: Run → fail.** `npx vitest run src/lib/journeyCamera.test.ts` — FAIL (via ignored; lat≈0).

- [ ] **Step 3: Implement.** In `src/lib/journeyCamera.ts`:
  - Add to the import from `./geo`: `sampleArcByLength`.
  - Widen the stops type **everywhere `cameraAt`/`stopsForCamera` declare it** to include `via?`. The current type is `Array<LatLng & { camera?: { altitude: number } }>`. Make it:
    `Array<LatLng & { camera?: { altitude: number }; via?: LatLng[] }>`.
    (Update the `cameraAt` signature param type and the `stopsForCamera` return/`stopsCache` types.)
  - In `stopsForCamera`, carry `via` through:
    ```ts
    stops = journey.stops.map((s) => ({ ...s.coords, camera: s.camera, via: s.via }))
    ```
  - Replace **only** the travel branch's slerp (the `const next = …; const tt = …; const p = slerpUnit(…)` block, ~lines 72-78) with:
    ```ts
    const next = stops[seg + 1]
    const tt = ease((local - DWELL) / (1 - DWELL))
    const verts = [
      latLngToVector3(stop.lat, stop.lng).normalize(),
      ...(next.via ?? []).map((w) => latLngToVector3(w.lat, w.lng).normalize()),
      latLngToVector3(next.lat, next.lng).normalize(),
    ]
    const p = sampleArcByLength(verts, tt)
    ```
    Leave the altitude lines (`nextAlt`, `base`, `altitude`) and the final `vecToLatLng(p)` return exactly as they are — altitude still arcs once across the whole leg.

- [ ] **Step 4: Run → pass.** `npx vitest run src/lib/journeyCamera.test.ts` — PASS (incl. the existing tests).

- [ ] **Step 5: Full check.** `npm run build` clean; `npm test` all pass.

- [ ] **Step 6: Commit.**
```bash
git add src/lib/journeyCamera.ts src/lib/journeyCamera.test.ts
git commit -m "feat(routes): camera travel follows the leg polyline by arc length"
```

---

## Task 4: Route line through `via` + synced fill (`RouteArcs`)

**Files:**
- Modify: `src/scene/RouteArcs.tsx`

- [ ] **Step 1: Rewrite `useRouteGeometry`** to build legs through `via`, with proportional subdivision, returning `{ points, legStarts }` (`legStarts[i]` = the points-array index of stop `i`). Add a `routeSegs` helper. Replace the current function:
```ts
/** Segments for a sub-hop ∝ great-circle angle (~125 km/segment), clamped [2,96] —
 *  even dot density and point-index ≈ arc length within a leg (keeps the fill synced). */
function routeSegs(a: LatLng, b: LatLng): number {
  const ang = latLngToVector3(a.lat, a.lng).normalize()
    .angleTo(latLngToVector3(b.lat, b.lng).normalize())
  return Math.max(2, Math.min(96, Math.round(ang / 0.02)))
}

/** Route polyline through each leg's [prev, ...via, this] waypoints, plus the
 *  points-array index of each stop (for the progressive fill). */
function useRouteGeometry(journey: Journey): { points: THREE.Vector3[]; legStarts: number[] } {
  return useMemo(() => {
    const points: THREE.Vector3[] = []
    const legStarts: number[] = [] // points index of each stop (length = stops.length)
    legStarts.push(0)
    for (let i = 0; i < journey.stops.length - 1; i++) {
      const wpts = [
        journey.stops[i].coords,
        ...(journey.stops[i + 1].via ?? []),
        journey.stops[i + 1].coords,
      ]
      for (let h = 0; h < wpts.length - 1; h++) {
        const sub = greatCirclePoints(wpts[h], wpts[h + 1], routeSegs(wpts[h], wpts[h + 1]))
        points.push(...(points.length ? sub.slice(1) : sub)) // dedupe shared endpoint
      }
      legStarts.push(points.length - 1) // stop i+1 is now the last point
    }
    return { points, legStarts }
  }, [journey])
}
```
(`LatLng` type is already imported; if not, add `import type { LatLng } from '../data/schema'`.)

- [ ] **Step 2: Update `RouteArcs`** (the consumer): change `const pts = useRouteGeometry(journey)` → `const { points: pts } = useRouteGeometry(journey)`. The rest (`points={pts}`, markers) is unchanged.

- [ ] **Step 3: Update `RouteArcsProgress`** — destructure both, and replace the fill calc:
  - `const pts = useRouteGeometry(journey)` → `const { points: pts, legStarts } = useRouteGeometry(journey)`. (Update the `<Line points={pts}>` if the var name changed; keep `points={pts}`.)
  - Replace the `segsPerHop`/`drawn` block inside `useFrame` (currently `const segsPerHop = totalSegments / (stops.length - 1); const drawn = Math.round(routeProgressAt(safeT, stops.length) * segsPerHop)`) with:
    ```ts
    const hops = routeProgressAt(safeT, stops.length) // seg + travel-fraction
    const seg = Math.min(legStarts.length - 2, Math.floor(hops))
    const frac = hops - seg
    const drawn = Math.round(legStarts[seg] + frac * (legStarts[seg + 1] - legStarts[seg]))
    lineRef.current.geometry.instanceCount = Math.max(0, drawn)
    ```
  - Delete the now-unused `const totalSegments = pts.length - 1` line if present.

- [ ] **Step 4: Verify.** `npm run build` clean; `npm test` all pass. With no `via` in the data yet, the route is **visually unchanged** (a dashed great-circle) — but NOT byte-for-byte: the new `routeSegs` is proportional to leg length, so each straight leg now has its own segment count instead of a flat 48. That's fine and expected. Sanity-check in the report: `legStarts` is monotonically increasing, `legStarts[0] === 0`, and `legStarts[legStarts.length-1] === points.length - 1`; and `drawn` interpolates strictly within `[legStarts[seg], legStarts[seg+1]]`. (Do NOT expect `legStarts[i] === i*48` — proportional subdivision means legs differ in length.)

- [ ] **Step 5: Commit.**
```bash
git add src/scene/RouteArcs.tsx
git commit -m "feat(routes): build route line through via waypoints; per-leg synced fill"
```

---

## Task 5: Researched `via` data (Panama crossings + verified sea legs)

**Files:**
- Modify: `src/journeys/grant/stops1.ts`

This task adds real waypoints. Coordinates below are starting points — verify against the chapter text before committing; the great-circle sub-arcs between ports handle the ocean curvature, so you mainly need the key ports.

- [ ] **Step 1: Read the source.** Fetch Grant's memoirs and read the Pacific-coast chapters (the leg Ch.14 Sackets Harbor → Ch.15 Fort Vancouver, and the return Ch.15 → Ch.16 Galena):
```bash
curl -s -o /tmp/grant.txt "https://www.gutenberg.org/cache/epub/4367/pg4367.txt"
grep -n "Panama\|Aspinwall\|Isthmus\|Pacific\|Vancouver\|San Francisco\|steamer" /tmp/grant.txt | head -40
```
Confirm the route (NY → steamer to the Caribbean side of the Isthmus → across to the Pacific → up the coast to the Columbia → Fort Vancouver), and that the 1854 return was likewise via Panama.

- [ ] **Step 2: Add `via` to Ch.15 (Fort Vancouver)** in `stops1.ts` (outbound, 1852). On the Ch.15 stop object add:
```ts
    via: [
      { lat: 32.30, lng: -64.78 },  // Atlantic steamer lane (off Bermuda) — smooth arc south
      { lat: 9.36,  lng: -79.90 },  // Aspinwall / Colón — Caribbean side of the Isthmus
      { lat: 8.95,  lng: -79.53 },  // Panama City — Pacific side (the Isthmus crossing)
      { lat: 15.00, lng: -95.00 },  // Pacific steamer lane up the coast
      { lat: 37.77, lng: -122.42 }, // San Francisco
      { lat: 46.25, lng: -124.08 }, // mouth of the Columbia River
    ],
```

- [ ] **Step 3: Add `via` to Ch.16 (Galena)** (return, 1854) — the reverse via Panama, then overland from NY:
```ts
    via: [
      { lat: 37.77, lng: -122.42 }, // San Francisco (embark)
      { lat: 15.00, lng: -95.00 },  // Pacific lane south
      { lat: 8.95,  lng: -79.53 },  // Panama City
      { lat: 9.36,  lng: -79.90 },  // Aspinwall / Colón
      { lat: 32.30, lng: -64.78 },  // Atlantic lane north
      { lat: 40.71, lng: -74.01 },  // New York (then overland to Galena)
    ],
```

- [ ] **Step 4: Verify the Mexican-War sea legs.** Check whether Ch.4 (Corpus Christi — army sailed from New Orleans down the Gulf) and the Veracruz landing legs are clearly sea voyages in the text. ACCEPTANCE CHECK: add `via` **only** to legs whose chapter describes a sea/water detour; do not fabricate. If confirmed, e.g. Ch.4 `via: [{ lat: 29.95, lng: -90.07 } /* New Orleans */, { lat: 27.80, lng: -97.39 } /* Gulf approach to Corpus Christi */]`. If unclear, skip and note it.

- [ ] **Step 5: Verify build/tests + integrity.** `npm run build` clean; `npm test` all pass (the schema validates the new `via` arrays). Dump the new route to sanity-check the waypoints are in sensible places (no point on the wrong continent):
```bash
echo "import {journeys} from '$(pwd)/src/journeys/index.ts';const g=journeys.find(j=>j.id==='grant');g.stops.forEach((s,i)=>{if(s.via)console.log(i,s.name,'via',s.via.map(w=>w.lat.toFixed(1)+','+w.lng.toFixed(1)).join(' | '))})" > /tmp/via.mjs
npx vite-node /tmp/via.mjs
```

- [ ] **Step 6: Commit.**
```bash
git add src/journeys/grant/stops1.ts
git commit -m "feat(routes): real waypoints for the 1852/1854 Panama crossings (+ verified sea legs)"
```

---

## Task 6: Final verification

- [ ] **Step 1: Full gate.** `npm run build` clean; `npm test` all pass.
- [ ] **Step 2: Render-check the line (no WebGL needed).** Reuse the tile-plot method: render the world relief + plot the Ch.14→15 route polyline (`useRouteGeometry` output, or recompute `[prev, ...via, this]` great-circles) to confirm it sweeps NY → Panama → San Francisco → Columbia, not a straight diagonal. Save a PNG and view it.
- [ ] **Step 3: Hand back to the user** for the live check (step through Ch.14 → Ch.15 on the globe: camera should sweep down to Panama, across the Isthmus, up to Fort Vancouver, with the bright tip tracking it) and the push/deploy decision. Deploy dance: `gh auth switch -u bashd4` → push → `vercel deploy --prod --yes` → `gh auth switch -u bashd-ClaimKit`.

---

## Notes for the implementer
- **Don't mask tsc:** gate on `npm run build` (runs `tsc -b`), never `npx tsc --noEmit | head`.
- **No-`via` must be VISUALLY unchanged** — the Task 4 refactor and Task 3 camera change must not alter how straight legs look or where the camera/fill sit (the regression tests guard the camera/fill). Not byte-for-byte: `routeSegs` changes the per-leg point counts vs the old flat 48, which is expected and harmless (no test asserts exact counts).
- **Sync invariant:** the fill tracks the camera only because subdivision is proportional (`routeSegs`). Don't lower `MAX` (96) — it bounds tip drift on very uneven legs.
- **Waypoints are data, not guesses:** Task 5 must rest on the chapter text for which legs deviate; the ocean curvature comes free from the great-circle sub-arcs between ports.
