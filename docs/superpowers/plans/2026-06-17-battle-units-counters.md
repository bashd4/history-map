# Battle Units (NATO Counters) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace battle movement arrows with persistent NATO APP-6 unit counters that slide along per-unit tracks over a battle's phases.

**Architecture:** Add `branch`/`echelon`/`strength` to the movement schema and a `protagonistSide` to each journey; derive per-unit "tracks" (rest/move segments) from the battle's movements; render one billboarded SVG counter per unit, draped on terrain with the existing geodetic placement, replacing `BattleArrows`. Pure logic (schema, affiliation, tracks, symbol mapping) is TDD-tested; the R3F component is assembled from those tested helpers and verified visually.

**Tech Stack:** TypeScript, Zod, React Three Fiber, @react-three/drei (`<Html>`), Vitest. Reuses `geodeticToVector3`/`vector3ToGeodetic` (`src/lib/geo.ts`), `terrainSampler` (`src/scene/useTerrainHeights.ts`), `playbackAt` (`src/lib/battlePlayback.ts`).

**Spec:** `docs/superpowers/specs/2026-06-17-battle-units-counters-design.md`

**Note on commits:** the user has asked that commits/pushes happen only on request. Keep each task's work green and self-contained as written, but confirm before running the `git commit` steps.

---

## File Structure

- `src/data/schema.ts` (modify) — add `branch`, `echelon`, `strength` to `movement`; add `protagonistSide` to `journeySchema` + cross-check superRefine.
- `src/lib/affiliation.ts` (create) — `affiliationOf(journey, sideKey)` → `'friendly' | 'hostile'`.
- `src/lib/affiliation.test.ts` (create).
- `src/lib/battleUnitTracks.ts` (create) — `battleUnitTracks(battle)` + `unitPositionAt(track, battle, elapsed)`.
- `src/lib/battleUnitTracks.test.ts` (create).
- `src/lib/unitSymbol.ts` (create) — pure mappers: `branchGlyph`, `echelonTicks`.
- `src/lib/unitSymbol.test.ts` (create).
- `src/scene/UnitCounter.tsx` (create) — one billboarded SVG counter, geodetic-draped, position from track per frame.
- `src/scene/BattleUnits.tsx` (create) — builds tracks, renders a `UnitCounter` per unit. Replaces `BattleArrows`.
- `src/scene/BattleArrows.tsx` (delete) — replaced.
- `src/scene/GlobeScene.tsx` (modify) — swap `<BattleArrows>` → `<BattleUnits>`.
- `src/journeys/grant/battles.ts`, `src/journeys/napoleon.ts` (modify) — backfill `branch`/`echelon`/`strength`; add `protagonistSide`; reconcile gaps.
- `src/journeys/grant/index.ts` / `src/journeys/napoleon.ts` (modify) — add `protagonistSide` to the journey object.
- `src/journeys/battleIntegrity.test.ts` (modify) — add large-gap guard.

---

## Task 1: Schema — affiliation primitives (no data break)

Add the new fields as **optional** first so existing data keeps validating; they become required in Task 2 after backfill. Add `protagonistSide` (required) to journeys and the `affiliationOf` helper.

**Files:**
- Modify: `src/data/schema.ts:5-10` (movement), `src/data/schema.ts:79-87` (journeySchema)
- Create: `src/lib/affiliation.ts`, `src/lib/affiliation.test.ts`
- Modify: `src/data/schema.test.ts`
- Modify: `src/journeys/grant/index.ts`, `src/journeys/napoleon.ts` (add `protagonistSide`)

- [ ] **Step 1: Write failing affiliation test**

`src/lib/affiliation.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { affiliationOf } from './affiliation'

describe('affiliationOf', () => {
  const journey = { protagonistSide: 'union' } as any
  it('protagonist side is friendly', () => {
    expect(affiliationOf(journey, 'union')).toBe('friendly')
  })
  it('any other side is hostile', () => {
    expect(affiliationOf(journey, 'confederate')).toBe('hostile')
    expect(affiliationOf(journey, 'coalition')).toBe('hostile')
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** — `npx vitest run src/lib/affiliation.test.ts` → fails (module not found).

- [ ] **Step 3: Implement `src/lib/affiliation.ts`**
```ts
import type { Journey } from '../data/schema'

export type Affiliation = 'friendly' | 'hostile'

/** Frame shape source of truth: the journey's protagonist side renders as the
 *  friendly rectangle; every other side is the hostile diamond. */
export function affiliationOf(journey: Pick<Journey, 'protagonistSide'>, sideKey: string): Affiliation {
  return sideKey === journey.protagonistSide ? 'friendly' : 'hostile'
}
```

- [ ] **Step 4: Add schema fields.** In `src/data/schema.ts` `movement` add (keep optional for now):
```ts
  branch: z.enum(['infantry', 'cavalry', 'artillery', 'naval', 'command']).optional(),
  echelon: z.enum(['corps', 'division', 'brigade', 'regiment', 'flotilla']).optional(),
  strength: z.number().int().positive().optional(),
```
In `journeySchema` add `protagonistSide: z.string().min(1),` and a superRefine on the journey that every battle's `sides` contains `protagonistSide`:
```ts
export const journeySchema = z.object({ /* …existing… */ protagonistSide: z.string().min(1) })
  .superRefine((j, ctx) => {
    for (const [i, s] of j.stops.entries()) {
      if (s.battle && !(j.protagonistSide in s.battle.sides)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom,
          message: `protagonistSide "${j.protagonistSide}" missing from sides of battle "${s.battle.name}"`,
          path: ['stops', i, 'battle', 'sides'] })
      }
    }
  })
```

- [ ] **Step 5: Add `protagonistSide` to both journeys.** `src/journeys/grant/index.ts` → `protagonistSide: 'union'`. `src/journeys/napoleon.ts` → `protagonistSide: 'french'`. (Confirm those exact keys exist in every battle's `sides`.)

- [ ] **Step 6: Schema test** — add to `src/data/schema.test.ts` a case asserting a journey missing `protagonistSide` fails, and one where `protagonistSide` not in a battle's sides fails.

- [ ] **Step 7: Run full suite** — `npx tsc --noEmit && npx vitest run` → all green (new fields optional; journeys now carry protagonistSide).

- [ ] **Step 8: Commit** (confirm first): `feat(schema): add unit branch/echelon/strength + journey protagonistSide + affiliationOf`

---

## Task 2: Data backfill + tighten schema + gap guard

Backfill `branch`/`echelon` (and `strength` where solid) for every movement, reconcile authoring gaps, then make `branch`/`echelon` required and add the integrity large-gap guard.

**Files:**
- Modify: `src/journeys/grant/battles.ts`, `src/journeys/napoleon.ts`
- Modify: `src/data/schema.ts` (branch/echelon → required)
- Modify: `src/journeys/battleIntegrity.test.ts`

**Branch/echelon assignment rules** (apply per unit from its name + military history):
- `branch`: foot infantry divisions/corps → `infantry`; cavalry (e.g. Forrest) → `cavalry`; batteries/"guns" → `artillery`; gunboat/flotilla (Foote, Porter) → `naval`; army/HQ/command markers → `command`.
- `echelon`: "Corps"/"Army of …" → `corps`; "Division" → `division`; "Brigade" → `brigade`; named regiment → `regiment`; naval flotilla → `flotilla`.
- `strength`: add an integer ONLY where confidently known from the orders of battle (e.g. Fort Donelson McClernand ≈ division strength). Omit otherwise — do NOT invent.

- [ ] **Step 1: Write the gap-guard test FIRST** in `src/journeys/battleIntegrity.test.ts` (it will fail on un-reconciled data, surfacing the gaps to fix):
```ts
import { geodeticToVector3 } from '../lib/geo'
// ground distance (km) between two LatLng via the geodetic unit sphere
function gapKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
  return geodeticToVector3(a.lat,a.lng).angleTo(geodeticToVector3(b.lat,b.lng)) * 6371
}
it('a unit never teleports between its consecutive movements (>1km)', () => {
  const offenders: string[] = []
  for (const { journey, stop, battle } of allBattles()) {
    const byUnit = new Map<string, {lat:number;lng:number}[][]>()
    battle.phases.forEach((ph) => ph.movements.forEach((m) => {
      if (!m.unit) return
      if (!byUnit.has(m.unit)) byUnit.set(m.unit, [])
      byUnit.get(m.unit)!.push(m.path)
    }))
    for (const [unit, paths] of byUnit) {
      for (let i = 1; i < paths.length; i++) {
        const prevEnd = paths[i-1].at(-1)!, nextStart = paths[i][0]
        const d = gapKm(prevEnd, nextStart)
        if (d > 1) offenders.push(`${journey}/${stop} · "${unit}" gap ${d.toFixed(2)}km`)
      }
    }
  }
  expect(offenders, `unit teleports:\n${offenders.join('\n')}`).toEqual([])
})
```

- [ ] **Step 2: Run it** — `npx vitest run src/journeys/battleIntegrity.test.ts` → FAILS, listing every unit gap >1km (e.g. Foote re-staging, C.F. Smith re-entry).

- [ ] **Step 3: Reconcile gaps.** For each offender, edit the later movement's first node (or the earlier's last node) so the unit's path is continuous, preserving the audited interior nodes. Re-run until the gap test passes.

- [ ] **Step 4: Backfill branch/echelon/strength** on every movement in both data files per the rules above. Tip: work battle-by-battle; after each, run `npx vitest run src/data/journeys.test.ts` to confirm the data still parses.

- [ ] **Step 5: Tighten schema** — in `src/data/schema.ts` make `branch` and `echelon` required (drop `.optional()`).

- [ ] **Step 6: Run full suite** — `npx tsc --noEmit && npx vitest run` → all green (every movement now has branch/echelon; no gaps >1km).

- [ ] **Step 7: Commit** (confirm first): `feat(data): backfill unit branch/echelon/strength, reconcile unit-path continuity`

---

## Task 3: Per-unit tracks

**Files:**
- Create: `src/lib/battleUnitTracks.ts`, `src/lib/battleUnitTracks.test.ts`

- [ ] **Step 1: Write failing tests** covering: (a) one unit moving in phases 1 & 3 yields move(1), rest(2 at p1 end), move(3) with path prepended by the rest position if it differs; (b) a unit first appearing in phase 2 has no segment for phase 1; (c) `unitPositionAt` returns p1's end during the rest phase and interpolates mid-move. Use a small hand-built `Battle` fixture.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** `battleUnitTracks(battle)`:
  - Collect movements per `unit` with their `phaseIndex`, in phase order.
  - For phases from the unit's first movement to `battle.phases.length-1`: emit `move` (if it has a movement that phase) or `rest` at the last endpoint.
  - Gap-bridge: when building a `move` whose `path[0]` ≠ current resting position, prepend the resting position to the path.
  - Carry `side`, `branch`, `echelon`, `strength` onto the track. These should be constant across a unit's movements; take them from the unit's first movement AND assert the rest agree (throw a clear error if a hand-edit left, say, two different `branch` values for one unit — the type system won't catch that). Add a track test for this assertion.
  - WeakMap-cache per `Battle`.
  - `unitPositionAt(track, battle, elapsed)`: use `playbackAt(battle, elapsed)` → `{phaseIndex, phaseProgress, done}`; find the track segment for that phase; if `move`, interpolate along its `path` by `phaseProgress` (great-circle via `slerpUnit` on geodetic vectors, then back to LatLng with `vector3ToGeodetic` — mirror `BattleArrows.movementLatLngs`); if `rest`, return the rest LatLng. Before first appearance → return `null`.

- [ ] **Step 4: Run, expect PASS.**

- [ ] **Step 5: Commit** (confirm first): `feat(lib): battleUnitTracks — persistent per-unit rest/move tracks`

---

## Task 4: Symbol mappers (pure)

**Files:**
- Create: `src/lib/unitSymbol.ts`, `src/lib/unitSymbol.test.ts`

- [ ] **Step 1: Write failing tests** — `echelonTicks('corps') === 'XXX'`, `'division' === 'XX'`, `'brigade' === 'X'`, `'regiment' === 'III'`, `'flotilla' === '≈'`; `branchGlyph('infantry') === 'infantry'` (returns a discriminant the SVG renderer switches on) for each branch.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement** `src/lib/unitSymbol.ts`:
```ts
import type { Movement } from '../data/schema'
type Branch = NonNullable<Movement['branch']>
type Echelon = NonNullable<Movement['echelon']>
export function echelonTicks(e: Echelon): string {
  return { corps:'XXX', division:'XX', brigade:'X', regiment:'III', flotilla:'≈' }[e]
}
export function branchGlyph(b: Branch): Branch { return b } // discriminant for the SVG switch
```

- [ ] **Step 4: Run, expect PASS. Step 5: Commit** (confirm first): `feat(lib): unit symbol mappers`

---

## Task 5: Counter rendering + wiring (replace BattleArrows)

**Files:**
- Create: `src/scene/UnitCounter.tsx`, `src/scene/BattleUnits.tsx`
- Modify: `src/scene/GlobeScene.tsx:13-14,174` (swap import + element)
- Delete: `src/scene/BattleArrows.tsx`

- [ ] **Step 1: `UnitCounter.tsx`** — props `{ track, battle, journey }`. Per frame (`useFrame`, guard `mode === 'battle'`): compute `LatLng` via `unitPositionAt`; if `null`, hide. Drape: `r = terrainSampler.sampleRadius(lat,lng) + CLEARANCE`; `pos = geodeticToVector3(lat,lng,r)`; copy to a `<group>` ref. Render a drei `<Html>` (constant screen size, `pointerEvents:'none'`) containing an inline SVG counter:
  - Frame: `affiliationOf(journey, track.side) === 'friendly'` → `<rect>` else `<polygon>` diamond; stroke = `battle.sides[track.side]`.
  - Branch glyph inside via `switch(track.branch)`: infantry = two diagonals, cavalry = one diagonal, artillery = filled `<circle>`, naval = `<text>⚓</text>`, command = small staff/flag.
  - Echelon ticks (`echelonTicks`) above; `track.unit` name below; `track.strength?.toLocaleString()` below the name when present.
  - Static unit (all segments `rest`, or `style:'feint'`): subtle opacity pulse while its phase is current (optional; ok to defer).
  - Style/legibility: reuse the dark-shadow/serif treatment from `BattleArrows`' label `divRef` styles, and copy the `SURFACE_CLEARANCE = 0.000008` constant. **Copy these values/styles into `UnitCounter.tsx` now — `BattleArrows.tsx` is deleted in Step 3 of this same task, so the reference disappears.**

- [ ] **Step 2: `BattleUnits.tsx`** — `{ battle, journey }`. `const tracks = useMemo(() => battleUnitTracks(battle), [battle])`. Pre-register every track position with `terrainSampler.registerPoints('units', …)` (gather all path nodes + rest points). Render `tracks.map(t => <UnitCounter key={t.unit} track={t} battle={battle} journey={journey} />)`. Rebuild on `useTerrainHeightsVersion()`.

- [ ] **Step 3: Wire into `GlobeScene.tsx`** — replace `import { BattleArrows }` with `BattleUnits`; replace `{activeBattle && <BattleArrows battle={activeBattle} />}` with `{activeBattle && <BattleUnits battle={activeBattle} journey={journey!} />}` (the component already has `journey` in scope at that point — verify; if not, derive via `journeyById(journeyId)`). Delete `BattleArrows.tsx`.

- [ ] **Step 4: Typecheck + build + existing tests** — `npx tsc --noEmit && npx vitest run && npm run build` → green; confirm no dangling `BattleArrows` imports.

- [ ] **Step 5: Commit** (confirm first): `feat(scene): NATO unit counters replace movement arrows`

---

## Task 6: Visual verification + deploy

- [ ] **Step 1:** `npm run dev` (or deploy to a Vercel preview, since localhost can't stream tiles under the referrer-locked key). Open Fort Donelson; confirm: Union units are rectangles, Confederate diamonds; branch glyphs correct; counters slide phase-to-phase as persistent tokens; Foote advances then drifts back as ONE token; no arrows remain; `?gt` pins still align.
- [ ] **Step 2:** Spot-check Austerlitz (french rectangles / coalition diamonds) and one more battle.
- [ ] **Step 3:** Final `npx tsc --noEmit && npx vitest run && npm run build`.
- [ ] **Step 4:** Deploy to production (`vercel --prod`) and confirm live (per the project's deploy flow).

---

## Definition of done
- Counters fully replace arrows; persistent per-unit tokens slide across phases with no teleports.
- APP-6 frames (protagonist rectangle / opponent diamond), branch glyphs, echelon ticks, name, strength-where-solid.
- All pure logic TDD-tested; integrity gap-guard green; 122 prior tests still pass; tsc + build clean.
- Verified visually at Fort Donelson + Austerlitz; deployed.
