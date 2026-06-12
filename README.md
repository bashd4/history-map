# Paths of History

Journeys of historical figures told as scroll-driven stories on a vintage three.js globe. v1: Napoleon, with the Battle of Austerlitz watchable from bird's-eye view.

## Dev

```
npm run dev    # dev server
npm test       # vitest
npm run build  # production build
```

## Docs

- Spec: `docs/superpowers/specs/2026-06-10-history-map-design.md`
- Plan: `docs/superpowers/plans/2026-06-10-history-map.md`

## Stack

Vite, React 19, TypeScript, three.js + @react-three/fiber, GSAP ScrollTrigger, Zustand, Zod, 3d-tiles-renderer, Vitest.

## Attributions

Earth texture: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0)

Topo basemap: Esri — World Topographic Map (sources: Esri, HERE, Garmin, Intermap, INCREMENT P, GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), © OpenStreetMap contributors, GIS User Community). Fallback: © [OpenTopoMap](https://opentopomap.org) contributors (CC BY-SA).
