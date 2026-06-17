# Battle Units (NATO Counters) — Design Spec

**Date:** 2026-06-17
**Status:** Approved (pending spec review)
**Supersedes:** the movement-arrow battle visualization (`BattleArrows`)

## Goal

Replace the abstract movement **arrows** in battle mode with persistent **wargame-style unit counters** that slide along their paths over a battle's phases — "pieces on a board." Counters use NATO APP-6 military symbology and are draped on the real streamed terrain.

## Motivation

Arrows are *claims about a whole movement*; when two overlap or reverse they read as ambiguous (the "two Foote flotillas" bug was a symptom). A discrete counter reads as an **object** with a position — "that's McClernand, and he's *here* now" — which is far harder to misread and gives the battle a tabletop-wargame feel.

## Decisions (locked during brainstorming)

1. **Aesthetic:** NATO APP-6 symbology, **textbook affiliation frames** — friendly = rectangle, hostile = diamond. The **protagonist's army is "friendly"** (rectangle); the opponent is the diamond. Affiliation is keyed off the side key: protagonist side key → rectangle, all others → diamond. Grant journey protagonist = `union` (opponent `confederate` → diamond); Napoleon protagonist = `french` (opponent side key is **`coalition`** → diamond; note the unit labels read "Allied" but the `battle.sides` key is `coalition`).
2. **Movement model:** **Persistent unit tokens.** One counter per unit for the whole battle. It rests in place and slides only during phases where that unit has a movement.
3. **Strength data:** branch + echelon on every counter; **numeric strength shown only where confidently sourced**, omitted (no number) otherwise. No fabricated figures.
4. **Arrows:** fully **replaced** by counters in v1. No arrows, no movement trails. (A faint optional trail could be a later toggle; out of scope for v1.)
5. **Continuity:** "consecutive movements" = movements N and N+1 in a unit's **phase-ordered movement list** (skipping the rest phases in between), not adjacent phase indices. Clear authoring artifacts are reconciled during backfill so a unit's next movement starts where its previous one ended; the track model bridges any remaining intentional gap with a brief **reposition glide** at the start of the next movement's phase (no audited coordinate is distorted to force a connection). An extended integrity test flags only *large* gaps (above a distance threshold) as likely data errors.

## Symbology

- **Affiliation frame:** rectangle (friendly/protagonist) vs diamond (hostile/opponent), bordered in the side color (e.g. Union blue `#2f4a6b`, Confederate red `#a13b2b`).
- **Branch glyph** inside the frame: `infantry` = ✕ (two diagonals) · `cavalry` = ╱ (single diagonal) · `artillery` = ● (filled dot) · `naval` = ⚓ · `command` = HQ staff (small flag/▮).
- **Echelon ticks** above the frame: `corps` = XXX · `division` = XX · `brigade` = X · `regiment` = III · `flotilla` = ≈.
- **Name** below the frame; **strength** below the name when present.
- Constant screen size, billboarded (always faces camera, upright — no rotation), drawn over terrain with a dark text shadow for legibility.

## Architecture

### 1. Schema (`src/data/schema.ts`)

Extend `movement` with:

- `branch: 'infantry' | 'cavalry' | 'artillery' | 'naval' | 'command'` (required)
- `echelon: 'corps' | 'division' | 'brigade' | 'regiment' | 'flotilla'` (required)
- `strength?: number` (optional, positive integer)

Existing fields unchanged: `side` (string, validated ∈ battle `sides`), `style` (`advance|retreat|feint`), `unit?` (now effectively required for counters — see Open Item O1), `path` (LatLng[] ≥ 2).

`superRefine` additions: none beyond field validation (branch/echelon are enums; strength positive). Affiliation is derived at render time, not stored.

**New `Journey` field** (`src/data/schema.ts`): `protagonistSide: string` — the side key whose units render as the friendly rectangle (`union` for Grant, `french` for Napoleon). Validated as non-empty. A new helper `affiliationOf(journey, sideKey): 'friendly' | 'hostile'` returns `friendly` iff `sideKey === journey.protagonistSide`. This is the single source of truth for frame shape; there is no per-battle override in v1 (Open Item O2).

### 2. Per-unit tracks (`src/lib/battleUnitTracks.ts`, new + tests)

Pure function:

```
battleUnitTracks(battle: Battle): UnitTrack[]
```

where

```
interface UnitTrack {
  unit: string
  side: string
  branch: Branch
  echelon: Echelon
  strength?: number
  segments: Array<
    | { kind: 'rest';  phaseIndex: number; at: LatLng }
    | { kind: 'move';  phaseIndex: number; path: LatLng[]; style: MovementStyle }
  >
}
```

- Group movements by `unit`; order by `phaseIndex`.
- For each phase from the unit's first appearance to the battle's end: if the unit has a movement that phase → `move` segment; else → `rest` at the unit's last known endpoint.
- The unit "exists" from the phase of its first movement onward (it does not appear before it first acts).
- **Gap bridging:** if a `move` segment's `path[0]` differs from the unit's current resting position (the previous segment's endpoint), the track prepends that resting position to the path, so the token glides from where it sat to the new start, then follows the movement — no teleport, no data distortion. (Large gaps are flagged separately by the integrity test as likely errors.)
- WeakMap-cached per `Battle` (like `battleExtent`).

A companion helper `unitPositionAt(track, battle, elapsed): LatLng` returns the interpolated lat/lng for the current `battleElapsed` (uses `playbackAt` for phase + progress; interpolates along the active segment's path, or returns the rest position).

### 3. Rendering (`src/scene/BattleUnits.tsx` + `UnitCounter`, replaces `BattleArrows.tsx`)

- `BattleUnits({ battle })` builds tracks once (memoized) and renders one `<UnitCounter>` per track.
- `UnitCounter` per frame: reads `battleElapsed` from the store, computes its `LatLng` via `unitPositionAt`, drapes it onto terrain using the **geodetic** placement (`geodeticToVector3` + `terrainSampler.sampleRadius`), and positions a billboarded `<Html>` counter there.
- The counter DOM is an SVG APP-6 symbol (frame by affiliation, branch glyph, echelon, name, strength) styled to match the app's sepia UI; constant screen size via the `<Html>` (DOM is screen-space by nature).
- Affiliation: `affiliationOf(journey, movement.side)` → `friendly` = rectangle, `hostile` = diamond (see Section 1). Confederate units (incl. defending river batteries) and the Napoleonic `coalition` are diamonds — intended.
- Static units (`style: 'feint'` or zero net displacement, e.g. river batteries) render as a stationary counter; subtle opacity pulse while their phase is current.
- Visibility: a unit before its first appearance renders nothing; once it appears it stays on the board through the end of the battle.
- Terrain registration: pre-register all track positions with `terrainSampler.registerPoints('units', …)` so heights stay cached; rebuild on `heightsVersion`.

### 4. Wiring (`src/scene/GlobeScene.tsx`)

- Replace `<BattleArrows battle={…}/>` with `<BattleUnits battle={…}/>`.
- `BattleAnnotations` (area outlines + event chips) is **unchanged**.
- The `?gt` ground-truth overlay and the battle camera are **unchanged**.

### 5. Integrity test extension (`src/journeys/battleIntegrity.test.ts`)

Add a check: for each unit, walk its **phase-ordered movement list**; for each adjacent pair (N, N+1 — skipping rest phases), measure the gap between movement N's last LatLng and movement N+1's first LatLng. Flag only gaps **larger than a threshold** (e.g. ~1 km, a likely authoring error / true teleport) — small repositions are bridged by the track model and are fine. This guards against map-spanning jumps while tolerating intentional re-staging. (The existing "no unit twice in one phase" check stays.)

### 6. Data backfill (`src/journeys/grant/battles.ts`, `src/journeys/napoleon.ts`)

For every movement across all 5 battles (Fort Donelson, Shiloh, Vicksburg, Chattanooga, Austerlitz):

- Assign `branch` and `echelon` from the unit (these are determinable from the existing unit names + military history).
- Add `strength` where it is confidently known from the orders of battle; omit otherwise.
- Reconcile clear authoring artifacts where a unit's next movement starts noticeably off its previous endpoint (e.g. Foote's post-split staging, C.F. Smith's re-entry) so tokens glide; leave genuine repositions to the track model's bridge. Goal: no gap trips the integrity threshold.

This is a data pass, not a research audit — branch/echelon are known, strength only where solid.

## Data flow

`battleElapsed` (store) → `UnitCounter` per frame → `playbackAt(battle, elapsed)` (phase + progress) → `unitPositionAt(track, …)` (LatLng) → `geodeticToVector3` + terrain drape → billboarded `<Html>` APP-6 counter.

## Testing

- `battleUnitTracks.test.ts`: grouping by unit, phase ordering, rest-vs-move segments, first-appearance gating, interpolation at sampled elapsed times, cache identity.
- `schema.test.ts`: branch/echelon enums required; strength positive; existing battle data validates with the new required fields.
- `battleIntegrity.test.ts`: existing "no unit twice per phase" + new "consecutive movements connect" guard.
- All existing tests (122) continue to pass.

## Scope / non-goals (YAGNI)

- **In:** counters replacing arrows, persistent tracks, APP-6 symbology, branch/echelon data, strength where solid, continuity guard.
- **Out (v1):** movement trails, counter facing/rotation, counter-size scaling by strength (constant size + echelon + number suffice), animated combat effects beyond a feint pulse, per-unit strength research for unsourced units, a UI toggle to switch back to arrows.

## Open items (to settle in planning, not blocking)

- **O1 — units without a `unit` name:** counters need a unit identity. Any movement lacking `unit` must be given one during backfill, or excluded. Decision: backfill names for all movements (every current movement already has a `unit`).
- **O2 — affiliation override:** default protagonist=friendly is derived; if any battle wants a manual flip, add an optional per-battle field then. Not needed for v1.
