# Battle Relief Basemap — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorming) → ready for plan
**Supersedes:** the current `topo` basemap (Esri World Terrain Base, single-zoom static texture)

---

## Problem

The battle "Topo" basemap is supposed to be a cleaner alternative to the noisy
satellite (Google Photorealistic 3D Tiles) view — a way to read the terrain that
decided each battle. It doesn't deliver that:

1. **It looks white / empty.** The source is *Esri World Terrain Base*, which is
   deliberately a pale underlay meant to sit *beneath* other data layers. On the
   low-relief fields (Shiloh, Donelson, Austerlitz) there is little to shade, so
   it reads as near-blank parchment.
2. **It fails entirely on some battles (e.g. Austerlitz).** World Terrain Base
   tops out around zoom 13 and thins out over Europe. Tightly-framed battles
   compute a zoom at/above that cap, the tiles 404, and the layer falls back to a
   pale hillshade or the bare placeholder.
3. **It blurs when you zoom in.** The layer fetches tiles once at a single zoom,
   stitches them into one static texture, and drapes it on the field. With the
   new free OrbitControls zoom, zooming in just *magnifies* that fixed texture —
   it can never get sharper.

The information a tactical map needs to convey — **high ground** (Pratzen
Heights, Missionary Ridge, Champion Hill), **water and crossings** (the rivers at
Donelson and Vicksburg are the entire point), and roughly **woods vs. open
ground** (Shiloh) — is not legible in the current layer.

## Goal

Replace the pale topo layer with an **antique-relief tactical basemap**: a clean,
sepia-toned shaded-relief map that reads instantly (high ground, water), works on
every battle including Austerlitz, stays sharp across the bounded free-zoom range,
and is dressed with period map furniture (compass rose + scale bar). No modern
town/road labels (anachronistic for 1805/1862 fields).

## Non-Goals / Deferred

- **Contour lines.** No clean *label-free* global contour tile source exists, and
  generating contours from a DEM client-side is its own project. Shaded relief
  already conveys high ground instantly, so contours are low marginal value.
  Explicitly deferred.
- **A full re-fetching slippy-tile engine.** We are not building dynamic
  per-frame LOD tile loading. Instead we fetch at a high-enough fixed resolution
  and clamp the max zoom-in so the static texture stays sharp across the allowed
  range (see Sharpness below). This is a deliberate scope boundary.
- **Touching the satellite (3D tiles) path.** Unchanged.

---

## Design

### Source: two composited Esri layers, no labels

Keep the existing draping mechanism (fetch XYZ tiles → stitch into a canvas →
`CanvasTexture` → flat lat/lng patch on the globe at radius 1.0001, flat mode on).
Change what is fetched and how it is composited:

- **Underlay — Esri World Terrain Base** (`World_Terrain_Base/MapServer`): pale
  water + vegetation tint, no labels. Provides the water bodies (rivers, shores)
  and a hint of vegetation.
- **Overlay — Esri World Hillshade** (`World_Hillshade/MapServer`): crisp shaded
  relief, global, sharp to ~zoom 16. Drawn on top with
  `globalCompositeOperation = 'multiply'` so slopes darken the underlay. This is
  the high-ground story and the reason Austerlitz/Europe now works (Hillshade has
  full global coverage where Terrain Base does not).

Hillshade is the dominant, always-present layer; Terrain Base is a best-effort
underlay for water/vegetation color.

### Mixed-zoom fetch so water survives zoom-in

The two sources have different max zooms. To keep relief crisp *and* keep water
present at all zoom levels:

- **Hillshade** is fetched at the chosen high zoom `zHi` (for sharp relief).
- **Terrain Base** is fetched at `min(zHi, Z_TERRAIN_MAX)` (≈13) and its tiles are
  drawn **stretched** to fill the same patch region. Water bodies are large, so a
  soft/upscaled underlay is visually fine; we never lose the blue.

Both are stitched into the same canvas region (one canvas, addressed by the
hillshade tile grid; the terrain-base underlay is scaled into it first, then
hillshade tiles multiply on top).

### Sepia duotone grade

After tiles are stitched into a **raw** canvas, produce a **display** canvas by
mapping each pixel's luminance through a parchment ramp:

```
dark  #3a2c1a   (deep sepia, low luminance)
light #e8dcc0   (parchment, high luminance)
```

`graded.rgb = lerp(DARK, LIGHT, luminance(raw.rgb))`, where
`luminance = 0.299 R + 0.587 G + 0.114 B` (normalized 0..1). This duotone is what
turns a gray USGS-style relief into an antique survey map that matches the sepia
globe. The `CanvasTexture` is backed by the **display** canvas.

Performance: the grade runs on a throttled pass (reuse the existing
≤4 updates/sec throttle) over the display canvas, regenerated from raw as tiles
arrive; a final grade runs on completion. The grade is a pure function of the raw
pixels (idempotent in the sense that it always reads `raw`, never re-grades an
already-graded pixel), so progressive updates don't compound.

### Sharpness / zoom clamp

- Pick `zHi` so that one texel maps to ≲ one screen pixel at the *closest* allowed
  camera distance (`BattleControls` `minDistance`). In practice this is roughly
  one zoom level finer than today's "~5 tiles across" target.
- **Concrete tile cap: ≤ 64 hillshade tiles** (an 8×8 patch = 2048×2048 canvas).
  If reaching screen-pixel parity at the desired `minDistance` would exceed 64
  tiles, stop raising `zHi` at the cap and instead raise `minDistance` (see next
  point) — the cap wins, sharpness-at-closest-zoom yields.
- **`minDistance` interplay (decision): replace, not stack.** Today
  `BattleControls` uses `minDistance = Math.max(0.001, frameAlt * 0.12)`. The new
  value becomes `Math.max(0.001, frameAlt * 0.12, sharpFloor)`, where `sharpFloor`
  is the closest distance at which `zHi`'s texels still meet screen-pixel parity
  given the cap. So the existing floor is preserved and the sharpness floor is
  folded into the same `Math.max` — never a separate clamp that could fight it.
  `BattleBasemap` exposes the chosen `zHi`/coverage (or a derived `sharpFloor`)
  so `BattleControls` can read it; the plan picks the exact wiring.

### Map furniture

**Camera-heading bridge (scene side).** A small R3F component
(`CameraHeadingBridge`) runs in the Canvas, reads the camera each frame, computes
(a) the screen-space direction of geographic **north** at the battle site and
(b) the current top-down **ground distance per screen pixel**, and publishes both
to the store — *throttled* (~10 Hz) and change-gated so it doesn't thrash React.
Only mounted in battle mode.

**Compass rose (`BattleCompass`, DOM overlay in `BattleOverlay`).** Small SVG in a
corner of the battle view.
- *Map view:* north is up; rose is static.
- *Field view:* rose rotates to the published north heading as the user orbits.

**Scale bar (`BattleScaleBar`, DOM overlay in `BattleOverlay`).** Shown in **Map
view only** (a single scale bar is meaningless across an oblique perspective
frame). Reads the published meters-per-pixel, snaps the bar to a "nice" round
ground distance (1/2/5 × 10ⁿ — e.g. 500 m, 1 km, 2 km), renders a bar of the
corresponding pixel width with a label, and updates live as the user zooms.

`meters-per-pixel` (top-down): visible ground half-height =
`dist · tan(fov/2)`; `metersPerPixel = (2 · dist · tan(fov/2) · R_EARTH) / viewportHeightPx`,
where `dist` is camera distance in globe radii and `R_EARTH = 6_371_000` m.

### UI / labeling

- Relabel the basemap toggle **"Topo" → "Relief"** to match what it now shows.
- Update the attribution line (shown when the relief basemap is active) to credit
  the sources, e.g. *"Relief © Esri — World Hillshade, World Terrain Base"*.
- **Decision: rename the store union member `'topo'` → `'relief'`** (clean
  replacement; clarity over churn-avoidance). This is the first task in the plan
  so everything downstream builds on the new id. All `'topo'` touchpoints to
  catch in one sweep:
  - `store.ts` — the `BattleBasemap` union, the `initial`/`enterBattle`/
    `exitBattle` defaults (`'satellite'`), and the doc comments mentioning `'topo'`.
  - `store.test.ts` — any `setBattleBasemap('topo')` references.
  - `GlobeScene.tsx` — the `topoActive` variable and both `battleBasemap === 'topo'`
    comparisons, plus the mount comment.
  - `BattleBasemap.tsx` — the header mount comment.
  - `BattleOverlay.tsx` — the `BASEMAPS` array id, the `'Topo'`→`'Relief'` label,
    and the `battleBasemap === 'topo'` attribution guard (rename `.topo-attribution`
    class too).

---

## Architecture / file structure

| File | Responsibility | Change |
|---|---|---|
| `src/scene/BattleBasemap.tsx` | Fetch + composite + grade + drape | **Rework**: two-source composite, mixed-zoom fetch, sepia duotone, higher-res fetch + tile cap |
| `src/lib/basemapTiles.ts` *(new)* | Pure tile/zoom/composite math extracted for testing | **New**: `pickHillshadeZoom`, terrain-base zoom clamp, duotone ramp, coverage helpers moved here |
| `src/lib/mapScale.ts` *(new)* | Pure scale-bar + heading math | **New**: `metersPerPixel`, `niceScaleDistance`, `northScreenAngle` |
| `src/scene/CameraHeadingBridge.tsx` *(new)* | Publish north heading + m/px to store (throttled) | **New** |
| `src/ui/BattleCompass.tsx` *(new)* | Compass rose DOM overlay | **New** |
| `src/ui/BattleScaleBar.tsx` *(new)* | Scale bar DOM overlay (map view only) | **New** |
| `src/ui/BattleOverlay.tsx` | Host compass + scale bar; relabel button; attribution | **Modify** |
| `src/scene/GlobeScene.tsx` | Mount `CameraHeadingBridge`; basemap id rename | **Modify** |
| `src/scene/BattleControls.tsx` | Clamp `minDistance` to texture sharpness | **Modify** |
| `src/state/store.ts` | Add `northAngle` + `metersPerPixel` fields + setters; basemap id rename | **Modify** |
| `src/styles.css` | Compass + scale-bar styling | **Modify** |

Splitting the pure math (`basemapTiles.ts`, `mapScale.ts`) out of the
canvas/scene components is what makes this testable — jsdom has no real canvas, so
the rendering stays a thin shell over tested functions.

## Data flow

```
battle entered
  └─ BattleBasemap: computeCoverage → fetch hillshade@zHi + terrainBase@min(zHi,13)
       → stitch into raw canvas (terrainBase stretched, hillshade multiplied)
       → duotone-grade raw → display canvas (throttled) → CanvasTexture → patch
  └─ CameraHeadingBridge (useFrame, throttled): camera → {northAngle, metersPerPixel} → store
       ├─ BattleCompass (DOM): northAngle → rotate rose (field view)
       └─ BattleScaleBar (DOM, map view): metersPerPixel → niceScaleDistance → bar
```

## Error handling

- **Tile 404 / network fail:** per-tile `try/catch` (as today). Hillshade is the
  critical layer; if a hillshade tile fails, that cell stays parchment
  placeholder. Terrain Base failures are silently ignored (it's an optional
  underlay) — no fallback chain needed since Hillshade carries the relief.
- **Whole-source failure:** if *no* hillshade tiles load, the patch shows graded
  parchment (acceptable degrade); satellite remains available via the toggle.
- **Bridge throttle:** change-gated writes (skip `set` when Δangle < ~0.5° and
  Δm/px < ~1%) so we never spam React state.

## Testing

Unit tests (Vitest) on the pure functions:

- `mapScale.metersPerPixel` — known dist/fov/viewport → expected m/px.
- `mapScale.niceScaleDistance` — snaps to 1/2/5 × 10ⁿ; bar pixel width ≤ max.
- `mapScale.northScreenAngle` — north-up case → 0; oblique case → expected sign.
- `basemapTiles` duotone ramp — monotonic in luminance; endpoints map to DARK/LIGHT.
- `basemapTiles.pickHillshadeZoom` — monotonic in coverage; respects the 64-tile cap.
- `basemapTiles` cross-zoom alignment — the terrain-base-stretch mapping: given a
  hillshade-grid canvas region and a terrain-base tile at `min(zHi, 13)`, the
  computed source/destination rectangles cover the same lat/lng span (the one
  piece of genuinely new compositing math, so it gets a dedicated test).
- Store test updated for the basemap id rename (`'topo'`→`'relief'`).

Live verification in the browser:

- **Austerlitz** — the old failure: relief now renders (Pratzen Heights legible).
- **Donelson / Vicksburg** — rivers read clearly in the water tint.
- **Missionary Ridge / Champion Hill** — high ground reads instantly.
- Zoom in to `minDistance` — relief stays sharp (no blur).
- Field view — compass rotates to north as you orbit; scale bar hidden.
- Map view — scale bar shows a round distance and updates on zoom.
```
