# History Map — Design Spec

**Date:** 2026-06-10
**Status:** Validated with user through brainstorming (including visual mockup selection)

## Summary

A public web experience: a beautiful, interactive three.js globe ("Google Earth vibes" with a vintage twist) on which the journeys of historical figures are told as scroll-driven cinematic stories. Some stops are battles, which can be entered and watched play out from a bird's-eye view over real terrain.

**v1 scope:** Napoleon's journey as the single launch journey, plus one battle (Austerlitz) as the test of the battle engine. The data model and hub support multiple journeys from day one; more figures (Darwin's Beagle voyage, Ibn Battuta, Magellan, Ulysses S. Grant) come later.

## Decisions Made (with user)

| Question | Decision |
|---|---|
| Core experience | Follow one journey at a time, story mode |
| Audience | Public side project (shareable URL, polished) |
| Content source | Hand-curated structured data files |
| Stack | three.js-heavy, custom globe (not a globe library, not CesiumJS) |
| Story mechanic | Cinematic scroll — scroll drives camera along route, cards fade in (mockup A) |
| Aesthetic | "Vintage Globe in Dark Space" (mockup C2): sepia earth floating in dark void, glowing gold routes, serif typography, dark-glass story cards |
| Landing | Spinnable globe hub — the globe is the menu; routes glow faintly, click to enter |
| Battle view | Continuous globe zoom into **real streamed terrain**, color-graded to parchment for theme and readability (mockup B + grade) |
| v1 scope | Napoleon's journey + 1 battle (Austerlitz) |

## Architecture

Fully static single-page app. **Vite + React + TypeScript + react-three-fiber (+ drei) + GSAP ScrollTrigger.** No backend; journeys are TypeScript data files compiled into the bundle. Deployed to Vercel. Repo on personal GitHub (`bashd4`).

Two screens share one persistent canvas (no remount between them):

- **Hub** — full-screen globe, slow idle rotation, drag to rotate. All journey routes glow faintly. Overlay lists journeys (left side, serif). Hover highlights a route and rotates the globe toward it; click fades the list and flies the camera into the journey's opening shot.
- **Journey** — tall scroll container (~`stops.length × 100vh`). Scroll progress drives the camera along the route. Story cards are DOM overlays that fade in/out per stop. Header with journey title + ✕ returns to hub; scrolling past the end also exits.
- **Battle mode** (entered from a battle stop) — scroll-driving pauses; camera dives to bird's-eye over real streamed terrain; battle phases play as animated arrows with captions and a phase scrubber. Exit returns to the scroll story at the same position.

### Components (isolation boundaries)

| Unit | Responsibility | Depends on |
|---|---|---|
| `GlobeScene` | R3F canvas: sepia sphere, atmosphere, starfield, arcs, markers. Renders props; knows nothing about journeys. | three.js/R3F |
| `CameraRig` | Owns the camera. API: `flyTo(lat, lng, altitude)`, `followPath(journey, t)`, `diveToBattle(site)`. The only mover of the camera. | GlobeScene |
| `useScrollProgress` | GSAP ScrollTrigger wrapper: scroll position → progress `t ∈ [0,1]` for the active journey. | GSAP |
| `TerrainLayer` | Streamed-tile terrain via NASA `3d-tiles-renderer` (Google Photorealistic 3D Tiles or Cesium ion World Terrain + imagery). Lazy-loaded; only journeys with battles ever import it. | 3d-tiles-renderer, tile API key |
| `BattlePlayback` | Phase sequencing, animated movement arrows draped on terrain, caption + scrubber UI. | TerrainLayer, CameraRig |
| `Hub` / `JourneyStory` | The two DOM overlays (journey list; story cards). | journey data |
| `journeys/` | Pure data, no code. | — |

### Rendering: two ranges, one grade

- **Far range** (hub + journey cruising): custom textured sphere. Blue-marble texture with sepia grade done **in the fragment shader** (tint, contrast lift, limb vignette) so it is tunable live. Atmosphere: larger back-facing sphere with fresnel falloff, warm gold rim. Background: near-black radial gradient + sparse static starfield.
- **Battle dive**: below a threshold altitude over a battle site, `TerrainLayer` tiles fade in under the camera and the custom sphere fades out. Same canvas, one continuous camera move.
- **Unified parchment grade**: a full-screen post-processing pass (sepia/warm grade + paper-grain vignette) over everything, so satellite terrain, globe, and arcs share one palette and close-range terrain reads "aged map," tuned so troop arrows stay readable.
- **Routes**: great-circle arcs computed between consecutive stops (not stored), lifted slightly off the surface, rendered as tube geometry. Active journey full glow (additive + bloom); inactive hub routes ~25% opacity. In story mode the arc draws progressively: solid behind the camera, faint/dashed ahead.
- **Stop markers**: small glowing discs; active stop pulses.

### Scroll choreography

- Scroll maps piecewise to stop segments. Within a segment the camera eases along the great-circle arc at cruising altitude, descending on arrival.
- Each stop has a **dwell window** (~40% of its segment): camera holds the framed shot, story card fully visible; cards fade at dwell edges.
- Default framing: stop slightly left-of-center (cards on the right); per-stop `camera` override for special shots (e.g., pull out for ocean/land crossings).
- Native scroll only — no scroll-jacking. Fully reversible (scroll up rewinds).

## Data Model

One file per journey in `src/journeys/`, validated by Zod schema at build time.

```ts
{
  id: "napoleon",
  figure: "Napoleon Bonaparte",
  title: "The Rise and Fall of Napoleon",
  years: "1793–1821",
  color: "#e8b54a",
  intro: "...",                       // hub blurb + opening card
  stops: [
    {
      name: "Toulon",
      coords: { lat: 43.12, lng: 5.93 },
      date: "Dec 1793",
      story: "...",                   // 1–3 sentences per card
      camera?: { altitude, pitch },   // optional framing override
      battle?: {
        name: "Battle of Austerlitz",
        date: "2 Dec 1805",
        phases: [
          {
            caption: "The feigned retreat draws the Allies off the heights…",
            movements: [
              { side: "french" | "coalition",
                path: [{ lat, lng }, ...],
                style: "advance" | "retreat" | "feint" }
            ]
          }
          // 3–6 phases per battle
        ]
      }
    }
    // ~10–15 stops per journey
  ]
}
```

- **v1 content**: Napoleon, ~10–15 stops (Corsica → Toulon → Italy → Egypt → Paris coronation → Austerlitz → Russia → Elba → Waterloo → St. Helena), drafted by Claude, reviewed by user. Austerlitz carries the one `battle`.
- Stops with a `battle` show a **"⚔ Witness the battle"** affordance on their story card.

## Error Handling & Performance

- **No WebGL / context loss**: detect at boot → static hero image + note. One recovery attempt on context loss, then fallback.
- **Tile failures** (offline, quota, bad key): battle degrades to the sepia globe at max zoom with arrows drawn anyway — watchable, just low-res. Console warning only.
- **Mobile**: touch scroll works natively; pixel ratio capped at 2; bloom dropped on low-end GPUs (frame-time sampling at startup); rendering paused when tab hidden.
- **Budget**: earth textures 2–4K (~few MB); battle/terrain code split via dynamic import so hub first-paint stays fast.

## Testing

- **Unit (Vitest)**: great-circle arc generation, scroll-progress→segment mapping, camera interpolation, battle phase timing — pure functions where regressions silently ruin the feel.
- **Build-time data validation**: Zod schema over journey files; bad coords/missing fields/out-of-order dates fail the build.
- **Manual/visual**: `?stop=n` and `?battle=phase` dev URL params to jump anywhere while tuning.

## Deployment

Static build → Vercel. Tile API key is a domain-restricted public client key (Cesium ion free non-commercial tier, or Google Photorealistic 3D Tiles within monthly free credit — chosen during implementation after a quick spike). `.env` and `.superpowers/` gitignored.

## Out of Scope (v1)

- Additional journeys (Darwin, Ibn Battuta, Magellan, Grant) — data format supports them; content later.
- Wikipedia/Wikidata extraction pipeline.
- Date scrubber / autoplay for journeys (the scroll IS the timeline); may revisit as nice-to-have.
- CMS or admin UI — journeys are code-reviewed TypeScript files.
- Sound design, i18n, user accounts.

## Key Risks

1. **Tile streaming + sphere↔terrain fade transition** — the hardest unknown. Mitigated: isolated in `TerrainLayer`, spiked early in implementation, with a graceful degrade path (battle over low-res globe).
2. **Scroll-feel tuning** — not unit-testable; budget iteration time with the dev URL params.
3. **Tile provider quotas/pricing** — domain-restricted key, degrade path exists, provider chosen after spike.
