# Battle Relief Basemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the washed-out "Topo" battle basemap with a sepia-toned shaded-relief "Relief" map (Esri Hillshade over Terrain Base, duotone-graded) that reads instantly, works on every battle, stays sharp on zoom-in, and carries a compass rose + scale bar.

**Architecture:** Keep the existing tile→canvas→`CanvasTexture`→draped-patch mechanism in `BattleBasemap.tsx`, but composite two Esri sources at mixed zoom and apply a luminance→sepia duotone. All the math (zoom pick, duotone ramp, cross-zoom tile-stretch, meters-per-pixel, nice-scale rounding, screen-angle of north) is extracted into two pure, unit-tested modules (`src/lib/basemapTiles.ts`, `src/lib/mapScale.ts`); the scene/DOM pieces (`BattleBasemap`, `CameraHeadingBridge`, `BattleCompass`, `BattleScaleBar`) are thin shells over them, verified live. A throttled scene-side bridge publishes the camera's north heading + ground-meters-per-pixel into the store for the DOM furniture to read.

**Tech Stack:** Vite + React 19 + TypeScript + @react-three/fiber + @react-three/drei + three + zustand + Vitest.

**Spec:** `docs/superpowers/specs/2026-06-18-battle-relief-basemap-design.md`

**Project note:** Solo side-project on `main`; commits are local and the **user gates all pushes/deploys**. The per-task `git commit` steps below are local-only — do NOT push or deploy as part of plan execution. tsc must pass before each commit: gate with `if npx tsc --noEmit; then …` (never `npx tsc --noEmit | head`, which masks the exit code — a recurring past failure).

**Conventions to match:**
- Tests use Vitest: `import { describe, expect, it } from 'vitest'`, files named `*.test.ts` co-located next to source. Run a single file with `npx vitest run src/lib/foo.test.ts`.
- Run the whole suite with `npm test`. Typecheck with `npx tsc --noEmit`.
- Scene units: the globe has radius 1 = **6,371,000 m**. Canvas camera `fov` is **45°** (`src/scene/GlobeScene.tsx`).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/mapScale.ts` | Pure scale-bar + heading math | **Create** |
| `src/lib/mapScale.test.ts` | Tests for mapScale | **Create** |
| `src/lib/basemapTiles.ts` | Pure tile/zoom/duotone/stretch math | **Create** |
| `src/lib/basemapTiles.test.ts` | Tests for basemapTiles | **Create** |
| `src/state/store.ts` | Rename `'topo'`→`'relief'`; add `northAngle`/`metersPerPixel` + setter | **Modify** |
| `src/state/store.test.ts` | Update basemap id references | **Modify** |
| `src/scene/GlobeScene.tsx` | Rename gate; mount `CameraHeadingBridge` | **Modify** |
| `src/scene/BattleBasemap.tsx` | Two-source composite, mixed-zoom, sepia grade, sharp-floor export | **Modify (rework)** |
| `src/scene/BattleControls.tsx` | Fold sharpness floor into `minDistance` | **Modify** |
| `src/scene/CameraHeadingBridge.tsx` | Publish north heading + m/px to store (throttled) | **Create** |
| `src/ui/BattleCompass.tsx` | Compass-rose DOM overlay | **Create** |
| `src/ui/BattleScaleBar.tsx` | Scale-bar DOM overlay (map view only) | **Create** |
| `src/ui/BattleOverlay.tsx` | Relabel button; attribution; mount compass + scale bar | **Modify** |
| `src/styles.css` | Compass + scale-bar styles; rename `.topo-attribution` | **Modify** |

---

## Task 1: Rename `topo` → `relief` (pure mechanical, no behavior change)

Do this first so everything downstream builds on the new id. No new behavior — the layer still renders the old Terrain Base for now; only names change.

**Files:**
- Modify: `src/state/store.ts`
- Modify: `src/state/store.test.ts`
- Modify: `src/scene/GlobeScene.tsx`
- Modify: `src/scene/BattleBasemap.tsx` (header comment only)
- Modify: `src/ui/BattleOverlay.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Update the store.** In `src/state/store.ts`:
  - `export type BattleBasemap = 'satellite' | 'relief'`
  - In the doc comment for `battleBasemap`, change "`'topo'` = Esri World Topo XYZ tiles" to "`'relief'` = Esri Hillshade + Terrain Base, sepia-graded".
  - (Defaults already use `'satellite'` — no change there.)

- [ ] **Step 2: Update store test.** In `src/state/store.test.ts`, change any `setBattleBasemap('topo')` / `'topo'` assertions to `'relief'`.

- [ ] **Step 3: Update GlobeScene.** In `src/scene/GlobeScene.tsx`, change `battleBasemap === 'topo'` (the `topoActive` definition) to `'relief'`. Rename the local `topoActive` variable to `reliefActive` and update its two usages (the `<TerrainLayer tilesHidden={…}>` prop and the `{activeBattle && reliefActive && (<BattleBasemap …/>)}` mount). Update the nearby comment mentioning "Topo basemap patch".

- [ ] **Step 4: Update BattleBasemap header comment.** In `src/scene/BattleBasemap.tsx`, change the file-header references from `battleBasemap === 'topo'` to `'relief'` (comment only — implementation reworked in Task 4).

- [ ] **Step 5: Update BattleOverlay.** In `src/ui/BattleOverlay.tsx`:
  - In `BASEMAPS`, change `{ id: 'topo', label: 'Topo' }` to `{ id: 'relief', label: 'Relief' }` and update the trailing comment.
  - Change the attribution guard `battleBasemap === 'topo'` to `'relief'`.
  - Rename the wrapper class `topo-attribution` to `relief-attribution`. (Attribution text is updated in Task 9.)

- [ ] **Step 6: Update styles.** In `src/styles.css`, rename the `.topo-attribution` selector to `.relief-attribution` (keep the rules).

- [ ] **Step 7: Typecheck + tests.**
  Run: `npx tsc --noEmit && npm test`
  Expected: tsc clean; all tests pass (the renamed store test included).

- [ ] **Step 8: Commit.**
  ```bash
  git add src/state/store.ts src/state/store.test.ts src/scene/GlobeScene.tsx src/scene/BattleBasemap.tsx src/ui/BattleOverlay.tsx src/styles.css
  git commit -m "refactor: rename battle basemap 'topo' → 'relief'"
  ```

---

## Task 2: `mapScale.ts` — pure scale-bar + heading math (TDD)

**Files:**
- Create: `src/lib/mapScale.ts`
- Test: `src/lib/mapScale.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `src/lib/mapScale.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { metersPerPixel, niceScaleDistance, screenAngleFromUp, R_EARTH } from './mapScale'

const DEG = Math.PI / 180

describe('metersPerPixel', () => {
  it('scales linearly with camera distance', () => {
    const fov = 45 * DEG
    const near = metersPerPixel(0.01, fov, 800)
    const far = metersPerPixel(0.02, fov, 800)
    expect(far).toBeCloseTo(near * 2, 6)
  })
  it('matches the closed-form vertical span', () => {
    const fov = 45 * DEG
    const dist = 0.01 // globe radii
    const h = 800
    const expected = (2 * dist * Math.tan(fov / 2) * R_EARTH) / h
    expect(metersPerPixel(dist, fov, h)).toBeCloseTo(expected, 3)
  })
})

describe('niceScaleDistance', () => {
  it('snaps to a 1/2/5 × 10^n distance within the max bar width', () => {
    // 10 m/px, max 160 px → max 1600 m → nice = 1000 m
    const r = niceScaleDistance(10, 160)
    expect(r.meters).toBe(1000)
    expect(r.pixels).toBeCloseTo(100, 6)
    expect(r.label).toBe('1 km')
  })
  it('uses metre labels below 1 km and never exceeds the max width', () => {
    const r = niceScaleDistance(2, 160) // max 320 m → nice = 200 m
    expect(r.meters).toBe(200)
    expect(r.label).toBe('200 m')
    expect(r.pixels).toBeLessThanOrEqual(160)
  })
})

describe('screenAngleFromUp', () => {
  it('is 0 when north points straight up the screen', () => {
    // screen y grows downward; "up" is decreasing y
    expect(screenAngleFromUp(100, 100, 100, 40)).toBeCloseTo(0, 6)
  })
  it('is +90° (π/2) when north points screen-right', () => {
    expect(screenAngleFromUp(100, 100, 160, 100)).toBeCloseTo(Math.PI / 2, 6)
  })
})
```

- [ ] **Step 2: Run to verify failure.**
  Run: `npx vitest run src/lib/mapScale.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/mapScale.ts`:**

```ts
/** Pure geometry for battle map furniture (scale bar + compass). No three.js. */

/** Globe scene-radius 1 == this many metres. */
export const R_EARTH = 6_371_000

/** Ground metres covered by one screen pixel for a straight-down camera.
 *  Visible vertical span = 2·dist·tan(fov/2); divide by viewport height in px.
 *  `dist` is the camera→target distance in globe radii (1 = R_EARTH metres). */
export function metersPerPixel(distRadii: number, fovRad: number, viewportH: number): number {
  return (2 * distRadii * Math.tan(fovRad / 2) * R_EARTH) / viewportH
}

export interface ScaleChoice {
  meters: number
  pixels: number
  label: string
}

/** Largest "nice" ground distance (1/2/5 × 10^n metres) whose bar is ≤ maxPx wide. */
export function niceScaleDistance(metersPerPx: number, maxPx: number): ScaleChoice {
  const maxMeters = metersPerPx * maxPx
  const base = Math.pow(10, Math.floor(Math.log10(maxMeters)))
  const meters =
    5 * base <= maxMeters ? 5 * base : 2 * base <= maxMeters ? 2 * base : base
  const pixels = meters / metersPerPx
  const label = meters >= 1000 ? `${meters / 1000} km` : `${meters} m`
  return { meters, pixels, label }
}

/** Clockwise screen-rotation (radians) from "up" to the vector (from→to), in a
 *  y-grows-downward pixel space. 0 = up, +π/2 = right. The compass rose applies
 *  this so its needle points to true north on screen. */
export function screenAngleFromUp(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(toX - fromX, -(toY - fromY))
}
```

- [ ] **Step 4: Run tests.**
  Run: `npx vitest run src/lib/mapScale.test.ts`
  Expected: PASS (all 6).

- [ ] **Step 5: Commit.**
  ```bash
  git add src/lib/mapScale.ts src/lib/mapScale.test.ts
  git commit -m "feat: add pure map-scale + heading math (mapScale)"
  ```

---

## Task 3: `basemapTiles.ts` — pure tile/zoom/duotone/stretch math (TDD)

Extracts the tile math from `BattleBasemap.tsx` and adds the new pieces. `BattleBasemap` will import from here in Task 4.

**Files:**
- Create: `src/lib/basemapTiles.ts`
- Test: `src/lib/basemapTiles.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `src/lib/basemapTiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  pickHillshadeZoom, duotone, DARK, LIGHT, terrainDestRect, TILE_SIZE, Z_TERRAIN_MAX,
} from './basemapTiles'

describe('pickHillshadeZoom', () => {
  it('increases as coverage shrinks (finer zoom when tighter)', () => {
    const wide = pickHillshadeZoom(2.0)
    const tight = pickHillshadeZoom(0.2)
    expect(tight).toBeGreaterThan(wide)
  })
  it('clamps to [7, 16]', () => {
    expect(pickHillshadeZoom(1e-6)).toBe(16)
    expect(pickHillshadeZoom(1e6)).toBe(7)
  })
})

describe('duotone', () => {
  it('maps black → DARK and white → LIGHT', () => {
    expect(duotone(0, 0, 0)).toEqual(DARK)
    expect(duotone(255, 255, 255)).toEqual(LIGHT)
  })
  it('is monotonic in luminance (brighter input → channel ≥ darker input)', () => {
    const lo = duotone(40, 40, 40)
    const hi = duotone(200, 200, 200)
    expect(hi[0]).toBeGreaterThanOrEqual(lo[0])
    expect(hi[1]).toBeGreaterThanOrEqual(lo[1])
    expect(hi[2]).toBeGreaterThanOrEqual(lo[2])
  })
})

describe('terrainDestRect', () => {
  it('a terrain tile one zoom coarser covers a 2× region of the hillshade canvas', () => {
    const zHi = 14
    const zLo = 13 // = min(zHi, Z_TERRAIN_MAX)
    // hillshade coverage origin at tile (8000, 6000) at zHi
    const cov = { z: zHi, xMin: 8000, yMin: 6000 }
    // terrain tile (4000, 3000) at zLo maps to hillshade tiles (8000, 6000)
    const r = terrainDestRect(4000, 3000, zLo, cov)
    const scale = Math.pow(2, zHi - zLo) // 2
    expect(r.dx).toBe(0)
    expect(r.dy).toBe(0)
    expect(r.dw).toBe(scale * TILE_SIZE)
    expect(r.dh).toBe(scale * TILE_SIZE)
  })
  it('offsets by whole hillshade tiles for neighbouring terrain tiles', () => {
    const cov = { z: 14, xMin: 8000, yMin: 6000 }
    const r = terrainDestRect(4001, 3000, 13, cov) // one tile east at zLo
    expect(r.dx).toBe(2 * TILE_SIZE) // 2 hillshade tiles east
    expect(r.dy).toBe(0)
  })
})

it('Z_TERRAIN_MAX is 13', () => expect(Z_TERRAIN_MAX).toBe(13))
```

- [ ] **Step 2: Run to verify failure.**
  Run: `npx vitest run src/lib/basemapTiles.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/basemapTiles.ts`.** Move the existing tile-math helpers (`mercY`, `lngToTileX`, `latToTileY`, `tileXToLng`, `tileYToLat`) out of `BattleBasemap.tsx` into here and export them, then add the new functions:

```ts
/** Pure web-mercator tile math + relief compositing helpers. No three.js / DOM. */

export const TILE_SIZE = 256
/** Esri World Terrain Base has no tiles past ~z13; we stretch it as an underlay. */
export const Z_TERRAIN_MAX = 13

export const DARK: [number, number, number] = [0x3a, 0x2c, 0x1a]
export const LIGHT: [number, number, number] = [0xe8, 0xdc, 0xc0]

// ── existing helpers moved from BattleBasemap.tsx (export them) ──
export function mercY(latDeg: number): number {
  const lat = latDeg * (Math.PI / 180)
  return Math.log(Math.tan(Math.PI / 4 + lat / 2))
}
export function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z))
}
export function latToTileY(lat: number, z: number): number {
  const r = lat * (Math.PI / 180)
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z))
}
export function tileXToLng(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180
}
export function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

/** Hillshade zoom: ~8 tiles across the coverage (finer than the old ~5), so the
 *  static texture stays sharp across the bounded free-zoom. Clamped to [7, 16]. */
export function pickHillshadeZoom(coverageLngDeg: number, tilesAcross = 8, maxZoom = 16): number {
  const z = Math.round(Math.log2((360 * tilesAcross) / coverageLngDeg))
  return Math.max(7, Math.min(maxZoom, z))
}

/** Luminance → parchment duotone. Pure; always reads raw RGB (never re-grades). */
export function duotone(r: number, g: number, b: number): [number, number, number] {
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return [
    Math.round(DARK[0] + (LIGHT[0] - DARK[0]) * l),
    Math.round(DARK[1] + (LIGHT[1] - DARK[1]) * l),
    Math.round(DARK[2] + (LIGHT[2] - DARK[2]) * l),
  ]
}

/** Destination rect (in the hillshade-addressed canvas) for a Terrain Base tile
 *  at the coarser zoom zLo. Both sources are web-mercator, so a zLo tile covers
 *  exactly 2^(zHi−zLo) hillshade tiles — integer-aligned, no resampling drift. */
export function terrainDestRect(
  txLo: number, tyLo: number, zLo: number,
  cov: { z: number; xMin: number; yMin: number },
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.pow(2, cov.z - zLo)
  return {
    dx: (txLo * scale - cov.xMin) * TILE_SIZE,
    dy: (tyLo * scale - cov.yMin) * TILE_SIZE,
    dw: scale * TILE_SIZE,
    dh: scale * TILE_SIZE,
  }
}
```

- [ ] **Step 4: Run tests.**
  Run: `npx vitest run src/lib/basemapTiles.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/lib/basemapTiles.ts src/lib/basemapTiles.test.ts
  git commit -m "feat: add pure relief-basemap tile/duotone math (basemapTiles)"
  ```

---

## Task 4: Rework `BattleBasemap.tsx` — two-source composite + mixed-zoom + sepia grade

The canvas/draping is not unit-testable (jsdom has no real 2D canvas), so this task is verified live. Keep the module-level cache, `prefetchBasemap`, geometry build, flat-mode toggle, and `useFrame` texture-apply. Change the tile-source/composite/grade internals and import the moved math from `basemapTiles`.

**Files:**
- Modify: `src/scene/BattleBasemap.tsx`

- [ ] **Step 1: Import moved helpers.** Replace the local `mercY`/`lngToTileX`/`latToTileY`/`tileXToLng`/`tileYToLat` definitions with imports from `../lib/basemapTiles` (also import `TILE_SIZE`, `Z_TERRAIN_MAX`, `pickHillshadeZoom`, `duotone`, `terrainDestRect`). Delete the now-duplicated local copies and the old `pickZoom`.

- [ ] **Step 2: Switch coverage to the hillshade zoom.** In `computeCoverage`, replace `const z = pickZoom(lngDelta * 2)` with `const z = pickHillshadeZoom(lngDelta * 2)`. After computing `xMin..yMax`, **cap to 64 tiles**: if `(xMax-xMin+1)*(yMax-yMin+1) > 64`, decrement `z` and recompute until within budget (or until `z === 7`). Keep returning the tile bbox lat/lng as today.

- [ ] **Step 3: Two URL builders.** Keep `ESRI_TERRAIN_BASE`; rename the existing fallback constant usage so hillshade is now the **primary overlay**, terrain base the **underlay**. Both:
  ```ts
  const ESRI_HILLSHADE = (z,y,x) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Hillshade/MapServer/tile/${z}/${y}/${x}`
  const ESRI_TERRAIN_BASE = (z,y,x) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/${z}/${y}/${x}`
  ```

- [ ] **Step 4: Rework `fetchAndStitchProgressive` to composite into a RAW canvas.** The function now fills a raw (un-graded) canvas:
  1. **Underlay pass:** compute `zLo = Math.min(cov.z, Z_TERRAIN_MAX)`. Enumerate the Terrain Base tiles covering the patch at `zLo` (derive their x/y range from the patch lng/lat bbox via `lngToTileX`/`latToTileY` at `zLo`). For each, `loadImage(ESRI_TERRAIN_BASE(zLo,ty,tx))`, then `ctx.drawImage(img, dx, dy, dw, dh)` using `terrainDestRect(tx,ty,zLo,cov)`. Terrain failures are ignored (optional underlay).
  2. **Relief pass:** for each hillshade tile in `[xMin..xMax]×[yMin..yMax]` at `cov.z`, `loadImage(ESRI_HILLSHADE(cov.z,ty,tx))` and draw at `(tx-xMin)*TILE_SIZE,(ty-yMin)*TILE_SIZE` with `ctx.globalCompositeOperation='multiply'` (reset to `'source-over'` afterward). Hillshade is the critical layer; on failure leave that cell as placeholder.
  3. Call `onTileDrawn()` after each successful draw (drives the throttled grade).
  Launch both passes' loads in parallel via `Promise.allSettled`. (Underlay first in z-order is guaranteed by drawing terrain with `source-over` then hillshade with `multiply` regardless of arrival order — multiply over parchment placeholder is acceptable while terrain streams in.)
  **Prune the vestigial `provider`/`triedFallback`/`_provider` plumbing.** The old code returned a `provider` string (terrain vs hillshade-fallback) consumed at the current lines 391–396 and 301–302 and written to `canvas._provider` for attribution. The new composite always uses both sources and Task 9 sets a static attribution string, so drop the `provider` return value, the `triedFallback` flag, `entry.provider`, and the `_provider` write — leftover unused symbols fail the build (see Notes).

- [ ] **Step 5: Add the duotone grade (raw → display canvas).** Each cache entry now holds **two** canvases: `raw` (composited tiles) and `display` (graded). The `CanvasTexture` is backed by `display`. Add a `regrade(entry)` helper:
  ```ts
  function regrade(raw: HTMLCanvasElement, display: HTMLCanvasElement) {
    const rctx = raw.getContext('2d')!, dctx = display.getContext('2d')!
    const img = rctx.getImageData(0, 0, raw.width, raw.height)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = duotone(d[i], d[i + 1], d[i + 2])
      d[i] = r; d[i + 1] = g; d[i + 2] = b
    }
    dctx.putImageData(img, 0, 0)
  }
  ```
  Call `regrade` inside the existing throttled `throttledUpdate` (≤4/sec) and once more on completion, then set `texture.needsUpdate = true`. The parchment placeholder fill moves to the **display** canvas so pre-load looks parchment, not black.

- [ ] **Step 6: Update the cache entry + texture wiring.** Extend `CacheEntry` with `display: HTMLCanvasElement`. `getOrCreateCacheEntry` creates both canvases (same dims) and parchment-fills `display`. `texRef`/material map points at `display`. Keep eviction disposing the texture.

- [ ] **Step 7: Export the sharpness floor for BattleControls.** Add and export:
  ```ts
  /** Closest camera distance (globe radii) at which the chosen hillshade zoom
   *  still meets ~1 texel/screen-pixel, so OrbitControls can clamp zoom-in.
   *  Derived from the texture's ground resolution; conservative constant factor. */
  export function reliefSharpFloor(battle: Battle, site: LatLng): number { … }
  ```
  Compute it from the same `computeCoverage` result: ground metres per texel = (patch ground width / canvas px width); convert to a camera distance where that texel ≈ one screen pixel at fov 45° and a nominal 900 px viewport. Keep it a single pure-ish function reusing `computeCoverage` (memoize via the existing `WeakMap`-free `useMemo` path is fine — it's only called by BattleControls per battle).

- [ ] **Step 8: Live verification.**
  Run: `npx tsc --noEmit && npm run dev` (then open the app).
  Enter a battle → click **Relief**. Verify on:
  - **Austerlitz** (Napoleon): relief renders (Pratzen plateau visible), not blank.
  - **Fort Donelson / Vicksburg** (Grant): the river reads as a distinct water tone.
  - **Missionary Ridge / Champion Hill**: the ridge/hill reads as raised relief.
  - Overall tone is sepia/parchment, no modern labels.
  Confirm no console errors and the layer fills progressively then settles.

- [ ] **Step 9: Commit.**
  ```bash
  git add src/scene/BattleBasemap.tsx
  git commit -m "feat: relief basemap — hillshade over terrain base, sepia duotone, mixed-zoom"
  ```

---

## Task 5: Clamp zoom-in to texture sharpness (`BattleControls.tsx`)

**Files:**
- Modify: `src/scene/BattleControls.tsx`

- [ ] **Step 1: Import the floor.** `import { reliefSharpFloor } from './BattleBasemap'` (or wherever Task 4 exported it). Read the active basemap: `const battleBasemap = useAppStore((s) => s.battleBasemap)`.

- [ ] **Step 2: Fold into `minDistance`.** Compute `const sharpFloor = battleBasemap === 'relief' ? reliefSharpFloor(battle, site) : 0`. Change the OrbitControls prop to:
  ```tsx
  minDistance={Math.max(0.001, frameAlt * 0.12, sharpFloor)}
  ```
  (Satellite keeps today's behaviour since `sharpFloor` is 0 then. This replaces — not stacks on — the old clamp, per the spec decision.)

- [ ] **Step 3: Typecheck.**
  Run: `npx tsc --noEmit`
  Expected: clean.

- [ ] **Step 4: Live check.** In Relief view, zoom all the way in — relief should stay sharp (no blur past the floor). In Satellite view, zoom-in range is unchanged.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/scene/BattleControls.tsx
  git commit -m "feat: clamp relief zoom-in to texture sharpness floor"
  ```

---

## Task 6: Store metrics + `CameraHeadingBridge` (publish north + m/px)

**Files:**
- Modify: `src/state/store.ts`
- Create: `src/scene/CameraHeadingBridge.tsx`
- Modify: `src/scene/GlobeScene.tsx`

- [ ] **Step 1: Add store fields + setter.** In `src/state/store.ts`:
  - State: `northAngle: number` (radians, 0 = north-up) and `metersPerPixel: number` (0 = unknown).
  - Add to `initial`: `northAngle: 0, metersPerPixel: 0`.
  - Setter: `setMapMetrics: (m: { northAngle: number; metersPerPixel: number }) => void` → `set(m)`.
  - (They reset with `enterBattle`/`exitBattle` automatically via `initial` only if listed there; since those setters use explicit object literals, also add `northAngle: 0, metersPerPixel: 0` to the `enterBattle` and `exitBattle` set-calls so stale values don't linger.)

- [ ] **Step 2: Create `src/scene/CameraHeadingBridge.tsx`:**

```tsx
import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geodeticToVector3 } from '../lib/geo'
import { metersPerPixel, screenAngleFromUp } from '../lib/mapScale'
import { useAppStore } from '../state/store'
import type { LatLng } from '../data/schema'

const NORTH_EPS = 0.0005 // small north step in radians for the tangent

/** Reads the battle camera each frame and publishes the screen-angle of true
 *  north + ground metres-per-pixel to the store (throttled, change-gated) so the
 *  DOM compass + scale bar can render without per-frame React churn. */
export function CameraHeadingBridge({ site }: { site: LatLng }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const setMapMetrics = useAppStore((s) => s.setMapMetrics)
  const tAcc = useRef(0)

  useFrame((_, dt) => {
    // throttle ~10 Hz via accumulator
    tAcc.current += dt
    if (tAcc.current < 0.1) return
    tAcc.current = 0

    const siteV = geodeticToVector3(site.lat, site.lng, 1)
    const northV = geodeticToVector3(site.lat + NORTH_EPS * (180 / Math.PI), site.lng, 1)
    const a = siteV.clone().project(camera) // NDC
    const b = northV.clone().project(camera)
    // NDC → screen px (y-down)
    const ax = (a.x * 0.5 + 0.5) * size.width, ay = (-a.y * 0.5 + 0.5) * size.height
    const bx = (b.x * 0.5 + 0.5) * size.width, by = (-b.y * 0.5 + 0.5) * size.height
    const northAngle = screenAngleFromUp(ax, ay, bx, by)

    const dist = camera.position.distanceTo(siteV)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const mpp = metersPerPixel(dist, fov, size.height)

    const prev = useAppStore.getState()
    if (Math.abs(prev.northAngle - northAngle) < 0.0087 &&
        Math.abs(prev.metersPerPixel - mpp) < mpp * 0.01) return // <0.5°, <1%
    setMapMetrics({ northAngle, metersPerPixel: mpp })
  })
  return null
}
```

- [ ] **Step 3: Mount it in GlobeScene.** In `src/scene/GlobeScene.tsx`, next to the `BattleControls` mount, add (inside the same `activeBattle && journey && battleStopIndex != null` guard):
  ```tsx
  <CameraHeadingBridge site={journey.stops[battleStopIndex].coords} />
  ```
  Add the import.

- [ ] **Step 4: Typecheck + tests.**
  Run: `npx tsc --noEmit && npm test`
  Expected: clean; store test still passes (add a quick assertion that `setMapMetrics` updates both fields if you want coverage).

- [ ] **Step 5: Commit.**
  ```bash
  git add src/state/store.ts src/scene/CameraHeadingBridge.tsx src/scene/GlobeScene.tsx
  git commit -m "feat: publish battle camera north-angle + m/px to store"
  ```

---

## Task 7: `BattleCompass.tsx` — compass-rose overlay

**Files:**
- Create: `src/ui/BattleCompass.tsx`
- Modify: `src/ui/BattleOverlay.tsx` (mount)
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/ui/BattleCompass.tsx`.** A small SVG compass rose (N marker + needle) in a fixed corner. Reads `northAngle` from the store; in **map** view force 0 (north-up), in **field** view rotate by `northAngle`:
  ```tsx
  import { useAppStore } from '../state/store'
  export function BattleCompass() {
    const view = useAppStore((s) => s.battleView)
    const northAngle = useAppStore((s) => s.northAngle)
    const deg = view === 'map' ? 0 : (northAngle * 180) / Math.PI
    return (
      <div className="battle-compass" aria-hidden="true">
        <svg viewBox="0 0 48 48" style={{ transform: `rotate(${deg}deg)` }}>
          {/* rose: outer ring, N-pointing needle (sepia), 'N' tick */}
          …
        </svg>
      </div>
    )
  }
  ```
  Match the app's sepia palette (ink `#3a2c1a`, parchment `#e8dcc0`).

- [ ] **Step 2: Mount in BattleOverlay.** Render `<BattleCompass />` inside the battle overlay (e.g. top-left of the field area). Import it.

- [ ] **Step 3: Style.** Add `.battle-compass` to `src/styles.css` — fixed/absolute position, ~48px, subtle parchment disc, drop shadow, `pointer-events: none`, transition on transform for smooth rotation.

- [ ] **Step 4: Typecheck + live check.**
  Run: `npx tsc --noEmit`
  In Field view, orbit the camera — the rose rotates so N tracks true north. In Map view it stays north-up.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/ui/BattleCompass.tsx src/ui/BattleOverlay.tsx src/styles.css
  git commit -m "feat: battle compass rose overlay"
  ```

---

## Task 8: `BattleScaleBar.tsx` — scale-bar overlay (map view only)

**Files:**
- Create: `src/ui/BattleScaleBar.tsx`
- Modify: `src/ui/BattleOverlay.tsx` (mount)
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/ui/BattleScaleBar.tsx`.** Map view only; reads `metersPerPixel`, computes a nice bar:
  ```tsx
  import { useAppStore } from '../state/store'
  import { niceScaleDistance } from '../lib/mapScale'
  const MAX_BAR_PX = 160
  export function BattleScaleBar() {
    const view = useAppStore((s) => s.battleView)
    const mpp = useAppStore((s) => s.metersPerPixel)
    if (view !== 'map' || !(mpp > 0)) return null
    const { pixels, label } = niceScaleDistance(mpp, MAX_BAR_PX)
    return (
      <div className="battle-scalebar" aria-hidden="true">
        <div className="battle-scalebar-bar" style={{ width: `${pixels}px` }} />
        <span className="battle-scalebar-label">{label}</span>
      </div>
    )
  }
  ```

- [ ] **Step 2: Mount in BattleOverlay** (e.g. bottom-left above the footer). Import it.

- [ ] **Step 3: Style** `.battle-scalebar` / `-bar` / `-label` in `src/styles.css` — sepia bar with end ticks, small caption, `pointer-events: none`.

- [ ] **Step 4: Typecheck + live check.**
  Run: `npx tsc --noEmit`
  In Map view, the bar shows a round distance (e.g. "1 km") and updates as you wheel-zoom; in Field view it's absent.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/ui/BattleScaleBar.tsx src/ui/BattleOverlay.tsx src/styles.css
  git commit -m "feat: battle scale-bar overlay (map view)"
  ```

---

## Task 9: Attribution text + final verification

**Files:**
- Modify: `src/ui/BattleOverlay.tsx`

- [ ] **Step 1: Update attribution.** In the `battleBasemap === 'relief'` block, change the text to:
  `Relief © Esri — World Hillshade, World Terrain Base`

- [ ] **Step 2: Full typecheck + suite.**
  Run: `npx tsc --noEmit && npm test`
  Expected: tsc clean; all tests pass.

- [ ] **Step 3: Full live pass.** For each battle (Austerlitz, Shiloh, Donelson, Champion Hill, Vicksburg, Missionary Ridge), toggle **Relief**: confirm it renders (no blank), high ground/water read clearly, sepia tone, compass present (rotates in Field), scale bar present in Map and sane, zoom-in stays sharp. Note any battle that still looks weak for follow-up.

- [ ] **Step 4: Commit.**
  ```bash
  git add src/ui/BattleOverlay.tsx
  git commit -m "feat: relief basemap attribution"
  ```

- [ ] **Step 5: Hand back to the user** for the push/deploy decision (do not push or deploy automatically). Per the project's account dance, deploy is: `gh auth switch -u bashd4` → push → restore `gh auth switch -u bashd-ClaimKit`, then `vercel deploy --prod --yes`.

---

## Notes for the implementer

- **Don't mask tsc:** always `npx tsc --noEmit` on its own (or `&&`-chained), never piped to `head`.
- **Remove dead code:** when moving tile helpers into `basemapTiles.ts`, delete the originals in `BattleBasemap.tsx` and any now-unused imports — leftover unused symbols fail the build.
- **Canvas in tests:** do NOT try to unit-test the canvas/draping. The pure math is in `mapScale.ts`/`basemapTiles.ts`; everything else is verified live.
- **Throttle accumulator** in `CameraHeadingBridge` is a `useRef` (safe against any future multi-mount).
