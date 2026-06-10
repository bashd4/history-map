# History Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app: a vintage sepia three.js globe in dark space where Napoleon's life plays as a scroll-driven camera flight, with one battle (Austerlitz) watchable from bird's-eye view over real streamed terrain.

**Architecture:** Vite + React + TypeScript SPA. One persistent react-three-fiber canvas renders the globe (custom sepia shader, atmosphere, gold route arcs); DOM overlays render the hub and story cards. Scroll progress (GSAP ScrollTrigger → zustand store) drives a damped `CameraRig`. Battle mode is a modal state that locks scroll, dives the camera, lazy-loads a streamed-terrain layer (NASA `3d-tiles-renderer`), and plays phased movement arrows. A full-screen parchment post-processing grade unifies everything.

**Tech Stack:** three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, gsap (ScrollTrigger), zustand, zod, react-router-dom, 3d-tiles-renderer, vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-history-map-design.md` — read it before starting.

**Conventions used throughout:**
- Globe radius = 1 world unit (`GLOBE_RADIUS`). Altitudes are in globe radii (Earth radius ≈ 6,378 km, so altitude 0.08 ≈ 510 km).
- All test commands: `npx vitest run <file>`. Dev server: `npm run dev`.
- Commit after every green test / verified visual step. Use `feat:`/`test:`/`chore:` prefixes.

---

## File Structure

```
public/textures/earth-blue-marble.jpg   # downloaded in Task 0
src/
  main.tsx                  # router bootstrap
  App.tsx                   # routes: / (hub), /:journeyId (journey)
  styles.css                # global styles (dark void, serif, cards)
  data/schema.ts            # zod schema + inferred TS types
  journeys/napoleon.ts      # v1 content (data only)
  journeys/index.ts         # journey registry
  lib/geo.ts                # lat/lng→Vector3, slerp, great-circle arcs
  lib/journeyCamera.ts      # scroll t → camera state (pure)
  lib/battlePlayback.ts     # battle elapsed time → phase state (pure)
  state/store.ts            # zustand: mode, journey, scrollT, battle state
  scene/GlobeScene.tsx      # Canvas root, composes everything below
  scene/Globe.tsx           # sphere + sepia shader
  scene/Atmosphere.tsx      # fresnel gold rim
  scene/Starfield.tsx       # sparse static points
  scene/RouteArcs.tsx       # tube arcs + stop markers
  scene/CameraRig.tsx       # the only thing that moves the camera
  scene/Effects.tsx         # bloom + sepia grade + vignette + grain
  scene/TerrainLayer.tsx    # lazy: 3d-tiles-renderer streamed terrain
  scene/BattleArrows.tsx    # animated movement tubes + arrowheads
  ui/Hub.tsx                # landing overlay: title + journey list
  ui/JourneyStory.tsx       # scroll container + story cards
  ui/BattleOverlay.tsx      # phase captions + scrubber + play/pause
  hooks/useScrollProgress.ts # ScrollTrigger → store.scrollT
src/lib/geo.test.ts
src/lib/journeyCamera.test.ts
src/lib/battlePlayback.test.ts
src/data/journeys.test.ts   # zod validation over all journeys
src/state/store.test.ts
```

Relevant skills: @superpowers:test-driven-development for Tasks 1–6, @superpowers:verification-before-completion everywhere.

---

### Task 0: Scaffold

**Files:** Create: project scaffold at repo root (`package.json`, `vite.config.ts`, `index.html`, `src/`), `public/textures/`.

- [ ] **Step 1: Scaffold Vite app in the existing repo**

```bash
cd /Users/bashd/Projects/history-map
npm create vite@latest . -- --template react-ts   # answer "Ignore files and continue" if prompted
npm install
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing gsap zustand zod react-router-dom 3d-tiles-renderer
npm install -D vitest @types/three
```

- [ ] **Step 2: Add test script + download earth texture**

In `package.json` scripts add: `"test": "vitest run"`.

```bash
mkdir -p public/textures
curl -L -o public/textures/earth-blue-marble.jpg https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg
```

- [ ] **Step 3: Replace boilerplate styles**

Delete `src/App.css`, `src/assets/react.svg`, `public/vite.svg` references. Replace `src/index.css` with `src/styles.css`:

```css
:root { color-scheme: dark; }
* { margin: 0; box-sizing: border-box; }
html, body { background: #0a0805; color: #e8dcc3; font-family: Georgia, 'Times New Roman', serif; }
#root { width: 100%; }
.canvas-fixed { position: fixed; inset: 0; z-index: 0; }
.overlay { position: fixed; z-index: 10; }
h1, h2, h3 { font-weight: 700; letter-spacing: 0.04em; }
button { font: inherit; cursor: pointer; }
```

- [ ] **Step 4: Verify dev server boots**

Run: `npm run dev` — open the URL, expect a blank dark page, no console errors. Run `npm test` — expect "no test files found" (exit 0 with `--passWithNoTests`; add that flag to the test script).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite + react + three stack"
```

---

### Task 1: Journey schema (Zod)

**Files:** Create: `src/data/schema.ts`, Test: `src/data/schema.test.ts` (the schema itself; validation of real data comes in Task 3's `journeys.test.ts`).

- [ ] **Step 1: Write failing test** — `src/data/schema.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { journeySchema } from './schema'

const validStop = { name: 'Toulon', coords: { lat: 43.12, lng: 5.93 }, date: 'Dec 1793', story: 'Siege.' }
const validJourney = {
  id: 'test', figure: 'X', title: 'T', years: '1-2', color: '#e8b54a', intro: 'i',
  stops: [validStop, { ...validStop, name: 'Paris' }],
}

describe('journeySchema', () => {
  it('accepts a valid journey', () => {
    expect(journeySchema.parse(validJourney).id).toBe('test')
  })
  it('rejects out-of-range coords', () => {
    const bad = { ...validJourney, stops: [{ ...validStop, coords: { lat: 99, lng: 0 } }, validStop] }
    expect(() => journeySchema.parse(bad)).toThrow()
  })
  it('rejects fewer than 2 stops', () => {
    expect(() => journeySchema.parse({ ...validJourney, stops: [validStop] })).toThrow()
  })
  it('accepts an optional battle with phases and movements', () => {
    const battleStop = {
      ...validStop,
      battle: {
        name: 'Austerlitz', date: '2 Dec 1805',
        phases: [{
          caption: 'The trap.',
          movements: [{ side: 'french', style: 'feint', path: [{ lat: 49.1, lng: 16.7 }, { lat: 49.2, lng: 16.8 }] }],
        }],
      },
    }
    const j = journeySchema.parse({ ...validJourney, stops: [battleStop, validStop] })
    expect(j.stops[0].battle?.phases[0].movements[0].side).toBe('french')
  })
})
```

- [ ] **Step 2: Run test, verify it fails** — `npx vitest run src/data/schema.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/data/schema.ts`

```ts
import { z } from 'zod'

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

const movement = z.object({
  side: z.enum(['french', 'coalition']), // v1; widen to z.string() when journey #2 needs it
  style: z.enum(['advance', 'retreat', 'feint']),
  path: z.array(latLng).min(2),
})

const phase = z.object({
  caption: z.string().min(1),
  duration: z.number().positive().optional(), // seconds; default applied in battlePlayback
  movements: z.array(movement).min(1),
})

const battle = z.object({ name: z.string().min(1), date: z.string().min(1), phases: z.array(phase).min(1) })

const stop = z.object({
  name: z.string().min(1),
  coords: latLng,
  date: z.string().min(1),
  story: z.string().min(1),
  camera: z.object({ altitude: z.number().positive(), pitch: z.number().optional() }).optional(),
  battle: battle.optional(),
})

export const journeySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  figure: z.string().min(1),
  title: z.string().min(1),
  years: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  intro: z.string().min(1),
  stops: z.array(stop).min(2),
})

export type Journey = z.infer<typeof journeySchema>
export type Stop = Journey['stops'][number]
export type Battle = NonNullable<Stop['battle']>
export type Phase = Battle['phases'][number]
export type Movement = Phase['movements'][number]
export type LatLng = z.infer<typeof latLng>
```

- [ ] **Step 4: Run test, verify pass** — `npx vitest run src/data/schema.test.ts` → 4 passed.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: journey zod schema and types"`

---

### Task 2: Geo math

**Files:** Create: `src/lib/geo.ts`, Test: `src/lib/geo.test.ts`.

- [ ] **Step 1: Write failing tests** — `src/lib/geo.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { GLOBE_RADIUS, greatCirclePoints, latLngToVector3 } from './geo'

describe('latLngToVector3', () => {
  it('puts the north pole at +Y', () => {
    const v = latLngToVector3(90, 0)
    expect(v.y).toBeCloseTo(1); expect(v.x).toBeCloseTo(0); expect(v.z).toBeCloseTo(0)
  })
  it('puts equator points on the XZ plane at the right radius', () => {
    const v = latLngToVector3(0, 45, 2)
    expect(v.y).toBeCloseTo(0); expect(v.length()).toBeCloseTo(2)
  })
})

describe('greatCirclePoints', () => {
  const paris = { lat: 48.85, lng: 2.35 }
  const moscow = { lat: 55.75, lng: 37.61 }
  it('starts and ends just above the surface', () => {
    const pts = greatCirclePoints(paris, moscow)
    expect(pts[0].length()).toBeCloseTo(GLOBE_RADIUS * 1.002, 3)
    expect(pts.at(-1)!.length()).toBeCloseTo(GLOBE_RADIUS * 1.002, 3)
  })
  it('arcs above the surface at the midpoint', () => {
    const pts = greatCirclePoints(paris, moscow)
    expect(pts[Math.floor(pts.length / 2)].length()).toBeGreaterThan(GLOBE_RADIUS * 1.01)
  })
  it('returns segments+1 points', () => {
    expect(greatCirclePoints(paris, moscow, 32)).toHaveLength(33)
  })
})
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/geo.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/lib/geo.ts`

```ts
import * as THREE from 'three'
import type { LatLng } from '../data/schema'

export const GLOBE_RADIUS = 1

/** Matches equirectangular texture mapping on THREE.SphereGeometry. */
export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

/** Spherical interpolation between two unit vectors. */
export function slerpUnit(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const angle = a.angleTo(b)
  if (angle < 1e-6) return a.clone()
  const s = Math.sin(angle)
  return a.clone().multiplyScalar(Math.sin((1 - t) * angle) / s)
    .add(b.clone().multiplyScalar(Math.sin(t * angle) / s))
}

/** Great-circle arc lifted off the surface; lift scales with arc length. */
export function greatCirclePoints(from: LatLng, to: LatLng, segments = 64, lift = 0.05): THREE.Vector3[] {
  const a = latLngToVector3(from.lat, from.lng).normalize()
  const b = latLngToVector3(to.lat, to.lng).normalize()
  const angle = a.angleTo(b)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const r = GLOBE_RADIUS * (1.002 + lift * Math.max(angle, 0.15) * Math.sin(Math.PI * t))
    pts.push(slerpUnit(a, b, t).multiplyScalar(r))
  }
  return pts
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/lib/geo.test.ts` → 5 passed.
- [ ] **Step 5: Commit** — `git commit -am "feat: geo math (lat/lng projection, great-circle arcs)"`

---

### Task 3: Napoleon journey data

**Files:** Create: `src/journeys/napoleon.ts`, `src/journeys/index.ts`, Test: `src/data/journeys.test.ts`.

- [ ] **Step 1: Write failing test** — `src/data/journeys.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { journeys } from '../journeys'
import { journeySchema } from './schema'

describe('journey data files', () => {
  it('has at least one journey', () => { expect(journeys.length).toBeGreaterThan(0) })
  for (const j of journeys) {
    it(`${j.id ?? '?'} passes schema validation`, () => { journeySchema.parse(j) })
  }
  it('napoleon has exactly one battle (Austerlitz)', () => {
    const napoleon = journeys.find((j) => j.id === 'napoleon')!
    const battles = napoleon.stops.filter((s) => s.battle)
    expect(battles).toHaveLength(1)
    expect(battles[0].battle!.name).toMatch(/Austerlitz/)
  })
})
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/data/journeys.test.ts` → FAIL.

- [ ] **Step 3: Write the content** — `src/journeys/napoleon.ts`. This is the v1 editorial content — keep stories to 1–3 vivid sentences. **Flag the finished file for user review in the task report.**

```ts
import type { Journey } from '../data/schema'

export const napoleon: Journey = {
  id: 'napoleon',
  figure: 'Napoleon Bonaparte',
  title: 'The Rise and Fall of Napoleon',
  years: '1769–1821',
  color: '#e8b54a',
  intro: 'From a Corsican backwater to master of Europe and back to a rock in the South Atlantic — the most improbable arc in modern history.',
  stops: [
    { name: 'Ajaccio, Corsica', coords: { lat: 41.9192, lng: 8.7386 }, date: 'Aug 1769',
      story: 'Napoleone di Buonaparte is born into minor Corsican nobility, a year after France buys the island from Genoa. He grows up speaking Italian and resenting the French.' },
    { name: 'Brienne-le-Château', coords: { lat: 48.3922, lng: 4.5269 }, date: '1779',
      story: 'A nine-year-old scholarship boy at a French military school, mocked for his accent and his poverty. He buries himself in mathematics, history — and Plutarch.' },
    { name: 'Toulon', coords: { lat: 43.1242, lng: 5.928 }, date: 'Dec 1793',
      story: 'A 24-year-old artillery captain devises the plan that breaks the Anglo-Royalist siege. Promoted to brigadier general on the spot, he is suddenly a name in Paris.' },
    { name: 'Paris — 13 Vendémiaire', coords: { lat: 48.8666, lng: 2.3333 }, date: 'Oct 1795',
      story: 'Royalist crowds march on the Convention; Napoleon disperses them with cannon fire — the "whiff of grapeshot." The Republic now owes him.' },
    { name: 'Lodi', coords: { lat: 45.3138, lng: 9.5034 }, date: 'May 1796',
      story: 'Storming the bridge at Lodi during the Italian campaign, he leads from the front. His soldiers nickname him le petit caporal — and he begins to believe he is destined for more.' },
    { name: 'Cairo', coords: { lat: 30.0444, lng: 31.2357 }, date: 'Jul 1798',
      story: '"Soldiers, from the height of these pyramids, forty centuries look down upon you." The Egyptian expedition is a strategic failure and a propaganda triumph.',
      camera: { altitude: 0.12 } },
    { name: 'Saint-Cloud — 18 Brumaire', coords: { lat: 48.843, lng: 2.219 }, date: 'Nov 1799',
      story: 'A rushed, nearly botched coup makes him First Consul. The Revolution is over; at thirty, Napoleon rules France.' },
    { name: 'Notre-Dame de Paris', coords: { lat: 48.853, lng: 2.3499 }, date: 'Dec 1804',
      story: 'In front of the Pope, he takes the crown and places it on his own head. Emperor of the French — by his own hand.' },
    { name: 'Austerlitz', coords: { lat: 49.1281, lng: 16.7625 }, date: 'Dec 1805',
      story: 'His masterpiece. Outnumbered, he feigns weakness, surrenders the high ground, and destroys a Russo-Austrian army in a single morning.',
      battle: {
        name: 'Battle of Austerlitz', date: '2 December 1805',
        phases: [
          { caption: 'The trap is set: Napoleon deliberately abandons the Pratzen Heights and weakens his right flank, inviting attack.',
            duration: 7,
            movements: [
              { side: 'french', style: 'feint', path: [{ lat: 49.128, lng: 16.762 }, { lat: 49.13, lng: 16.69 }] },
            ] },
          { caption: 'The Allies take the bait: their columns pour south off the heights to envelop the French right, where Davout’s corps arrives after a forced march to hold the line.',
            duration: 8,
            movements: [
              { side: 'coalition', style: 'advance', path: [{ lat: 49.128, lng: 16.762 }, { lat: 49.1, lng: 16.73 }, { lat: 49.09, lng: 16.705 }] },
              { side: 'french', style: 'advance', path: [{ lat: 49.06, lng: 16.65 }, { lat: 49.088, lng: 16.7 }] },
            ] },
          { caption: 'The masterstroke: as fog lifts under the "Sun of Austerlitz," Soult’s corps storms the emptied Pratzen Heights and splits the Allied army in two.',
            duration: 7,
            movements: [
              { side: 'french', style: 'advance', path: [{ lat: 49.125, lng: 16.7 }, { lat: 49.128, lng: 16.762 }] },
            ] },
          { caption: 'The rout: the French wheel south from the heights; the Allied left collapses and flees across the frozen Satschan ponds.',
            duration: 8,
            movements: [
              { side: 'french', style: 'advance', path: [{ lat: 49.128, lng: 16.762 }, { lat: 49.095, lng: 16.74 }] },
              { side: 'coalition', style: 'retreat', path: [{ lat: 49.09, lng: 16.72 }, { lat: 49.07, lng: 16.74 }] },
            ] },
        ],
      } },
    { name: 'Moscow', coords: { lat: 55.7558, lng: 37.6173 }, date: 'Sep 1812',
      story: 'He enters Moscow expecting surrender and finds it burning and empty. The retreat that follows destroys the Grande Armée — of 600,000 men, fewer than 100,000 return.',
      camera: { altitude: 0.2 } },
    { name: 'Leipzig', coords: { lat: 51.3397, lng: 12.3731 }, date: 'Oct 1813',
      story: 'The Battle of the Nations: outnumbered two to one by a united Europe, he is decisively beaten for the first time. France itself is now the battlefield.' },
    { name: 'Elba', coords: { lat: 42.8016, lng: 10.317 }, date: 'May 1814',
      story: 'Exiled as "Emperor" of a tiny Mediterranean island, he reorganizes its iron mines and roads — then, after ten months, slips past his jailers with a thousand men.' },
    { name: 'Waterloo', coords: { lat: 50.68, lng: 4.412 }, date: 'Jun 1815',
      story: 'The Hundred Days end in a sodden Belgian field. Wellington holds, Blücher arrives, and by nightfall the empire is finished forever.' },
    { name: 'Saint Helena', coords: { lat: -15.965, lng: -5.7089 }, date: '1815–1821',
      story: 'On a volcanic rock 2,000 km from anywhere, he dictates his memoirs and refights his battles for posterity. He dies in May 1821, aged 51.',
      camera: { altitude: 0.25 } },
  ],
}
```

And `src/journeys/index.ts`:

```ts
import type { Journey } from '../data/schema'
import { napoleon } from './napoleon'

export const journeys: Journey[] = [napoleon]
export const journeyById = (id: string): Journey | undefined => journeys.find((j) => j.id === id)
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run src/data/journeys.test.ts` → all pass.
- [ ] **Step 5: Commit** — `git commit -am "feat: napoleon journey content with austerlitz battle"`

---

### Task 4: Scroll → camera mapping (pure)

**Files:** Create: `src/lib/journeyCamera.ts`, Test: `src/lib/journeyCamera.test.ts`.

Model: a journey with N stops has N equal scroll segments. Within segment `i`: first `DWELL = 0.4` is a hold at stop `i` (card visible), the rest travels toward stop `i+1`. The final segment is all dwell. Card opacity ramps over the first/last 25% of each dwell window.

- [ ] **Step 1: Write failing tests** — `src/lib/journeyCamera.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { cameraAt, DWELL } from './journeyCamera'

const stops = [
  { lat: 0, lng: 0 },   // A
  { lat: 0, lng: 90 },  // B
  { lat: 45, lng: 90 }, // C
]

describe('cameraAt', () => {
  it('t=0 dwells at the first stop', () => {
    const s = cameraAt(0, stops)
    expect(s.lat).toBeCloseTo(0); expect(s.lng).toBeCloseTo(0)
    expect(s.activeStop).toBe(0)
  })
  it('t=1 dwells at the last stop', () => {
    const s = cameraAt(1, stops)
    expect(s.lat).toBeCloseTo(45); expect(s.lng).toBeCloseTo(90)
    expect(s.activeStop).toBe(2)
  })
  it('mid-travel sits between stops with no active card', () => {
    // segment 0 travel midpoint: t = (DWELL + 1) / 2 / 3
    const s = cameraAt(((DWELL + 1) / 2) / 3, stops)
    expect(s.lng).toBeGreaterThan(10); expect(s.lng).toBeLessThan(80)
    expect(s.activeStop).toBeNull()
    expect(s.altitude).toBeGreaterThan(cameraAt(0, stops).altitude) // cruises higher than dwell
  })
  it('card opacity is 1 mid-dwell and 0 mid-travel', () => {
    expect(cameraAt(DWELL / 2 / 3, stops).cardOpacity).toBe(1)
    expect(cameraAt(((DWELL + 1) / 2) / 3, stops).cardOpacity).toBe(0)
  })
  it('clamps t outside [0,1]', () => {
    expect(cameraAt(-0.5, stops).activeStop).toBe(0)
    expect(cameraAt(1.5, stops).activeStop).toBe(2)
  })
})
```

- [ ] **Step 2: Run, verify fail.** `npx vitest run src/lib/journeyCamera.test.ts`

- [ ] **Step 3: Implement** — `src/lib/journeyCamera.ts`

```ts
import { latLngToVector3, slerpUnit } from './geo'
import type { LatLng } from '../data/schema'

export const DWELL = 0.4
export const DWELL_ALT = 0.09   // ~570 km — city framing
export const CRUISE_ALT = 0.45  // pulled out for travel

export interface CameraState {
  lat: number
  lng: number
  altitude: number
  activeStop: number | null
  cardOpacity: number
}

function vecToLatLng(v: { x: number; y: number; z: number }): LatLng {
  const lat = 90 - (Math.acos(v.y) * 180) / Math.PI
  const lng = ((Math.atan2(v.z, -v.x) * 180) / Math.PI) - 180
  return { lat, lng: ((lng + 540) % 360) - 180 }
}

const ease = (t: number) => t * t * (3 - 2 * t) // smoothstep

export function cameraAt(
  t: number,
  stops: Array<LatLng & { camera?: { altitude: number } }>,
): CameraState {
  const n = stops.length
  const tc = Math.min(1, Math.max(0, t))
  const seg = Math.min(n - 1, Math.floor(tc * n))
  const local = tc * n - seg
  const stop = stops[seg]
  const dwellAlt = stop.camera?.altitude ?? DWELL_ALT
  const isLast = seg === n - 1

  if (isLast || local < DWELL) {
    const d = isLast ? local : local / DWELL // 0..1 through the dwell window
    const fadeIn = Math.min(1, d / 0.25)
    const fadeOut = isLast ? 1 : Math.min(1, (1 - d) / 0.25)
    return { lat: stop.lat, lng: stop.lng, altitude: dwellAlt, activeStop: seg,
      cardOpacity: Math.min(fadeIn, fadeOut) }
  }

  const next = stops[seg + 1]
  const tt = ease((local - DWELL) / (1 - DWELL))
  const p = slerpUnit(
    latLngToVector3(stop.lat, stop.lng).normalize(),
    latLngToVector3(next.lat, next.lng).normalize(),
    tt,
  )
  const nextAlt = next.camera?.altitude ?? DWELL_ALT
  const base = tt < 0.5 ? dwellAlt : nextAlt
  const altitude = base + (CRUISE_ALT - base) * Math.sin(Math.PI * tt)
  const { lat, lng } = vecToLatLng(p)
  return { lat, lng, altitude, activeStop: null, cardOpacity: 0 }
}
```

- [ ] **Step 4: Run, verify pass.** All 5 pass. If `vecToLatLng` sign conventions fail the mid-travel test, fix the math until `latLngToVector3(vecToLatLng(v)) ≈ v` — add a round-trip test rather than fudging signs.
- [ ] **Step 5: Commit** — `git commit -am "feat: scroll-to-camera mapping with dwell windows"`

---

### Task 5: Battle playback (pure)

**Files:** Create: `src/lib/battlePlayback.ts`, Test: `src/lib/battlePlayback.test.ts`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_PHASE_SECONDS, playbackAt, totalDuration } from './battlePlayback'

const battle = {
  name: 'B', date: 'd',
  phases: [
    { caption: 'p0', duration: 4, movements: [] as never[] },
    { caption: 'p1', movements: [] as never[] }, // default duration
  ],
} as never

describe('playbackAt', () => {
  it('starts in phase 0', () => {
    expect(playbackAt(battle, 0)).toEqual({ phaseIndex: 0, phaseProgress: 0, done: false })
  })
  it('progresses within a phase', () => {
    expect(playbackAt(battle, 2).phaseProgress).toBeCloseTo(0.5)
  })
  it('advances to the next phase using default duration', () => {
    const s = playbackAt(battle, 4 + DEFAULT_PHASE_SECONDS / 2)
    expect(s.phaseIndex).toBe(1); expect(s.phaseProgress).toBeCloseTo(0.5)
  })
  it('reports done at the end and clamps', () => {
    const s = playbackAt(battle, 999)
    expect(s.done).toBe(true); expect(s.phaseIndex).toBe(1); expect(s.phaseProgress).toBe(1)
  })
  it('totalDuration sums phase durations', () => {
    expect(totalDuration(battle)).toBe(4 + DEFAULT_PHASE_SECONDS)
  })
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** — `src/lib/battlePlayback.ts`

```ts
import type { Battle } from '../data/schema'

// Deliberate simplification vs spec ("proportional to path length"): a flat default.
// Austerlitz sets explicit durations anyway; revisit if a future battle omits them.
export const DEFAULT_PHASE_SECONDS = 6

export interface PlaybackState { phaseIndex: number; phaseProgress: number; done: boolean }

export const phaseSeconds = (b: Battle): number[] =>
  b.phases.map((p) => p.duration ?? DEFAULT_PHASE_SECONDS)

export const totalDuration = (b: Battle): number =>
  phaseSeconds(b).reduce((a, x) => a + x, 0)

export function playbackAt(b: Battle, elapsed: number): PlaybackState {
  const durs = phaseSeconds(b)
  let t = Math.max(0, elapsed)
  for (let i = 0; i < durs.length; i++) {
    if (t < durs[i]) return { phaseIndex: i, phaseProgress: t / durs[i], done: false }
    t -= durs[i]
  }
  return { phaseIndex: durs.length - 1, phaseProgress: 1, done: true }
}
```

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: battle phase playback timing"`

---

### Task 6: App state store

**Files:** Create: `src/state/store.ts`, Test: `src/state/store.test.ts`.

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('app store', () => {
  beforeEach(() => useAppStore.getState().reset())

  it('starts in hub mode', () => {
    expect(useAppStore.getState().mode).toBe('hub')
  })
  it('enterJourney sets mode and journey id', () => {
    useAppStore.getState().enterJourney('napoleon')
    const s = useAppStore.getState()
    expect(s.mode).toBe('journey'); expect(s.journeyId).toBe('napoleon'); expect(s.scrollT).toBe(0)
  })
  it('enterBattle saves scroll position; exitBattle restores mode', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().setScrollT(0.57)
    useAppStore.getState().enterBattle(8)
    let s = useAppStore.getState()
    expect(s.mode).toBe('battle'); expect(s.battleStopIndex).toBe(8); expect(s.battleElapsed).toBe(0)
    useAppStore.getState().exitBattle()
    s = useAppStore.getState()
    expect(s.mode).toBe('journey'); expect(s.scrollT).toBe(0.57)
  })
  it('exitJourney returns to hub', () => {
    useAppStore.getState().enterJourney('napoleon')
    useAppStore.getState().exitJourney()
    expect(useAppStore.getState().mode).toBe('hub')
  })
})
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** — `src/state/store.ts`

```ts
import { create } from 'zustand'

export type Mode = 'hub' | 'journey' | 'battle'

interface AppState {
  mode: Mode
  journeyId: string | null
  scrollT: number
  battleStopIndex: number | null
  battleElapsed: number
  battlePlaying: boolean
  enterJourney: (id: string) => void
  exitJourney: () => void
  setScrollT: (t: number) => void
  enterBattle: (stopIndex: number) => void
  exitBattle: () => void
  setBattleElapsed: (s: number) => void
  setBattlePlaying: (p: boolean) => void
  reset: () => void
}

const initial = {
  mode: 'hub' as Mode, journeyId: null, scrollT: 0,
  battleStopIndex: null, battleElapsed: 0, battlePlaying: false,
}

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  enterJourney: (id) => set({ mode: 'journey', journeyId: id, scrollT: 0 }),
  exitJourney: () => set({ ...initial }),
  setScrollT: (scrollT) => set({ scrollT }),
  enterBattle: (battleStopIndex) =>
    set({ mode: 'battle', battleStopIndex, battleElapsed: 0, battlePlaying: true }),
  exitBattle: () => set({ mode: 'journey', battleStopIndex: null, battlePlaying: false }),
  setBattleElapsed: (battleElapsed) => set({ battleElapsed }),
  setBattlePlaying: (battlePlaying) => set({ battlePlaying }),
  reset: () => set({ ...initial }),
}))
```

Note: `enterBattle` doesn't touch `scrollT`, so exiting battle naturally restores the story position — the test above proves it.

- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "feat: app mode state store"`

---

### Task 7: Globe scene — sphere, atmosphere, starfield

**Files:** Create: `src/scene/GlobeScene.tsx`, `src/scene/Globe.tsx`, `src/scene/Atmosphere.tsx`, `src/scene/Starfield.tsx`. Modify: `src/App.tsx`, `src/main.tsx`.

- [ ] **Step 1: Implement Globe with sepia shader** — `src/scene/Globe.tsx`

```tsx
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { GLOBE_RADIUS } from '../lib/geo'

const vertex = /* glsl */ `
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vViewDir = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`

const fragment = /* glsl */ `
  uniform sampler2D uMap; uniform float uSepia;
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewDir;
  void main() {
    vec3 tex = texture2D(uMap, vUv).rgb;
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(1.25, 1.02, 0.76) * lum;
    vec3 color = mix(tex, sepia, uSepia);
    float facing = dot(normalize(vNormal), normalize(vViewDir));
    color *= 0.45 + 0.55 * smoothstep(0.0, 0.5, facing); // limb darkening
    gl_FragColor = vec4(color, 1.0);
  }`

export function Globe({ radius = GLOBE_RADIUS }: { radius?: number }) {
  const map = useTexture('/textures/earth-blue-marble.jpg')
  map.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh>
      <sphereGeometry args={[radius, 96, 96]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment}
        uniforms={{ uMap: { value: map }, uSepia: { value: 0.82 } }} />
    </mesh>
  )
}
```

- [ ] **Step 2: Atmosphere + starfield** — `src/scene/Atmosphere.tsx`:

```tsx
import { GLOBE_RADIUS } from '../lib/geo'

const vertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const fragment = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(vec3(0.91, 0.71, 0.29) * intensity, intensity);
  }`

export function Atmosphere() {
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment}
        side={2 /* THREE.BackSide */} transparent depthWrite={false} blending={2 /* AdditiveBlending */} />
    </mesh>
  )
}
```

`src/scene/Starfield.tsx` — 600 points on a far sphere (radius ~40), seeded deterministic positions (`Math.sin(i * 12.9898) * 43758.5453` style hash, no `Math.random` so React strict re-mounts look identical), `pointsMaterial size={0.06} color="#cbbf9f" sizeAttenuation transparent opacity={0.7}`.

- [ ] **Step 3: Canvas root** — `src/scene/GlobeScene.tsx`:

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { Atmosphere } from './Atmosphere'
import { Globe } from './Globe'
import { Starfield } from './Starfield'

export function GlobeScene() {
  return (
    <div className="canvas-fixed">
      {/* near must be far smaller than default 0.1: dwell camera sits 0.09 above the
          surface and battle mode 0.012 — default near clips the globe entirely.
          logarithmicDepthBuffer compensates for the depth precision loss. */}
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.4, 2.8], fov: 45, near: 0.0008, far: 100 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}>
        <color attach="background" args={['#0a0805']} />
        <Suspense fallback={null}>
          <Globe />
          <Atmosphere />
          <Starfield />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.4}
          autoRotate autoRotateSpeed={0.35} />
      </Canvas>
    </div>
  )
}
```

(OrbitControls is temporary hub interaction; CameraRig replaces/wraps it in Task 9.)

Wire `App.tsx` to render `<GlobeScene />` and `main.tsx` to import `./styles.css`.

- [ ] **Step 4: Visual verify** — `npm run dev`. Expect: sepia earth in dark void, warm gold rim glow, faint stars, drag rotates. No console errors. Tune `uSepia`/atmosphere constants only if obviously broken (full tuning later).
- [ ] **Step 5: Commit** — `git commit -am "feat: sepia globe, atmosphere, starfield"`

---

### Task 8: Route arcs and stop markers

**Files:** Create: `src/scene/RouteArcs.tsx`. Modify: `src/scene/GlobeScene.tsx`.

- [ ] **Step 1: Implement** — `src/scene/RouteArcs.tsx`

```tsx
import { useMemo } from 'react'
import * as THREE from 'three'
import type { Journey } from '../data/schema'
import { greatCirclePoints, latLngToVector3 } from '../lib/geo'

/** progress: 0..1 portion of the route drawn solid (1 = all). dim: hub-mode faintness. */
export function RouteArcs({ journey, progress = 1, dim = false }:
  { journey: Journey; progress?: number; dim?: boolean }) {
  const { curve, totalLen } = useMemo(() => {
    const pts = journey.stops.slice(0, -1).flatMap((s, i) =>
      greatCirclePoints(s.coords, journey.stops[i + 1].coords, 48).slice(i ? 1 : 0))
    const curve = new THREE.CatmullRomCurve3(pts)
    return { curve, totalLen: pts.length }
  }, [journey])

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, totalLen * 2, 0.0035, 8, false),
    [curve, totalLen])

  // TubeGeometry index count scales linearly with tubularSegments — drawRange clips the head.
  const indexCount = geometry.index!.count
  geometry.setDrawRange(0, Math.floor(indexCount * Math.min(1, Math.max(0, progress))))

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={journey.color} transparent
          opacity={dim ? 0.25 : 1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {journey.stops.map((s, i) => (
        <mesh key={i} position={latLngToVector3(s.coords.lat, s.coords.lng, 1.004)}>
          <sphereGeometry args={[0.008, 16, 16]} />
          <meshBasicMaterial color={journey.color} transparent opacity={dim ? 0.4 : 1} />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Add to scene** — in `GlobeScene`, render `{journeys.map((j) => <RouteArcs key={j.id} journey={j} dim />)}` inside Suspense.
- [ ] **Step 3: Visual verify** — `npm run dev`: a faint gold route threads Corsica → Paris → Cairo → Moscow → St. Helena; markers at each stop; arcs lift off the surface on long hops. Set `dim={false}` temporarily and `progress={0.5}` to confirm the partial-draw works; revert.
- [ ] **Step 4: Commit** — `git commit -am "feat: route arcs with progressive draw and stop markers"`

---

### Task 9: CameraRig

**Files:** Create: `src/scene/CameraRig.tsx`. Modify: `src/scene/GlobeScene.tsx` (remove OrbitControls usage in journey/battle modes).

The rig derives a **target** (camera position + lookAt) from store state every frame and damps toward it. Transitions (hub→journey, stop→battle) need no special-case animation code — damping does the flying.

- [ ] **Step 1: Implement** — `src/scene/CameraRig.tsx`

```tsx
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { journeyById } from '../journeys'
import { cameraAt } from '../lib/journeyCamera'
import { latLngToVector3 } from '../lib/geo'
import { useAppStore } from '../state/store'

const HUB_POS = new THREE.Vector3(0, 0.4, 2.8)
const ORIGIN = new THREE.Vector3(0, 0, 0)
const BATTLE_ALT = 0.012 // ~75 km bird's-eye over the battlefield

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const targetPos = useRef(HUB_POS.clone())
  const targetLook = useRef(ORIGIN.clone())
  const look = useRef(ORIGIN.clone())

  useFrame((_, dt) => {
    const { mode, journeyId, scrollT, battleStopIndex } = useAppStore.getState()
    const journey = journeyId ? journeyById(journeyId) : null

    if (mode === 'hub' || !journey) {
      targetPos.current.copy(HUB_POS)
      targetLook.current.copy(ORIGIN)
    } else if (mode === 'journey') {
      const c = cameraAt(scrollT, journey.stops.map((s) => ({ ...s.coords, camera: s.camera })))
      targetPos.current.copy(latLngToVector3(c.lat, c.lng, 1 + c.altitude))
      targetLook.current.copy(ORIGIN)
    } else if (mode === 'battle' && battleStopIndex != null) {
      const site = journey.stops[battleStopIndex].coords
      targetPos.current.copy(latLngToVector3(site.lat, site.lng, 1 + BATTLE_ALT))
      targetLook.current.copy(latLngToVector3(site.lat, site.lng, 1)) // straight down
    }

    const k = 3.2 // damping stiffness
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, k, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, k, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, k, dt)
    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.current.x, k, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.current.y, k, dt)
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.current.z, k, dt)
    camera.up.set(0, 1, 0)
    camera.lookAt(look.current)
  })
  return null
}
```

- [ ] **Step 2: Wire into scene** — add `<CameraRig />` inside Canvas; render `<OrbitControls ... />` **only when** `mode === 'hub'` (subscribe with `useAppStore((s) => s.mode)`).
- [ ] **Step 3: Visual verify** — in dev tools console: `useAppStore.getState().enterJourney('napoleon')` (export the store to `window` in dev: `if (import.meta.env.DEV) (window as any).appStore = useAppStore`). Camera should fly smoothly from hub framing down to Ajaccio. Then `appStore.getState().setScrollT(0.5)` → flies along the route. `exitJourney()` → returns to hub.
- [ ] **Step 4: Commit** — `git commit -am "feat: damped camera rig driven by app state"`

---

### Task 10: Post-processing — bloom and parchment grade

**Files:** Create: `src/scene/Effects.tsx`. Modify: `src/scene/GlobeScene.tsx`.

- [ ] **Step 1: Implement** — `src/scene/Effects.tsx`

```tsx
import { Bloom, EffectComposer, Noise, Sepia, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export function Effects() {
  return (
    <EffectComposer>
      <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
      <Sepia intensity={0.25} />
      <Vignette eskil={false} offset={0.18} darkness={0.85} />
      <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  )
}
```

- [ ] **Step 2: Add `<Effects />`** at the end of the Canvas children.
- [ ] **Step 3: Visual verify** — routes/markers now glow (bloom catches the additive gold); whole frame is warm with grain and vignette — compare against the C2 mockup vibe (`.superpowers/brainstorm/*/globe-style-v2.html`). Check frame rate stays smooth while dragging.
- [ ] **Step 4: Commit** — `git commit -am "feat: bloom + parchment post grade"`

---

### Task 11: Routing, Hub overlay

**Files:** Create: `src/ui/Hub.tsx`. Modify: `src/App.tsx`, `src/main.tsx`.

- [ ] **Step 1: Routes** — `main.tsx` wraps `<App />` in `<BrowserRouter>`. `App.tsx`:

```tsx
import { Route, Routes } from 'react-router-dom'
import { GlobeScene } from './scene/GlobeScene'
import { Hub } from './ui/Hub'
import { JourneyRoute } from './ui/JourneyStory'

export default function App() {
  return (
    <>
      <GlobeScene />
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/:journeyId" element={<JourneyRoute />} />
      </Routes>
    </>
  )
}
```

(Create a placeholder `JourneyRoute` exporting `null` for now; Task 12 fills it.)

- [ ] **Step 2: Hub overlay** — `src/ui/Hub.tsx`

```tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { journeys } from '../journeys'
import { useAppStore } from '../state/store'

export function Hub() {
  const exitJourney = useAppStore((s) => s.exitJourney)
  useEffect(() => { exitJourney() }, [exitJourney]) // arriving at / always resets to hub mode

  return (
    <div className="overlay hub">
      <h1>Paths of History</h1>
      <p className="tagline">Journeys of historical figures, told on the globe.</p>
      <nav>
        {journeys.map((j) => (
          <Link key={j.id} to={`/${j.id}`} className="journey-link">
            <span className="journey-title">{j.title}</span>
            <span className="journey-meta">{j.figure} · {j.years}</span>
            <span className="journey-intro">{j.intro}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
```

Add to `styles.css`: `.hub { left: 4rem; top: 20vh; max-width: 26rem; }`, gold-on-dark serif styling, `.journey-link { display:block; padding:1rem; border:1px solid rgba(232,181,74,.35); border-radius:6px; background:rgba(20,16,10,.7); color:inherit; text-decoration:none; }` with a hover state brightening the border. (Hover→route-highlight on the globe: set a `hoveredJourneyId` in the store and pass `dim={hovered !== j.id}` in GlobeScene — 5 lines, do it.)

- [ ] **Step 3: Visual verify** — `/` shows title + Napoleon card over the globe; hover brightens his route; click navigates to `/napoleon` (blank overlay for now, camera doesn't move yet — fine).
- [ ] **Step 4: Commit** — `git commit -am "feat: routing and hub overlay"`

---

### Task 12: Journey scroll story

**Files:** Create: `src/ui/JourneyStory.tsx`, `src/hooks/useScrollProgress.ts`. Modify: `src/scene/GlobeScene.tsx` (active-journey arcs full-glow + progressive draw).

- [ ] **Step 1: Scroll hook** — `src/hooks/useScrollProgress.ts`

```ts
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'
import { useAppStore } from '../state/store'

gsap.registerPlugin(ScrollTrigger)

/** Maps document scroll over the journey container to store.scrollT (0..1). */
export function useScrollProgress(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => useAppStore.getState().setScrollT(self.progress),
    })
    return () => st.kill()
  }, [containerRef])
}
```

- [ ] **Step 2: Journey route + cards** — `src/ui/JourneyStory.tsx`

```tsx
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { journeyById } from '../journeys'
import { cameraAt } from '../lib/journeyCamera'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useAppStore } from '../state/store'

export function JourneyRoute() {
  const { journeyId } = useParams()
  const journey = journeyId ? journeyById(journeyId) : undefined
  if (!journey) return <div className="overlay hub"><h1>Unknown journey</h1><Link to="/">← Back</Link></div>
  return <JourneyStory journey={journey} />
}

function JourneyStory({ journey }: { journey: NonNullable<ReturnType<typeof journeyById>> }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const enterJourney = useAppStore((s) => s.enterJourney)
  const enterBattle = useAppStore((s) => s.enterBattle)
  const mode = useAppStore((s) => s.mode)
  const scrollT = useAppStore((s) => s.scrollT)

  useEffect(() => { enterJourney(journey.id); window.scrollTo(0, 0) }, [journey.id, enterJourney])
  useScrollProgress(containerRef)

  const cam = cameraAt(scrollT, journey.stops.map((s) => ({ ...s.coords, camera: s.camera })))
  const stop = cam.activeStop != null ? journey.stops[cam.activeStop] : null

  return (
    <div ref={containerRef} style={{ height: `${journey.stops.length * 100}vh`, position: 'relative' }}>
      <header className="overlay journey-header">
        <span>{journey.title}</span>
        <Link to="/" aria-label="Back to globe">✕</Link>
      </header>
      {stop && mode === 'journey' && (
        <article className="overlay story-card" style={{ opacity: cam.cardOpacity }}>
          <div className="card-date">{stop.date}</div>
          <h3>{stop.name}</h3>
          <p>{stop.story}</p>
          {stop.battle && (
            <button className="battle-button" onClick={() => enterBattle(cam.activeStop!)}>
              ⚔ Witness the battle
            </button>
          )}
        </article>
      )}
    </div>
  )
}
```

Styles: `.journey-header { top:0; left:0; right:0; display:flex; justify-content:space-between; padding:1.2rem 2rem; }`, `.story-card { right:4rem; top:30vh; width:21rem; background:rgba(20,16,10,.88); border:1px solid rgba(232,181,74,.35); border-radius:6px; padding:1.4rem; backdrop-filter:blur(4px); transition:opacity .2s; }`, `.card-date { font-size:.7rem; letter-spacing:.2em; text-transform:uppercase; color:#c9a050; }`.

- [ ] **Step 3: Wire active journey into GlobeScene** — for the active journey render **two** arc layers: a full-length dim one underneath (`<RouteArcs journey dim />`, the spec's "faint ahead") and the progressive bright one on top (`dim={false} progress={scrollT}` — `cameraAt`'s piecewise t maps closely enough to route fraction for v1); inactive journeys stay dim only. Read `journeyId`/`mode` via React subscription, but read `scrollT` imperatively (`useAppStore.getState()` inside `useFrame`, updating `drawRange` directly) so scroll doesn't re-render the React tree every frame. Also pass the active stop index to `RouteArcs` and pulse that marker's scale in a `useFrame` (`1 + 0.3 * Math.sin(clock.elapsedTime * 3)`) — the spec's "active stop pulses".

- [ ] **Step 4: Dev jump param** — in `JourneyStory`, on mount read `new URLSearchParams(location.search).get('stop')`; if present, `window.scrollTo(0, (n / stops.length) * (container.scrollHeight - innerHeight))` after layout. Guard with `import.meta.env.DEV`.

- [ ] **Step 4b: Journey outro** — after the scroll container, a final 60vh section: "{figure}, {years}" epitaph line and a "← Back to the globe" link to `/`. Deliberate deviation from the spec's "scrolling past the end exits": an explicit link avoids surprise navigation; the outro IS the past-the-end state.

- [ ] **Step 5: Visual verify** — `/napoleon`: camera flies to Ajaccio, card fades in. Scrolling: card fades out → camera cruises along the gold arc (drawing as it goes) → descends into Brienne → next card. Scroll up rewinds. Austerlitz card (`?stop=8`) shows the ⚔ button. `✕` returns to the spinning hub. **This is the core feel — spend time scrubbing here; tune `DWELL`, `CRUISE_ALT`, damping `k` if motion feels wrong, and note tuned values in the commit message.**
- [ ] **Step 6: Commit** — `git commit -am "feat: scroll-driven journey story with cards"`

---

### Task 13: Battle mode — overlay, scroll lock, playback UI

**Files:** Create: `src/ui/BattleOverlay.tsx`. Modify: `src/ui/JourneyStory.tsx` (render overlay; lock scroll).

No terrain yet — this task proves the modal state, dive, captions, and scrubber over the plain globe (which is also the degrade path when tiles fail).

- [ ] **Step 1: Scroll lock** — in `JourneyStory`, `useEffect` on `mode`: when `'battle'`, save `window.scrollY` to a ref and set `document.body.style.overflow = 'hidden'`; on exit restore overflow and `window.scrollTo(0, saved)`. (The store already preserves `scrollT`; this preserves the actual pixel position.)

- [ ] **Step 2: Battle overlay** — `src/ui/BattleOverlay.tsx`

```tsx
import { useEffect } from 'react'
import { playbackAt, totalDuration } from '../lib/battlePlayback'
import type { Battle } from '../data/schema'
import { useAppStore } from '../state/store'

export function BattleOverlay({ battle }: { battle: Battle }) {
  const { battleElapsed, battlePlaying, setBattleElapsed, setBattlePlaying, exitBattle } =
    useAppStore()
  const total = totalDuration(battle)
  const { phaseIndex, done } = playbackAt(battle, battleElapsed)

  useEffect(() => {
    if (!battlePlaying) return
    let raf: number, last = performance.now()
    const tick = (now: number) => {
      const { battleElapsed: e } = useAppStore.getState()
      const next = Math.min(total, e + (now - last) / 1000)
      last = now
      setBattleElapsed(next)
      if (next < total) raf = requestAnimationFrame(tick)
      else setBattlePlaying(false)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [battlePlaying, total, setBattleElapsed, setBattlePlaying])

  return (
    <div className="overlay battle-overlay">
      <header>
        <h3>{battle.name}</h3>
        <div className="card-date">{battle.date} · Phase {phaseIndex + 1} of {battle.phases.length}</div>
        <button onClick={exitBattle} aria-label="Exit battle">✕</button>
      </header>
      <footer>
        <button onClick={() => done ? (setBattleElapsed(0), setBattlePlaying(true))
                                    : setBattlePlaying(!battlePlaying)}>
          {done ? '↻' : battlePlaying ? '❚❚' : '▶'}
        </button>
        <input type="range" min={0} max={total} step={0.05} value={battleElapsed}
          onChange={(e) => { setBattlePlaying(false); setBattleElapsed(Number(e.target.value)) }} />
        <p className="battle-caption">{battle.phases[phaseIndex].caption}</p>
      </footer>
    </div>
  )
}
```

Render from `JourneyStory` when `mode === 'battle'` with the active stop's battle. Style footer as the parchment playback bar from the battle mockup (`.superpowers/brainstorm/*/battle-view.html`): bottom-anchored, caption italic serif.

Dev jump param (`import.meta.env.DEV` only): on `BattleOverlay` mount, if `?battle=<phaseIndex>` is present, `setBattleElapsed(sum of phaseSeconds up to that index)` and `setBattlePlaying(false)` — the tuning tool for Tasks 14–15.

- [ ] **Step 3: Visual verify** — `/napoleon?stop=8` → ⚔ → camera dives to bird's-eye over Austerlitz (blurry low-res globe, expected); page scroll locked; captions auto-advance through 4 phases; scrubber drags; pause works; ✕ returns to the story at the exact same scroll position with camera climbing back out.
- [ ] **Step 4: Commit** — `git commit -am "feat: battle mode with playback overlay and scroll lock"`

---

### Task 14: Battle arrows

**Files:** Create: `src/scene/BattleArrows.tsx`. Modify: `src/scene/GlobeScene.tsx`.

- [ ] **Step 1: Implement** — arrows are tubes (like routes, no lift, tiny radius) at `1.0008 * GLOBE_RADIUS`, drawn with `drawRange` by phase progress, plus a cone head at the current tip.

```tsx
import { useMemo } from 'react'
import * as THREE from 'three'
import type { Battle } from '../data/schema'
import { latLngToVector3, slerpUnit } from '../lib/geo'
import { playbackAt } from '../lib/battlePlayback'
import { useAppStore } from '../state/store'

const COLORS = { french: '#4d8fdb', coalition: '#c0392b' }
const ALT = 1.0008

function movementCurve(path: { lat: number; lng: number }[]) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = latLngToVector3(path[i].lat, path[i].lng).normalize()
    const b = latLngToVector3(path[i + 1].lat, path[i + 1].lng).normalize()
    for (let s = i ? 1 : 0; s <= 24; s++) pts.push(slerpUnit(a, b, s / 24).multiplyScalar(ALT))
  }
  return new THREE.CatmullRomCurve3(pts)
}

export function BattleArrows({ battle }: { battle: Battle }) {
  const elapsed = useAppStore((s) => s.battleElapsed)
  const { phaseIndex, phaseProgress } = playbackAt(battle, elapsed)

  const phases = useMemo(() => battle.phases.map((p) => p.movements.map((m) => ({
    movement: m,
    curve: movementCurve(m.path),
    geometry: new THREE.TubeGeometry(movementCurve(m.path), 64, 0.00045, 6, false),
  }))), [battle])

  return (
    <group>
      {phases.map((movs, pi) => movs.map(({ movement, curve, geometry }, mi) => {
        const prog = pi < phaseIndex ? 1 : pi > phaseIndex ? 0 : phaseProgress
        if (prog === 0) return null
        geometry.setDrawRange(0, Math.floor(geometry.index!.count * prog))
        const tip = curve.getPointAt(Math.max(0.001, prog))
        const dir = curve.getTangentAt(Math.max(0.001, prog))
        const dashed = movement.style !== 'advance'
        return (
          <group key={`${pi}-${mi}`}>
            <mesh geometry={geometry}>
              <meshBasicMaterial color={COLORS[movement.side]} transparent
                opacity={dashed ? 0.65 : 0.95} depthTest={false} />
            </mesh>
            <mesh position={tip} quaternion={new THREE.Quaternion()
              .setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)}>
              <coneGeometry args={[0.0012, 0.003, 8]} />
              <meshBasicMaterial color={COLORS[movement.side]} depthTest={false} />
            </mesh>
          </group>
        )
      }))}
    </group>
  )
}
```

- [ ] **Step 2: Wire** — in `GlobeScene`, when `mode === 'battle'`, render `<BattleArrows battle={...} />` for the active stop's battle.
- [ ] **Step 3: Visual verify** — Austerlitz playback: blue feint retreats west in phase 1; phase 2 red columns flow south while blue (Davout) comes up; phase 3 blue storms the heights; phase 4 red retreat. Arrows draw in sync with the scrubber and survive scrubbing backwards. Sizes legible at `BATTLE_ALT` — adjust tube radius/cone size if not.
- [ ] **Step 4: Commit** — `git commit -am "feat: phased battle movement arrows"`

---

### Task 15: Streamed terrain (spike + integration)

**Files:** Create: `src/scene/TerrainLayer.tsx`, `.env.local` (gitignored), `.env.example`. Modify: `src/scene/GlobeScene.tsx`, `src/scene/Globe.tsx`.

**This is the riskiest task — timebox the spike to ~half a day before falling back.** Decision from spec: try **Google Photorealistic 3D Tiles** via NASA `3d-tiles-renderer` first; fall back to Cesium ion (`CesiumIonAuthPlugin`, asset 2275207 — Google tiles via ion — or World Terrain); if both fight back, ship the degrade path (battle over plain globe — already working since Task 13) and file a follow-up.

- [ ] **Step 1: Get a key** — Google Maps Platform → enable "Map Tiles API" → API key restricted to localhost + production domain. Put in `.env.local` as `VITE_TILES_KEY=...`; verify `.gitignore` covers `.env.local` (the Vite scaffold's ignore file may have replaced the repo's original — re-add `.superpowers/` and `.env*` if so); commit `.env.example` with the variable name only. **This needs the user — ask, don't fake it.**

- [ ] **Step 2: Spike `TerrainLayer`**

```tsx
import { lazy } from 'react' // lazy-load this module from GlobeScene via React.lazy + Suspense
import { TilesPlugin, TilesRenderer } from '3d-tiles-renderer/r3f'
import { GoogleCloudAuthPlugin, TileCompressionPlugin } from '3d-tiles-renderer/plugins'

const ECEF_TO_SCENE = 1 / 6378137 // meters → globe radii

export function TerrainLayer() {
  return (
    <group scale={ECEF_TO_SCENE} rotation={[-Math.PI / 2, 0, 0]}>
      <TilesRenderer errorTarget={16}>
        <TilesPlugin plugin={GoogleCloudAuthPlugin}
          args={{ apiToken: import.meta.env.VITE_TILES_KEY }} />
        <TilesPlugin plugin={TileCompressionPlugin} />
      </TilesRenderer>
    </group>
  )
}
```

**Alignment check (the fiddly part):** ECEF has +Z through the north pole and +X through (lat 0, lng 0); our scene has +Y north and `latLngToVector3(0,0) = (+1, 0, 0)`. `rotation={[-Math.PI/2, 0, 0]}` maps Z→Y; verify longitude alignment by rendering a debug marker at `latLngToVector3(48.85, 2.35, 1.001)` (Paris) and confirming the terrain under the camera at the Paris stop is actually Paris. If offset by 180° or mirrored, adjust the group's Y-rotation (`Math.PI`) — one of the four combinations `[-π/2, 0, 0|π]` × flip will line up. **Write the working rotation down in a code comment with the verification date.**

- [ ] **Step 3: Integrate with battle mode** — render `<Suspense fallback={null}><TerrainLayer /></Suspense>` only when `mode === 'battle'` **and** the key exists (`import.meta.env.VITE_TILES_KEY`). While terrain is mounted, shrink the globe sphere to `radius * 0.997` (pass a prop) so coincident surfaces don't z-fight; battle arrows already render with `depthTest={false}` so they stay visible over terrain.

- [ ] **Step 4: Verify** — battle dive now lands on real (parchment-graded, via Effects) terrain around Austerlitz; tiles refine as the camera settles; arrows drape legibly; exiting battle unmounts tiles and restores the sphere. Kill the network in dev tools and re-enter battle → graceful fallback to the plain globe, console warning only, no crash (wrap TilesRenderer in an error boundary that logs and renders null).
- [ ] **Step 5: Commit** — `git commit -am "feat: streamed 3d-tiles terrain for battle mode"`

---

### Task 16: Fallbacks and performance

**Files:** Create: `src/ui/NoWebGL.tsx`. Modify: `src/scene/GlobeScene.tsx`, `src/main.tsx`.

- [ ] **Step 1: WebGL detection** — at app boot (`main.tsx` or top of `App`), try `document.createElement('canvas').getContext('webgl2')`; if null, render `<NoWebGL />` (static dark page: title, one-line apology, a static screenshot placeholder) instead of the app.
- [ ] **Step 2: Context loss** — on the Canvas `gl` instance, listen for `webglcontextlost` (preventDefault + state flag), attempt one `webglcontextrestored` re-render; second loss → swap to `<NoWebGL />`.
- [ ] **Step 3: Perf knobs** — Canvas already capped at `dpr={[1, 2]}`. Add `frameloop="demand"`? **No** — the rig damps every frame; instead pause when hidden: `document.visibilitychange` → store flag → `frameloop` prop toggles `'always' | 'never'`. Low-end bloom drop: sample `dt` over the first 120 frames in CameraRig; if median > 22 ms, set a store flag that makes `Effects` render without `<Bloom>`.
- [ ] **Step 4: Verify** — simulate context loss (`gl.getExtension('WEBGL_lose_context').loseContext()` in console); tab-switch pauses rendering (check with the FPS meter); everything still works after restore.
- [ ] **Step 5: Commit** — `git commit -am "feat: webgl fallbacks and perf safeguards"`

---

### Task 17: Deploy

**Files:** Create: `vercel.json` (SPA rewrite).

- [ ] **Step 1:** `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` so `/napoleon` deep-links work.
- [ ] **Step 2:** `npm run build` → fix any TS errors → `npx vite preview` smoke test (hub, journey scroll, battle with key, deep link).
- [ ] **Step 3:** Push repo to personal GitHub (`bashd4` account — default `git@github.com:` remote is correct for personal): `gh repo create history-map --public --source=. --push` (confirm account with `gh auth status` first — must NOT be the ClaimKit account for a personal project; ask the user if unsure).
- [ ] **Step 4:** Deploy via Vercel skill/CLI (`vercel` → link → set `VITE_TILES_KEY` env var in Vercel dashboard → `vercel --prod`). Add the production domain to the Google API key's referrer restrictions.
- [ ] **Step 5:** Verify the production URL end-to-end on desktop + a phone. Commit any fixes; final commit `chore: production deploy config`.

---

## Execution Notes

- **Order matters:** Tasks 0–6 are foundation (all TDD, no visuals); 7–12 build the journey experience; 13–15 the battle; 16–17 hardening + ship. Don't reorder 15 before 13 — the degrade path doubles as the safety net for the spike.
- **Tuning checkpoints:** Tasks 12 (scroll feel) and 14 (arrow legibility) are feel work — budget human-in-the-loop review there; ask the user to scrub the journey and watch the battle before calling them done.
- **Content review:** After Task 3, show the user `napoleon.ts` for historical/editorial review.
- **User-blocking steps:** Task 15 Step 1 (API key) and Task 17 Steps 3–4 (GitHub/Vercel auth) need the user present.
