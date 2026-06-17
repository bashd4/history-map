import type { Battle } from '../../data/schema'

// NOTE: All phases must set an explicit `duration` — the 6s playback default is tuned for city-scale battles, not campaign-scale phases.
const SIDES = { union: '#4d8fdb', confederate: '#c0392b' }

// ─── Fort Donelson ──────────────────────────────────────────────────────────
// Feb 12–16, 1862 · Fort at 36.4922, -87.8617 on the Cumberland River
// Union ~24,500 / Confederate ~16,000
const fortDonelson: Battle = {
  name: 'Battle of Fort Donelson',
  date: 'February 12-16, 1862',
  sides: { union: '#4d8fdb', confederate: '#c0392b' },
  strengths: { union: '~24,500 men', confederate: '~16,000 men' },
  // Camera stands NW on the river, looking SE across the fort and bluffs.
  fieldAzimuth: 315,
  areas: [
    {
      // Fort earthworks: 36.4878, -87.8559 (NPS confirmed centroid).
      // The works enclosed the bluff above the river on the N and Dover on the SE.
      // Outline traces the ~100-acre earthwork perimeter.
      name: 'Fort Donelson',
      kind: 'terrain',
      outline: [
        { lat: 36.49200, lng: -87.86200 }, // NW corner (toward river)
        { lat: 36.49380, lng: -87.85900 }, // N edge along bluff
        { lat: 36.49300, lng: -87.85500 }, // NE corner
        { lat: 36.49000, lng: -87.85300 }, // E side
        { lat: 36.48550, lng: -87.85350 }, // SE corner (toward Dover)
        { lat: 36.48350, lng: -87.85650 }, // S edge
        { lat: 36.48450, lng: -87.86050 }, // SW corner
        { lat: 36.48800, lng: -87.86300 }, // W side back to NW
      ],
    },
    {
      // Dover TN: county seat, SE of the fort on the Cumberland River.
      // Apple Maps / NPS address: 120 Fort Donelson Rd, Dover TN 37058.
      // Dover center is ~36.486, -87.848.
      name: 'Dover',
      kind: 'settlement',
      outline: [
        { lat: 36.48800, lng: -87.85100 },
        { lat: 36.48850, lng: -87.84700 },
        { lat: 36.48650, lng: -87.84400 },
        { lat: 36.48350, lng: -87.84350 },
        { lat: 36.48200, lng: -87.84600 },
        { lat: 36.48400, lng: -87.85000 },
      ],
    },
    {
      // Confederate outer trench arc: 3-mile semicircle from Hickman Creek (W/NW)
      // to Lick Creek (SE). Source: Wikipedia; "breastworks in a three-mile arc
      // which inclosed the bluff on the north and Dover on the south."
      // Buckner's right anchored on Hickman Creek (NW); Pillow's left near Lick Creek (SE).
      // Indian Creek runs through the center of the arc.
      //
      // Computed at 1.5km radius from fort (36.4878, -87.8559), bearings 280°→100°
      // (sweeping WNW through S to ESE). Arc length at this radius ≈ 4660m ≈ 2.9 miles,
      // acceptably close to the documented "3 miles." The N-facing flanks close toward
      // the river (Hickman Cr on W, Lick Cr on E) — added as closing endpoints.
      name: 'Outer Confederate Trenches',
      kind: 'terrain',
      outline: [
        { lat: 36.49014, lng: -87.87242 }, // WNW (280°, 1.5km): Hickman Creek anchor (Buckner right)
        { lat: 36.48319, lng: -87.87167 }, // WSW (250°, 1.5km): Smith's front
        { lat: 36.47747, lng: -87.86668 }, // SW  (220°, 1.5km): SW sector
        { lat: 36.47452, lng: -87.85881 }, // S   (190°, 1.5km): Indian Creek center
        { lat: 36.47512, lng: -87.85016 }, // SSE (160°, 1.5km): S sector
        { lat: 36.47913, lng: -87.84305 }, // SE  (130°, 1.5km): McClernand's front
        { lat: 36.48546, lng: -87.83938 }, // ESE (100°, 1.5km): Lick Creek anchor (Pillow left)
      ],
    },
  ],
  phases: [
    {
      caption:
        "Grant's infantry closes the land ring around the fort while Foote's gunboat flotilla steams up the Cumberland — McClernand's division anchors the right (SE sector near Lick Creek), Smith's the left (W sector facing Hickman Creek), Wallace's in reserve.",
      duration: 7,
      movements: [
        {
          // McClernand approached from the W (same road as all Union forces from Fort Henry),
          // then swept around the S of the Confederate arc to occupy the SE/right sector
          // facing Pillow's left. His right flank was near Lick Creek (SE of Dover).
          side: 'union',
          style: 'advance',
          unit: 'McClernand — 1st Division',
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.49500, lng: -87.93500 }, // approaching from W (Fort Henry direction)
            { lat: 36.48000, lng: -87.90000 }, // swings south of Confederate arc
            { lat: 36.46800, lng: -87.86800 }, // moving to SE sector
            { lat: 36.46200, lng: -87.83600 }, // right flank near Lick Creek
          ],
        },
        {
          // Smith on the Union LEFT: stayed on the W/NW sector facing Buckner's right,
          // which was anchored on Hickman Creek. Smith approached from W and anchored
          // his division west of the fort works.
          side: 'union',
          style: 'advance',
          unit: 'C. F. Smith — 2nd Division',
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.45500, lng: -87.93000 }, // from W, left (southern) flank
            { lat: 36.46200, lng: -87.91200 }, // advancing NE
            { lat: 36.47000, lng: -87.89800 }, // settling into position W of Confederate right
          ],
        },
        {
          // Foote's flotilla: came UP the Cumberland from downstream (NW direction).
          // OSM nodes confirm river runs SE-NW in this reach.
          // Phase 1 shows the advance stage — staging downstream of the batteries.
          // River nodes (OSM way 163974730) sampled at 5-node intervals.
          side: 'union',
          style: 'advance',
          unit: "Foote's Gunboat Flotilla",
          branch: 'naval',
          echelon: 'flotilla',
          path: [
            { lat: 36.55135, lng: -87.88307 }, // downstream NW (OSM node)
            { lat: 36.54445, lng: -87.87672 }, // OSM node
            { lat: 36.52915, lng: -87.87672 }, // OSM node — staging point downstream
            { lat: 36.51742, lng: -87.87501 }, // OSM node — advancing upstream (SE)
            { lat: 36.50887, lng: -87.86865 }, // OSM node — nearing batteries
          ],
        },
      ],
    },
    {
      caption:
        "Foote's four ironclads steam to within 400 yards of the water batteries and open fire — the gunboats duel the Confederate guns on the bluff.",
      duration: 5,
      movements: [
        {
          // Foote ADVANCE: continues upstream from where phase 1 ended (36.50887)
          // to within ~400yd of batteries. All nodes are real OSM river nodes (way 163974730).
          // Continuity: phase 2 now resumes at the phase-1 endpoint instead of re-staging
          // downstream — the duplicated downstream nodes (52915/51742/51328) were dropped.
          // Closest approach: 36.50003, -87.86041 (river directly below the bluff battery).
          side: 'union',
          style: 'advance',
          unit: "Foote's Gunboat Flotilla",
          branch: 'naval',
          echelon: 'flotilla',
          path: [
            { lat: 36.50887, lng: -87.86865 }, // OSM node — resumes from phase-1 endpoint (nearing batteries)
            { lat: 36.50417, lng: -87.86385 }, // OSM node
            { lat: 36.50003, lng: -87.86041 }, // OSM node — closest approach (~400yd from battery)
          ],
        },
        {
          // Confederate river batteries: on the bluff at ~36.497, -87.858.
          // Capt. Joseph Dixon (lower) and Capt. Bidwell (upper) commanded the river
          // batteries (NOT Maney, whose battery was a LAND battery on the outer line).
          // This feint arrow represents the battery firing position on the bluff.
          side: 'confederate',
          style: 'feint',
          unit: "Confederate river batteries",
          branch: 'artillery',
          echelon: 'regiment', // battery-level formation (smallest echelon available)
          path: [
            { lat: 36.49700, lng: -87.85800 }, // lower battery on bluff (facing downstream NW)
            { lat: 36.50000, lng: -87.86000 }, // upper battery on bluff
          ],
        },
      ],
    },
    {
      caption:
        "Accurate plunging fire from the bluff cripples the fleet — St. Louis and Louisville are hulled and drift back downriver; Foote is wounded aboard the St. Louis.",
      duration: 5,
      events: [
        {
          // Water batteries are on the 100-ft bluff above the river, just N of the earthworks.
          // Foote's closest approach was the river directly below, ~400yd from the guns.
          coords: { lat: 36.50003, lng: -87.86041 },
          label: "Gunboats repulsed — Foote wounded aboard St. Louis",
        },
      ],
      movements: [
        {
          // Foote RETREAT: disabled boats "drifted down the river" (NPS source).
          // Same river nodes, reversed direction — back downstream NW.
          side: 'union',
          style: 'retreat',
          unit: "Foote's Gunboat Flotilla",
          branch: 'naval',
          echelon: 'flotilla',
          path: [
            { lat: 36.50003, lng: -87.86041 }, // OSM — repulse point
            { lat: 36.50417, lng: -87.86385 }, // OSM node
            { lat: 36.50887, lng: -87.86865 }, // OSM node
            { lat: 36.51742, lng: -87.87501 }, // OSM node
            { lat: 36.52915, lng: -87.87672 }, // OSM node — retiring downstream
            { lat: 36.55135, lng: -87.88307 }, // OSM node — safely downstream
          ],
        },
      ],
    },
    {
      caption:
        "Pillow and Buckner burst out of the SE works at dawn, driving McClernand's right back nearly two miles and forcing open the Wynn's Ferry and Forge Roads toward Nashville.",
      duration: 6,
      movements: [
        {
          // Pillow's division: on the Confederate LEFT (E/SE sector of the arc,
          // near Lick Creek). Attacked S/SW, driving McClernand's right back.
          // Goal: reach Wynn's Ferry Rd / Forge Rd junctions running toward Nashville (SE).
          side: 'confederate',
          style: 'advance',
          unit: "Pillow's division",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.47500, lng: -87.85500 }, // start: E side of Confederate arc (Lick Cr sector)
            { lat: 36.46700, lng: -87.85800 }, // pushing south
            { lat: 36.46000, lng: -87.86200 }, // driving toward road junction
            { lat: 36.45500, lng: -87.87000 }, // at Wynn's Ferry / Forge Rd area
          ],
        },
        {
          // Buckner acted as rear guard, sweeping S across Wynn's Ferry Road
          // from his right-flank position (W/NW sector) toward the road junction.
          // His movement was more westward, pinning Union center while Pillow attacked SE.
          side: 'confederate',
          style: 'advance',
          unit: "Buckner's division",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.48800, lng: -87.88200 }, // start: Confederate right (W sector near Hickman Cr)
            { lat: 36.47800, lng: -87.87800 }, // moving S as rear guard
            { lat: 36.47000, lng: -87.87200 }, // crossing toward Wynn's Ferry Rd
          ],
        },
        {
          // McClernand's right was pushed S/SE — back toward Lick Creek and beyond,
          // approximately 1–2 miles. His men fell back ESE, away from the arc.
          side: 'union',
          style: 'retreat',
          unit: 'McClernand — 1st Division',
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.46200, lng: -87.83600 }, // his right-flank position (near Lick Creek)
            { lat: 36.45500, lng: -87.82800 }, // retreating SE
            { lat: 36.44800, lng: -87.82000 }, // pushed back ~1.5 miles from arc
          ],
        },
      ],
    },
    {
      caption:
        "With the escape road open, Pillow — fearing Grant's return — inexplicably orders his division back into the fort by 1:30 p.m., surrendering every yard they had won.",
      duration: 4,
      movements: [
        {
          // Pillow's recall: ordered back into the fort, surrendering all gained ground.
          // Reversed from the road junction back NE into the Confederate arc.
          side: 'confederate',
          style: 'retreat',
          unit: "Pillow's division",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.45500, lng: -87.87000 }, // from road junction
            { lat: 36.46200, lng: -87.86200 }, // returning NE
            { lat: 36.47500, lng: -87.85500 }, // back into Confederate left sector
          ],
        },
      ],
    },
    {
      caption:
        "Grant orders an immediate counterattack; Smith's division breaks through the Confederate right (near Hickman Creek) while McClernand and Wallace recover the lost SE ground — Buckner surrenders at dawn.",
      duration: 9,
      events: [
        {
          // Grant delivered his surrender demand from his HQ near the river landing area.
          // The fort HQ (Dover Hotel) was in Dover: ~36.4860, -87.8480.
          coords: { lat: 36.48600, lng: -87.84800 },
          label: '"No terms except unconditional surrender" — Grant to Buckner',
        },
      ],
      movements: [
        {
          // McClernand counterattack: retakes the SE ground pushed back during the breakout.
          // Advances N from his retreat position back toward the outer Confederate arc.
          side: 'union',
          style: 'advance',
          unit: 'McClernand — 1st Division',
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.44800, lng: -87.82000 }, // from retreat position
            { lat: 36.45500, lng: -87.82800 }, // advancing N
            { lat: 36.46200, lng: -87.83600 }, // recovering right-flank position near Lick Creek
          ],
        },
        {
          // Smith's attack: on the Union LEFT (W sector), Grant ordered Smith to
          // assault the Confederate right (near Hickman Creek) which had been weakened
          // when troops were pulled for Pillow's breakout. Smith's 2nd Iowa led the charge,
          // breaking through the outer works and capturing the ridge. Grant confirmed:
          // "Smith had carried the works." Attack direction: NE into the Confederate right.
          side: 'union',
          style: 'advance',
          unit: 'C. F. Smith — 2nd Division',
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.47000, lng: -87.89800 }, // continuity: resumes from Smith's phase-1 position W of Confederate right
            { lat: 36.47200, lng: -87.90000 }, // advancing NE
            { lat: 36.49000, lng: -87.87200 }, // breaking through Confederate right (NW arc, near Hickman Cr)
          ],
        },
        {
          // Wallace advances in center to fill the gap and restore the Union line.
          // His division moved NE from the reserve position into the center of the arc.
          side: 'union',
          style: 'advance',
          unit: "Lew Wallace — 3rd Division",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.46500, lng: -87.87000 }, // reserve/center position
            { lat: 36.47200, lng: -87.86200 }, // advancing toward the S arc
          ],
        },
        {
          // Buckner's division: Confederate right collapsed under Smith's assault.
          // Retreated NE back inside the fort perimeter (toward earthworks).
          // Buckner then asked Grant for terms — surrender Feb 16 at dawn.
          side: 'confederate',
          style: 'retreat',
          unit: "Buckner's division",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 36.47000, lng: -87.87200 }, // continuity: resumes from Buckner's Wynn's Ferry Rd position (phase 4 end)
            { lat: 36.49000, lng: -87.87200 }, // pulled back to defend NW arc — point of Smith's breakthrough
            { lat: 36.49200, lng: -87.86600 }, // retreating E toward fort
            { lat: 36.49200, lng: -87.86100 }, // back inside fort earthwork perimeter
          ],
        },
      ],
    },
  ],
}

// ─── Shiloh ─────────────────────────────────────────────────────────────────
// Apr 6-7, 1862 · Pittsburg Landing 35.1402, -88.3420 · Shiloh Church ~35.1378, -88.3565
// Hornet's Nest ~35.1407, -88.3445 · Peach Orchard ~35.131, -88.327
// Union ~66,800 / Confederate ~44,700
const shiloh: Battle = {
  name: 'Battle of Shiloh',
  date: 'April 6-7, 1862',
  sides: SIDES,
  strengths: { union: '~66,800 men', confederate: '~44,700 men' },
  // Camera stands ENE on the river bluff, looking WSW across the ridges toward Shiloh Church.
  fieldAzimuth: 70,
  areas: [
    {
      // Hornet's Nest / Sunken Road: corrected to HMDB-anchored position.
      // HMDB marker at 35.13810, -88.34008. Sunken Road ran ~600 yds E-W from Duncan Field
      // (W) curving SE toward the Peach Orchard. The defensive thicket + road = the 'woods' zone.
      name: "Hornet's Nest",
      kind: 'woods',
      outline: [
        { lat: 35.13920, lng: -88.34380 },
        { lat: 35.13950, lng: -88.34180 },
        { lat: 35.13880, lng: -88.33980 },
        { lat: 35.13780, lng: -88.33850 },
        { lat: 35.13650, lng: -88.33800 },
        { lat: 35.13560, lng: -88.33900 },
        { lat: 35.13570, lng: -88.34100 },
        { lat: 35.13650, lng: -88.34300 },
        { lat: 35.13790, lng: -88.34420 },
      ],
    },
    {
      // Pittsburg Landing: corrected to OSM-confirmed location on the west bank of the
      // Tennessee River. OSM Way 765321525 centroid ~35.14939, -88.31858. The bluff-top
      // landing area and Grant's command post were just west of the river bank.
      name: 'Pittsburg Landing',
      kind: 'settlement',
      outline: [
        { lat: 35.15060, lng: -88.32280 },
        { lat: 35.15080, lng: -88.32050 },
        { lat: 35.14960, lng: -88.31860 },
        { lat: 35.14810, lng: -88.31820 },
        { lat: 35.14680, lng: -88.31960 },
        { lat: 35.14720, lng: -88.32180 },
        { lat: 35.14900, lng: -88.32320 },
      ],
    },
    {
      // Owl Creek Swamps: NW boundary of the battlefield. Owl Creek flows SW-to-NE,
      // entering the Tennessee River north of the battlefield. The swampy bottomland
      // formed the natural barrier on the Union right (Sherman's flank).
      // Corrected to proper NW position consistent with 35.15-35.17, -88.37 to -88.39.
      name: 'Owl Creek Swamps',
      kind: 'water',
      outline: [
        { lat: 35.17200, lng: -88.39500 },
        { lat: 35.17000, lng: -88.38200 },
        { lat: 35.16400, lng: -88.37500 },
        { lat: 35.15800, lng: -88.37200 },
        { lat: 35.15200, lng: -88.37400 },
        { lat: 35.15000, lng: -88.38000 },
        { lat: 35.15500, lng: -88.38900 },
        { lat: 35.16400, lng: -88.39600 },
      ],
    },
    {
      // Peach Orchard (Sarah Bell's): east side of battlefield along the Hamburg-Savannah Road.
      // Confederate right (Chalmers/Jackson) and Johnston personally directed fighting here.
      // Johnston mortally wounded ~35.13020, -88.32953 (NPS); orchard was just NW of that point.
      // Placed at ~35.1325-35.1360, -88.3290 to -88.3360.
      name: 'Peach Orchard',
      kind: 'terrain',
      outline: [
        { lat: 35.13600, lng: -88.33580 },
        { lat: 35.13620, lng: -88.33240 },
        { lat: 35.13480, lng: -88.32980 },
        { lat: 35.13280, lng: -88.32880 },
        { lat: 35.13100, lng: -88.32980 },
        { lat: 35.13080, lng: -88.33260 },
        { lat: 35.13260, lng: -88.33520 },
        { lat: 35.13460, lng: -88.33620 },
      ],
    },
  ],
  phases: [
    {
      caption:
        "Dawn Apr 6 — Johnston's army bursts from the woods along the Corinth road: Hardee's corps leads the front line NNE into Sherman's camps at Shiloh Church; Bragg's corps follows close, striking the center. Sherman and McClernand are overwhelmed and fall back NE toward the Landing.",
      duration: 8,
      movements: [
        {
          // Hardee's corps: front wave. Bivouacked ~2 miles S of Union camps, advanced NNE
          // along the Corinth-Pittsburg Landing road into Sherman's position at Shiloh Church.
          // Start point S of battlefield consistent with Corinth approach bearing (~30° from S).
          side: 'confederate',
          style: 'advance',
          unit: "Hardee — III Corps (front wave)",
          branch: 'infantry',
          echelon: 'corps',
          strength: 6789,
          path: [
            { lat: 35.09800, lng: -88.38500 },
            { lat: 35.11400, lng: -88.37200 },
            { lat: 35.12600, lng: -88.36200 },
            { lat: 35.13368, lng: -88.35499 },  // Shiloh Church (OSM confirmed)
          ],
        },
        {
          // Bragg's corps: second wave, slightly E of Hardee, driving N toward center of
          // Union camps (Prentiss / W.H.L. Wallace sector).
          side: 'confederate',
          style: 'advance',
          unit: "Bragg — II Corps (second wave)",
          branch: 'infantry',
          echelon: 'corps',
          strength: 16279,
          path: [
            { lat: 35.09800, lng: -88.36500 },
            { lat: 35.11300, lng: -88.35800 },
            { lat: 35.12300, lng: -88.34700 },
            { lat: 35.12800, lng: -88.34000 },
          ],
        },
        {
          // Sherman retreats NE from Shiloh Church toward Pittsburg Landing.
          // Bearing ~58° (confirmed). He fell back through successive defensive lines.
          side: 'union',
          style: 'retreat',
          unit: 'Sherman — 5th Division',
          branch: 'infantry',
          echelon: 'division',
          strength: 8580,
          path: [
            { lat: 35.13368, lng: -88.35499 },  // Shiloh Church
            { lat: 35.13900, lng: -88.34500 },   // intermediate ridge
            { lat: 35.14500, lng: -88.33200 },   // Jones Field area
            { lat: 35.14800, lng: -88.32600 },   // near Landing perimeter
          ],
        },
        {
          // McClernand (E of Sherman) also retreats NE, parallel to Sherman.
          // His division was camped E of Shiloh Church, retreated toward the Landing.
          side: 'union',
          style: 'retreat',
          unit: 'McClernand — 1st Division',
          branch: 'infantry',
          echelon: 'division',
          strength: 6941,
          path: [
            { lat: 35.13600, lng: -88.34800 },
            { lat: 35.14000, lng: -88.33800 },
            { lat: 35.14600, lng: -88.32900 },
            { lat: 35.14850, lng: -88.32500 },
          ],
        },
      ],
    },
    {
      caption:
        "Mid-morning to dusk Apr 6 — Prentiss and W.H.L. Wallace anchor the Sunken Road / Hornet's Nest, repulsing 11 Confederate charges for ~6 hours. Ruggles masses 62 guns in Duncan Field. Johnston rides personally to direct the Peach Orchard assault on the Confederate right and is mortally wounded.",
      duration: 9,
      events: [
        {
          // NPS Monument M017 confirmed: 35.1302, -88.32953 ("mortally wounded at 2:30 p.m.").
          // The Peach Orchard was where he was directing the assault; he was hit on his horse
          // near the orchard, then taken 50 yards SE into a ravine where he died.
          coords: { lat: 35.13020, lng: -88.32953 },
          label: "Johnston mortally wounded directing Peach Orchard assault",
        },
        {
          // Hornet's Nest: HMDB marker 35.13810, -88.34008 (confirmed).
          coords: { lat: 35.13810, lng: -88.34008 },
          label: "Prentiss & W.H.L. Wallace hold the Hornet's Nest — eleven",
        },
      ],
      movements: [
        {
          // Prentiss holds the Sunken Road. The road ran E-W; show as a short W-to-E line
          // along the defensive position. 'feint' = static defensive holding action.
          side: 'union',
          style: 'feint',
          unit: "Prentiss — 6th Div. + W.H.L. Wallace",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 35.13860, lng: -88.34380 },  // Sunken Road west end (Duncan Field edge)
            { lat: 35.13810, lng: -88.34008 },  // HMDB marker center
            { lat: 35.13560, lng: -88.33500 },  // Sunken Road east end (toward Peach Orchard)
          ],
        },
        {
          // Ruggles assembles 62 guns in Duncan Field (W of Hornet's Nest) and fires E.
          // Duncan Field is just W/NW of the Sunken Road, bearing ~90° toward the Nest.
          side: 'confederate',
          style: 'advance',
          unit: "Ruggles' massed artillery — 62 guns",
          branch: 'artillery',
          echelon: 'brigade', // grand battery of 62 guns ≈ brigade-sized grouping
          path: [
            { lat: 35.13900, lng: -88.35000 },  // assembly point (Duncan Field W)
            { lat: 35.13880, lng: -88.34400 },  // firing position (Duncan Field E edge)
          ],
        },
        {
          // Chalmers & Jackson brigades: attacked up from the SE (Lick Creek flank),
          // driving NNW toward the Peach Orchard and the eastern end of the Sunken Road.
          side: 'confederate',
          style: 'advance',
          unit: "Chalmers & Jackson — brigades",
          branch: 'infantry',
          echelon: 'brigade',
          strength: 3779,
          path: [
            { lat: 35.11800, lng: -88.31800 },  // start near Lick Creek SE boundary
            { lat: 35.12500, lng: -88.32000 },
            { lat: 35.13020, lng: -88.32953 },  // Peach Orchard / Johnston wound site
          ],
        },
        {
          // Webster's artillery last line: ~50 guns on the ridge above Dill Branch ravine,
          // running E-W from Tilghman Branch to the river bluff, just S of the Landing.
          // This is a defensive 'advance' to position, facing S.
          side: 'union',
          style: 'advance',
          unit: "Webster's artillery — Grant's Last Line",
          branch: 'artillery',
          echelon: 'brigade', // ~50-gun massed line ≈ brigade-sized grouping
          path: [
            { lat: 35.14600, lng: -88.33200 },  // Tilghman Branch / left anchor
            { lat: 35.14700, lng: -88.32800 },  // center of line
            { lat: 35.14800, lng: -88.32100 },  // river bluff / right anchor
          ],
        },
      ],
    },
    {
      caption:
        "Dusk Apr 6 — Prentiss surrenders ~2,200 men; Beauregard halts the Confederate advance short of the Landing. Overnight: gunboats Tyler & Lexington shell Confederate positions from the river; Buell's Army of the Ohio crosses the Tennessee at the Landing; Lew Wallace's lost division arrives from the north.",
      duration: 7,
      events: [
        {
          coords: { lat: 35.13810, lng: -88.34008 },  // HMDB marker (surrender site)
          label: "Prentiss surrenders ~2,200 men — dusk, Apr 6",
        },
      ],
      movements: [
        {
          // Gunboats Tyler & Lexington shelled Confederate positions from the river on the
          // evening of Apr 6. The river channel at this latitude runs along the east edge
          // of the field. Path stays on the OSM river centerline (Way 164267067 nodes).
          // Tyler/Lexington shelled N-to-S positions from the river.
          side: 'union',
          style: 'advance',
          unit: "Gunboats Tyler & Lexington — Tennessee",
          branch: 'naval',
          echelon: 'flotilla',
          path: [
            { lat: 35.15925, lng: -88.31606 },  // OSM river node (north)
            { lat: 35.14956, lng: -88.31648 },  // OSM river node (near Landing)
            { lat: 35.14445, lng: -88.31735 },  // OSM river node (south)
            { lat: 35.13856, lng: -88.31728 },  // OSM river node (further S)
          ],
        },
        {
          // Nelson's division (Buell's lead): crossed from east bank to Pittsburg Landing
          // (west bank). Path starts on the east bank of the river and terminates at
          // the actual landing site (OSM Way 765321525: 35.14939, -88.31858).
          // River centerline at this lat: 35.14956,-88.31648 (OSM node).
          side: 'union',
          style: 'advance',
          unit: "Nelson's div. (Buell) — Tennessee River",
          branch: 'infantry',
          echelon: 'division',
          strength: 4500,
          path: [
            { lat: 35.14900, lng: -88.30900 },  // east bank (Savannah side) embarkation
            { lat: 35.14956, lng: -88.31648 },  // OSM river centerline node (midstream)
            { lat: 35.14939, lng: -88.31858 },  // Pittsburg Landing west bank (OSM confirmed)
            { lat: 35.14900, lng: -88.32300 },  // staging area inland from the landing
          ],
        },
        {
          // Lew Wallace's 3rd Division: came from Crump's Landing (~5 miles N on the river).
          // He marched south down the River Road, crossed Snake Creek, arrived from the north
          // at the Union right flank near the Landing. Arrived after dark, Apr 6.
          side: 'union',
          style: 'advance',
          unit: "Lew Wallace — 3rd Division",
          branch: 'infantry',
          echelon: 'division',
          strength: 7564,
          path: [
            { lat: 35.22000, lng: -88.32800 },  // Crump's Landing (~5 miles N of Landing)
            { lat: 35.19000, lng: -88.32500 },  // River Road south
            { lat: 35.16500, lng: -88.32200 },  // Snake Creek crossing
            { lat: 35.15200, lng: -88.32200 },  // arrival at Union right flank
          ],
        },
        {
          // Crittenden & McCook divisions (Buell): followed Nelson's crossing overnight/early
          // Apr 7. Path mirrors Nelson's crossing then fans out to assembly positions.
          side: 'union',
          style: 'advance',
          unit: "Crittenden & McCook divs. (Buell)",
          branch: 'infantry',
          echelon: 'division',
          strength: 11377,
          path: [
            { lat: 35.14700, lng: -88.30900 },  // east bank
            { lat: 35.14700, lng: -88.31858 },  // Pittsburg Landing west bank
            { lat: 35.14500, lng: -88.32800 },  // assembly position W of Landing
          ],
        },
      ],
    },
    {
      caption:
        "Dawn Apr 7 — the full Union line surges WSW: Sherman retakes Shiloh Church; Lew Wallace envelops the Confederate left from the north; Hurlbut and Buell's divisions push the center. By mid-afternoon Beauregard orders a general retreat toward Corinth.",
      duration: 8,
      movements: [
        {
          // Sherman drives WSW back from his rally point near the Landing, retaking Shiloh Church.
          // Bearing ~238° (confirmed). This reverses his Day-1 retreat path.
          side: 'union',
          style: 'advance',
          unit: 'Sherman — 5th Division',
          branch: 'infantry',
          echelon: 'division',
          strength: 8580,
          path: [
            { lat: 35.14800, lng: -88.32600 },  // rally point near Landing
            { lat: 35.14200, lng: -88.33800 },  // intermediate ridge
            { lat: 35.13700, lng: -88.34900 },  // approaching church
            { lat: 35.13368, lng: -88.35499 },  // Shiloh Church (OSM confirmed)
          ],
        },
        {
          // Lew Wallace: arrived from the N, occupied the Union far right.
          // On Day 2 he drove WSW, enveloping the Confederate left flank.
          // Bearing ~245° (confirmed).
          side: 'union',
          style: 'advance',
          unit: "Lew Wallace — 3rd Division",
          branch: 'infantry',
          echelon: 'division',
          strength: 7564,
          path: [
            { lat: 35.15200, lng: -88.32200 },  // overnight position (far right)
            { lat: 35.14900, lng: -88.33800 },  // advancing WSW
            { lat: 35.14400, lng: -88.35600 },  // Confederate left collapsed here
          ],
        },
        {
          // Hurlbut (Union center) + Buell's divisions push WSW through the recaptured camps.
          side: 'union',
          style: 'advance',
          unit: "Hurlbut & Buell's Army — center push",
          branch: 'infantry',
          echelon: 'corps', // mixed Hurlbut division + Buell's Army of the Ohio divisions, army-level grouping
          path: [
            { lat: 35.14600, lng: -88.32800 },  // starting line near Landing
            { lat: 35.14000, lng: -88.34200 },  // retaking mid-battlefield camps
            { lat: 35.13500, lng: -88.35200 },  // approaching Shiloh Church area
          ],
        },
        {
          // Beauregard orders retreat SW toward Corinth.
          // Bearing ~220° from Shiloh Church area toward Corinth (SSW confirmed).
          side: 'confederate',
          style: 'retreat',
          unit: "Beauregard — Army of the Mississippi",
          branch: 'command', // army-level command marker
          echelon: 'corps', // "Army of …" → largest available echelon
          strength: 44699,
          path: [
            { lat: 35.13368, lng: -88.35499 },  // Shiloh Church / HQ evening Apr 6
            { lat: 35.12000, lng: -88.37000 },  // withdrawing SSW
            { lat: 35.10500, lng: -88.38800 },  // rearguard / Fallen Timbers skirmish
          ],
        },
      ],
    },
  ],
}

// ─── Vicksburg Campaign ─────────────────────────────────────────────────────
// Apr-Jul 1863 · Vicksburg 32.3526, -90.8779 · Bruinsburg 31.9665, -91.1262
// Jackson 32.2988, -90.1848 · Champion Hill 32.3263, -90.5743
// Big Black River ~32.345, -90.730
// NOTE: paths here span up to ~200 km; this is a campaign-scale animation.
// Union ~77,000 / Confederate ~33,000
const vicksburg: Battle = {
  name: 'Vicksburg Campaign',
  date: 'April - July 4, 1863',
  sides: SIDES,
  strengths: { union: '~77,000 men', confederate: '~33,000 men' },
  // Camera stands WSW on the river, looking ENE so Vicksburg's bluffs rise above the Mississippi.
  fieldAzimuth: 250,
  areas: [
    {
      // Vicksburg fortress polygon traces the Confederate defensive arc:
      // Fort Hill (N river anchor, bluff above the 1863/Yazoo-canal channel)
      // → NE along the ridge through Stockade Redan, 3rd Louisiana Redan,
      //   Great Redoubt, 2nd Texas Lunette, Railroad Redoubt, Fort Garrott
      // → South Fort (S river anchor) → back N along the waterfront bluffs.
      // Stockade Redan position confirmed 32.36992, –90.84474 (FortWiki GPS).
      name: 'Vicksburg Fortress',
      kind: 'settlement',
      outline: [
        { lat: 32.38000, lng: -90.90500 }, // Fort Hill — N anchor at 1863 river bluff
        { lat: 32.37800, lng: -90.85500 }, // Fort Hill — ridge top (above old channel)
        { lat: 32.36992, lng: -90.84474 }, // Stockade Redan (confirmed)
        { lat: 32.35800, lng: -90.84000 }, // 3rd Louisiana Redan / Jackson Rd area
        { lat: 32.35000, lng: -90.84000 }, // Great Redoubt
        { lat: 32.34100, lng: -90.84300 }, // 2nd Texas Lunette
        { lat: 32.33300, lng: -90.85200 }, // Railroad Redoubt / Fort Garrott
        { lat: 32.32700, lng: -90.87000 }, // South Fort — ridge
        { lat: 32.32500, lng: -90.91000 }, // South Fort — S anchor at 1863 river bluff
        { lat: 32.34000, lng: -90.91500 }, // Waterfront SW
        { lat: 32.35300, lng: -90.91200 }, // City-centre waterfront (Water Battery lon)
        { lat: 32.37000, lng: -90.90800 }, // Waterfront NW
      ],
    },
    {
      // Champion Hill (Baker's Creek) battlefield, Hinds County.
      // Wikipedia gives battle coords 32.33333, –90.52778.
      // The Confederate 3-mile defensive ridge ran SW–NE; Baker's Creek
      // anchored the W/SW escape route; the Jackson Road crossed the E side.
      name: 'Champion Hill',
      kind: 'terrain',
      outline: [
        { lat: 32.34500, lng: -90.56000 }, // NW — ridge N terminus
        { lat: 32.34200, lng: -90.52800 }, // N — ridge crest centre
        { lat: 32.33300, lng: -90.51200 }, // NE — Jackson Road intersection
        { lat: 32.32000, lng: -90.50500 }, // SE corner
        { lat: 32.31500, lng: -90.52500 }, // S — Raymond Road area
        { lat: 32.31800, lng: -90.55500 }, // SW — Baker's Creek drainage
        { lat: 32.33000, lng: -90.57000 }, // W — ridge foot above creek
      ],
    },
  ],
  phases: [
    {
      // Phase 1 — Porter's run, night Apr 16 1863, plus Sherman's Yazoo feint Apr 29.
      // CRITICAL: Porter's path follows the 1863 channel alignment past the city
      // waterfront (lon ≈ –90.905 to –90.908), NOT the modern Mississippi which
      // lies ~10–12 km west at the same latitudes after the 1876 De Soto cutoff.
      // The fleet assembled near Young's Point / Milliken's Bend (W bank,
      // Louisiana) and ran DOWNSTREAM (southward), rounding the De Soto bend
      // and passing the battery arc from Fort Hill (N) through the city front
      // to South Fort (S), then continuing south toward Grand Gulf.
      //
      // Sherman's feint (Apr 29 – May 1) went UP the Yazoo River (NE) from
      // the Mississippi confluence toward Snyder's/Haynes' Bluff — the reverse
      // of the SW direction shown in the original data.
      caption:
        "Porter's gunboats and transport fleet run the Vicksburg batteries in darkness — hulls ablaze with burning cotton, guns firing continuously — opening the southern crossing route. Simultaneously Sherman stages a noisy Yazoo River feint toward Snyder's Bluff to fix Confederate attention north of the city.",
      duration: 8,
      events: [
        {
          coords: { lat: 32.35200, lng: -90.90800 },
          label: "Porter's fleet runs the water batteries — night of April 16",
        },
      ],
      movements: [
        {
          // Porter's fleet: downstream run, FOLLOWING THE 1863 CHANNEL.
          // Start at Young's Point (W bank, ~32.50, –91.09).
          // The river there is essentially unchanged from 1863 (OSM node
          // 32.49326, –91.11917 is the modern channel upstream of the bend).
          // After rounding the De Soto bend the fleet entered the OLD channel
          // running S along the city bluffs at lon ≈ –90.905 to –90.908.
          // Below the city the channel trends SW toward Grand Gulf.
          side: 'union',
          style: 'advance',
          unit: "Porter's gunboat fleet — downstream run",
          branch: 'naval',
          echelon: 'flotilla',
          path: [
            { lat: 32.50000, lng: -91.09000 }, // Young's Point / Milliken's Bend staging area
            { lat: 32.44700, lng: -90.91600 }, // Past Yazoo R. confluence — entering De Soto bend
            { lat: 32.39500, lng: -90.91000 }, // De Soto Point — 1863 channel bend apex
            { lat: 32.37800, lng: -90.90500 }, // Fort Hill / N batteries (1863 channel)
            { lat: 32.35200, lng: -90.90800 }, // City-front Water Battery (1863 channel)
            { lat: 32.33300, lng: -90.92200 }, // Past South Fort — leaving the battery arc
            { lat: 32.05000, lng: -91.00000 }, // Below Grand Gulf — rally point
          ],
        },
        {
          // Confederate river batteries along the Vicksburg bluffs.
          // Fort Hill to South Fort covers ~5 km of waterfront.
          side: 'confederate',
          style: 'feint',
          unit: "Vicksburg river batteries — Fort Hill",
          branch: 'artillery',
          echelon: 'regiment', // battery-level formation (smallest echelon available)
          path: [
            { lat: 32.37800, lng: -90.85500 }, // Fort Hill (N anchor, ridge top)
            { lat: 32.35200, lng: -90.85200 }, // Water Battery / city centre
            { lat: 32.32700, lng: -90.87000 }, // South Fort (S anchor)
          ],
        },
        {
          // Sherman's feint: XV Corps transports and Breese's gunboats
          // entered the Yazoo River from its Mississippi confluence and
          // steamed NE toward Snyder's/Haynes' Bluff (Apr 29 – May 1).
          // Snyder's Bluff confirmed at 32.4964, –90.8000 (Wikipedia GPS).
          // Chickasaw Bayou junction ~32.468, –90.842 was the approach route.
          side: 'union',
          style: 'feint',
          unit: "Sherman / Breese — Yazoo River feint",
          branch: 'naval', // Breese's gunboats + XV Corps transports — a riverine flotilla feint
          echelon: 'flotilla',
          path: [
            { lat: 32.44700, lng: -90.91600 }, // Yazoo R. confluence with Mississippi
            { lat: 32.46800, lng: -90.84200 }, // Chickasaw Bayou junction on Yazoo
            { lat: 32.49639, lng: -90.80000 }, // Snyder's / Haynes' Bluff (confirmed)
          ],
        },
      ],
    },
    {
      // Phase 2 — Bruinsburg crossing & Battle of Port Gibson, Apr 30 – May 1.
      // Fleet delivered troops to Bruinsburg landing (31.9665, –91.1262),
      // the largest unopposed amphibious operation in US history to that date.
      // Both XIII Corps (McClernand) and XVII Corps (McPherson) crossed here.
      // Battle of Port Gibson site: 31.95583, –91.02278 (Wikipedia).
      // Port Gibson town: ~31.956, –90.979.
      caption:
        "McClernand's and McPherson's corps cross at Bruinsburg — the largest unopposed amphibious landing in American history — then push inland 10 miles to Port Gibson, crushing Bowen's outnumbered division and cutting Grand Gulf's supply line.",
      duration: 8,
      movements: [
        {
          // McClernand XIII Corps — landed first, fought at Port Gibson.
          // Battle of Port Gibson coordinates confirmed from Wikipedia.
          side: 'union',
          style: 'advance',
          unit: 'McClernand — XIII Corps',
          branch: 'infantry',
          echelon: 'corps',
          strength: 17000,
          path: [
            { lat: 31.96650, lng: -91.12620 }, // Bruinsburg landing (river bank)
            { lat: 31.95583, lng: -91.02278 }, // Port Gibson battle site (Magnolia Church area)
            { lat: 31.95600, lng: -90.97870 }, // Port Gibson town — secured May 1
          ],
        },
        {
          // McPherson XVII Corps — crossed behind McClernand, pushed through.
          side: 'union',
          style: 'advance',
          unit: 'McPherson — XVII Corps',
          branch: 'infantry',
          echelon: 'corps',
          strength: 11000,
          path: [
            { lat: 31.96650, lng: -91.12620 }, // Bruinsburg landing
            { lat: 31.96000, lng: -91.01000 }, // Battle approach (N column)
            { lat: 31.96500, lng: -90.97870 }, // Port Gibson area
          ],
        },
        {
          // Bowen's Confederate division retreated N after Port Gibson,
          // ultimately abandoning Grand Gulf and falling back toward Vicksburg.
          side: 'confederate',
          style: 'retreat',
          unit: "Bowen's division — retreat from Port",
          branch: 'infantry',
          echelon: 'division',
          strength: 8000,
          path: [
            { lat: 31.95583, lng: -91.02278 }, // Port Gibson battlefield
            { lat: 32.00000, lng: -90.96000 }, // Grand Gulf (evacuated May 3)
          ],
        },
      ],
    },
    {
      // Phase 3 — Inland drive to Jackson, then the wheel west, May 7–14.
      // McPherson (XVII) advanced NE through Utica then NE to Raymond (May 12).
      // Raymond battle site confirmed 32.23917, –90.44861 (Fourteen Mile Creek,
      // SW of Raymond town). After Raymond, both McPherson and Sherman drove NE
      // to Jackson (May 14). Jackson coordinates: 32.2988, –90.1848.
      // Johnston retreated N toward Canton.  Grant immediately pivoted WEST
      // to interpose between Johnston and Pemberton, heading toward Bolton →
      // Champion Hill.
      caption:
        "Cutting loose from his supply line, Grant drives northeast: McPherson beats Gregg at Raymond (May 12), then he and Sherman storm Jackson (May 14), wrecking its rail yards as Johnston retreats north.",
      duration: 6,
      movements: [
        {
          // McPherson XVII Corps: Port Gibson → Utica → Raymond → Jackson.
          // Raymond battle at Fourteen Mile Creek (confirmed coords).
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps",
          branch: 'infantry',
          echelon: 'corps',
          strength: 11000,
          path: [
            { lat: 31.95600, lng: -90.97870 }, // Port Gibson
            { lat: 32.08700, lng: -90.75000 }, // Utica area (approximate waypoint)
            { lat: 32.23917, lng: -90.44861 }, // Raymond battlefield (Fourteen Mile Creek)
            { lat: 32.29880, lng: -90.18480 }, // Jackson, MS
          ],
        },
        {
          // Sherman XV Corps: crossed river later, advanced via Raymond Road
          // to converge on Jackson from SW.
          side: 'union',
          style: 'advance',
          unit: "Sherman — XV Corps",
          branch: 'infantry',
          echelon: 'corps',
          strength: 18000,
          path: [
            { lat: 31.96000, lng: -90.97000 }, // Port Gibson / Bayou Pierre area
            { lat: 32.15000, lng: -90.55000 }, // NE through Mississippi interior
            { lat: 32.25850, lng: -90.41180 }, // Raymond town (N side)
            { lat: 32.29880, lng: -90.18480 }, // Jackson, MS
          ],
        },
        {
          // Johnston's Confederates retreated N from Jackson toward Canton.
          side: 'confederate',
          style: 'retreat',
          unit: "Johnston's Army of Relief — retreat",
          branch: 'command', // army-level command marker
          echelon: 'corps', // "Army of …" → largest available echelon
          strength: 6000,
          path: [
            { lat: 32.29880, lng: -90.18480 }, // Jackson
            { lat: 32.41100, lng: -90.07200 }, // Canton area (~25 mi N)
          ],
        },
      ],
    },
    {
      caption:
        "With Jackson in ruins behind him, Grant immediately wheels west — McPherson drives from Jackson through Bolton toward Champion Hill to cut Pemberton off from his last hope of relief.",
      duration: 4,
      movements: [
        {
          // McPherson wheels WEST immediately after Jackson falls (May 14).
          // Route: Jackson → Clinton → Bolton → toward Champion Hill.
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps",
          branch: 'infantry',
          echelon: 'corps',
          strength: 11000,
          path: [
            { lat: 32.29880, lng: -90.18480 }, // Jackson
            { lat: 32.33600, lng: -90.46200 }, // Bolton, MS (Southern RR junction)
            { lat: 32.33333, lng: -90.52778 }, // Champion Hill
          ],
        },
      ],
    },
    {
      // Phase 4 — Champion Hill & Big Black River, May 16–17.
      // Champion Hill confirmed at 32.33333, –90.52778 (Wikipedia).
      // Big Black River Bridge confirmed at 32.34694, –90.70417 (Wikipedia).
      // Hovey's division hit Pemberton's Confederate left/center from the NE
      // on the Middle Road; Logan's division (McPherson) outflanked from the E,
      // cutting the Raymond Road escape route at the crossroads.
      // McClernand's corps attacked the Confederate right (S) but weakly.
      // After the ridge fell, Confederates fled W via the Raymond Road crossing
      // of Baker's Creek, then to Big Black, then into Vicksburg.
      caption:
        "At Champion Hill (May 16), Hovey's division storms the ridge from the northeast and Logan's division cuts the Raymond Road — Pemberton's army shatters. The remnants are routed again at Big Black River (May 17) and retreat into Vicksburg's works.",
      duration: 7,
      movements: [
        {
          // Hovey's 12th Division (XII Corps / McClernand): attacked center-left
          // from the NE, approaching via the Middle Road.
          side: 'union',
          style: 'advance',
          unit: "Hovey — 12th Division",
          branch: 'infantry',
          echelon: 'division',
          strength: 3600,
          path: [
            { lat: 32.32500, lng: -90.49500 }, // Approach from E on Middle Road
            { lat: 32.33333, lng: -90.52778 }, // Champion Hill crest
          ],
        },
        {
          // Logan's 3rd Division (XVII Corps / McPherson): flanked S,
          // cut the Raymond Road behind Baker's Creek crossing.
          side: 'union',
          style: 'advance',
          unit: "Logan — 3rd Division",
          branch: 'infantry',
          echelon: 'division',
          path: [
            { lat: 32.32000, lng: -90.50500 }, // Approach from SE
            { lat: 32.31800, lng: -90.52800 }, // Baker's Creek crossroads
            { lat: 32.33333, lng: -90.52778 }, // Joins on the ridge
          ],
        },
        {
          // McClernand's XIII Corps: marched up from Port Gibson via Raymond Road,
          // attacked Confederate right (S) at Champion Hill, then drove W toward Big Black.
          // Continuity: leg now begins at his phase-2 endpoint (Port Gibson) so the
          // counter slides through the May campaign march into the battle.
          side: 'union',
          style: 'advance',
          unit: "McClernand — XIII Corps",
          branch: 'infantry',
          echelon: 'corps',
          strength: 17000,
          path: [
            { lat: 31.95600, lng: -90.97870 }, // continuity: resumes from Port Gibson (phase 2 end)
            { lat: 32.23917, lng: -90.44861 }, // up via Raymond Road / Fourteen Mile Creek
            { lat: 32.33333, lng: -90.52778 }, // Champion Hill
            { lat: 32.34694, lng: -90.70417 }, // Big Black River Bridge (confirmed)
          ],
        },
        {
          // Pemberton's army: routed W from Champion Hill, rearguard shattered
          // at Big Black River Bridge, then into Vicksburg works.
          side: 'confederate',
          style: 'retreat',
          unit: "Pemberton's Army of Mississippi",
          branch: 'command', // army-level command marker
          echelon: 'corps', // "Army of …" → largest available echelon
          strength: 22000,
          path: [
            { lat: 32.33333, lng: -90.52778 }, // Champion Hill (collapse)
            { lat: 32.34694, lng: -90.70417 }, // Big Black River Bridge (rout, May 17)
            { lat: 32.35260, lng: -90.87790 }, // Vicksburg — into the works
          ],
        },
      ],
    },
    {
      // Phase 5 — Siege, May 18 – July 4, 1863.
      // Grant's three corps invested the Confederate perimeter from the N, E, and S.
      // Sherman (XV) covered the Graveyard Road sector (NE/N arc).
      // McPherson (XVII) held the center on the Jackson Road (E arc).
      // McClernand then Ord (XIII) held the south on the Baldwin Ferry / Southern RR.
      // Two infantry assaults (May 19 and May 22) were repulsed.
      // Pemberton surrendered 30,000 men on July 4.
      // Stockade Redan (Sherman's target) confirmed at 32.36992, –90.84474.
      caption:
        "Forty-seven days of siege: Grant's three corps close a ring around the city; two infantry assaults are repulsed, then mines, approach saps, and starvation do the work — Pemberton surrenders 30,000 men on July 4.",
      duration: 9,
      events: [
        {
          coords: { lat: 32.35260, lng: -90.87790 },
          label: 'Pemberton surrenders 30,000 men — July 4, 1863',
        },
      ],
      movements: [
        {
          // Sherman XV Corps: marched W from Jackson via Bolton and Bridgeport, swung
          // onto the north arc from the Yazoo bluffs (after Haynes' Bluff occupied May 18)
          // curving SW to Graveyard Road / Stockade Redan.
          // Continuity: leg now begins at his phase-3 endpoint (Jackson).
          side: 'union',
          style: 'advance',
          unit: "Sherman — XV Corps",
          branch: 'infantry',
          echelon: 'corps',
          strength: 18000,
          path: [
            { lat: 32.29880, lng: -90.18480 }, // continuity: resumes from Jackson (phase 3 end)
            { lat: 32.33600, lng: -90.46200 }, // W via Bolton (Southern RR junction)
            { lat: 32.41500, lng: -90.86000 }, // Yazoo R. / Haynes' Bluff approach (N flank anchor)
            { lat: 32.38500, lng: -90.85800 }, // N siege line exterior
            { lat: 32.37200, lng: -90.84500 }, // Opposite Stockade Redan (Sherman's objective)
          ],
        },
        {
          // McPherson XVII Corps: pursued W from Champion Hill to invest the city,
          // taking the center / E arc along Jackson Road.
          // Great Redoubt ~32.350, –90.840 was McPherson's primary objective.
          // Continuity: leg now begins at his phase-4 endpoint (Champion Hill).
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps",
          branch: 'infantry',
          echelon: 'corps',
          strength: 11000,
          path: [
            { lat: 32.33333, lng: -90.52778 }, // continuity: resumes from Champion Hill (phase 4 end)
            { lat: 32.34694, lng: -90.70417 }, // W via Big Black River crossing
            { lat: 32.36000, lng: -90.86500 }, // E exterior siege line
            { lat: 32.35200, lng: -90.85400 }, // Opposite Great Redoubt / 3rd Louisiana Redan
          ],
        },
        {
          // McClernand / Ord XIII Corps: south arc from Southern Railroad
          // to the river bluffs at South Fort.
          side: 'union',
          style: 'advance',
          unit: "McClernand / Ord — XIII Corps",
          branch: 'infantry',
          echelon: 'corps',
          path: [
            { lat: 32.33800, lng: -90.87500 }, // SE exterior (Railroad Redoubt approach)
            { lat: 32.32800, lng: -90.89000 }, // S exterior toward South Fort bluff
          ],
        },
        {
          // Pemberton's garrison: pinned in the works.
          // Short token path at the city center / surrender point.
          side: 'confederate',
          style: 'retreat',
          unit: "Pemberton's garrison — 47-day defence",
          branch: 'command', // army-level command marker (besieged garrison HQ)
          echelon: 'corps',
          strength: 30000,
          path: [
            { lat: 32.35260, lng: -90.87790 }, // City / headquarters
            { lat: 32.35000, lng: -90.87500 }, // (token: no retreat, in place)
          ],
        },
      ],
    },
  ],
}

// ─── Chattanooga ─────────────────────────────────────────────────────────────
// Nov 1863 · City 35.0456, -85.3097 · Lookout Mountain 35.0103, -85.3403
// Missionary Ridge ~35.0220, -85.2486 · Orchard Knob 35.0330, -85.2768
// Tunnel Hill ~35.058, -85.253
// Union ~56,000 / Confederate ~44,000
const chattanooga: Battle = {
  name: 'Battle of Chattanooga',
  date: 'November 23-25, 1863',
  sides: SIDES,
  strengths: { union: '~56,000 men', confederate: '~44,000 men' },
  // Camera stands SE of city looking NW — Lookout Mountain on left,
  // Missionary Ridge spanning the frame, Orchard Knob in centre-left.
  fieldAzimuth: 135,
  areas: [
    {
      // Missionary Ridge: true OSM crest (way 1235937432) sampled to ~15 pts,
      // widened ~250 m either side of centreline to form a polygon band.
      // Ridge runs SSE–NNW; south end at Rossville Gap, north end near Tunnel Hill.
      name: 'Missionary Ridge',
      kind: 'terrain',
      outline: [
        // West / left edge (city-facing slope), south to north
        { lat: 34.98600, lng: -85.28200 },
        { lat: 34.99100, lng: -85.27950 },
        { lat: 34.99900, lng: -85.27500 },
        { lat: 35.00500, lng: -85.27450 },
        { lat: 35.01400, lng: -85.27000 },
        { lat: 35.02200, lng: -85.26500 },
        { lat: 35.03000, lng: -85.26000 },
        { lat: 35.04000, lng: -85.25700 },
        { lat: 35.05000, lng: -85.25300 },
        { lat: 35.06000, lng: -85.24900 },
        // North tip (Tunnel Hill)
        { lat: 35.07000, lng: -85.24400 },
        { lat: 35.07900, lng: -85.24350 },
        // East / back slope, north to south
        { lat: 35.07800, lng: -85.23750 },
        { lat: 35.06900, lng: -85.23650 },
        { lat: 35.05900, lng: -85.24000 },
        { lat: 35.04900, lng: -85.24600 },
        { lat: 35.04000, lng: -85.24900 },
        { lat: 35.03000, lng: -85.25200 },
        { lat: 35.02200, lng: -85.25750 },
        { lat: 35.01400, lng: -85.26300 },
        { lat: 35.00400, lng: -85.26800 },
        { lat: 34.99800, lng: -85.27050 },
        { lat: 34.99100, lng: -85.27400 },
        { lat: 34.98600, lng: -85.27600 },
      ],
    },
    {
      // Lookout Mountain massif: the prow-shaped plateau.
      // OSM administrative boundary (relation 195845) spans lat 34.983–35.013,
      // lng -85.365 to -85.342.  Point Park / palisades at 35.011, -85.344.
      // The battle was fought on the NW / W face and the bench below the palisades.
      name: 'Lookout Mountain',
      kind: 'terrain',
      outline: [
        { lat: 35.01280, lng: -85.34350 }, // Point Park NE corner
        { lat: 35.01150, lng: -85.34510 }, // Point Park NW
        { lat: 35.00950, lng: -85.34700 }, // NW palisade base
        { lat: 35.00400, lng: -85.35200 }, // N slope
        { lat: 34.99900, lng: -85.35600 }, // W face
        { lat: 34.98350, lng: -85.36450 }, // SW foot (Lookout Mountain town)
        { lat: 34.98000, lng: -85.36000 }, // S face
        { lat: 34.98500, lng: -85.34800 }, // SE face
        { lat: 34.99000, lng: -85.34200 }, // E base / Chattanooga Valley
        { lat: 35.00000, lng: -85.33800 }, // NE foot / Lookout Creek valley
        { lat: 35.01000, lng: -85.33700 }, // NE base
        { lat: 35.01380, lng: -85.34100 }, // Cravens House area / NE bench
      ],
    },
    {
      // Orchard Knob Reservation: NPS historic battlefield site.
      // OSM way 147177617 — bounds 35.0384–35.0405, -85.2746 to -85.2725.
      // NOTE: The original code placed this ~750 m too far south at 35.033.
      name: 'Orchard Knob',
      kind: 'terrain',
      outline: [
        { lat: 35.04048, lng: -85.27379 },
        { lat: 35.04045, lng: -85.27370 },
        { lat: 35.04004, lng: -85.27258 },
        { lat: 35.03966, lng: -85.27272 },
        { lat: 35.03882, lng: -85.27307 },
        { lat: 35.03844, lng: -85.27325 },
        { lat: 35.03894, lng: -85.27463 },
        { lat: 35.03945, lng: -85.27436 },
      ],
    },
    {
      // Tennessee River — Moccasin Bend / downtown reach.
      // Built from OSM ways 639283335 (S bank, E of city), 973340976 (S bank, neck),
      // and 77442838 (N bank, Moccasin Bend → Brown's Ferry).
      // Simplified to a representative ~10-pt polygon of the river channel.
      name: 'Tennessee River',
      kind: 'water',
      outline: [
        // S bank, E approach (from NE, flowing SW):
        { lat: 35.09800, lng: -85.23500 },
        { lat: 35.09000, lng: -85.25900 },
        { lat: 35.08000, lng: -85.27600 },
        { lat: 35.06700, lng: -85.28000 },
        // Moccasin Bend neck (river turns NW):
        { lat: 35.05570, lng: -85.28900 },
        { lat: 35.05560, lng: -85.31500 },
        // Brown's Ferry crossing area:
        { lat: 35.05700, lng: -85.32800 },
        { lat: 35.06100, lng: -85.33700 },
        // N bank, heading upstream NW:
        { lat: 35.06900, lng: -85.34000 },
        { lat: 35.07500, lng: -85.34900 },
        { lat: 35.08600, lng: -85.35200 },
        { lat: 35.09700, lng: -85.35200 },
        // Close back to NE
        { lat: 35.10400, lng: -85.24000 },
      ],
    },
  ],
  phases: [
    {
      caption:
        "Nov 23: Thomas's Army of the Cumberland advances in parade formation from Chattanooga, " +
        'seizing Orchard Knob in a sharp two-hour fight — a Confederate outpost that becomes ' +
        "Grant's command post for the battle.",
      duration: 7,
      events: [
        {
          coords: { lat: 35.03960, lng: -85.27350 },
          label: 'Orchard Knob seized — Grant establishes HQ here',
        },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Wood's division — centre column",
          branch: 'infantry',
          echelon: 'division',
          // Starts at Union line just E of Chattanooga (~35.047,-85.295),
          // advances ENE straight to Orchard Knob crest.
          path: [
            { lat: 35.04700, lng: -85.29500 },
            { lat: 35.04300, lng: -85.28500 },
            { lat: 35.04000, lng: -85.27750 },
            { lat: 35.03960, lng: -85.27350 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Sheridan's division",
          branch: 'infantry',
          echelon: 'division',
          strength: 6000,
          // Advances slightly SE of Wood's axis toward the S end of the knob.
          path: [
            { lat: 35.04300, lng: -85.29200 },
            { lat: 35.04000, lng: -85.28200 },
            { lat: 35.03850, lng: -85.27400 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Walthall's brigade — Orchard Knob",
          branch: 'infantry',
          echelon: 'brigade',
          strength: 1500,
          // Retreats ~1 mile E from knob to the rifle-pits at the base of Missionary Ridge.
          // Ridge base at this latitude is ~lng -85.264 (OSM ridge W edge).
          path: [
            { lat: 35.03960, lng: -85.27350 },
            { lat: 35.03500, lng: -85.27000 },
            { lat: 35.03000, lng: -85.26500 },
            { lat: 35.02800, lng: -85.26200 },
          ],
        },
      ],
    },
    {
      caption:
        "Nov 24: Hooker's three divisions climb Lookout Mountain from Lookout Valley. " +
        "Crossing Lookout Creek at Wauhatchie, they assault the bench below the palisades, " +
        "outflank Walthall's line at the Cravens House by mid-morning, and seize the summit — " +
        "the 'Battle Above the Clouds.'",
      duration: 8,
      events: [
        {
          coords: { lat: 35.01140, lng: -85.34410 },
          label: '"Battle Above the Clouds" — Lookout Mountain summit cleared',
        },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Geary's division — crossed Lookout",
          branch: 'infantry',
          echelon: 'division',
          // Starts in Lookout Valley S of the creek (~34.985,-85.390),
          // crosses creek, advances up the western bench to Cravens House,
          // then rounds the NE face toward Point Park / the summit prow.
          path: [
            { lat: 34.98500, lng: -85.39000 },
            { lat: 34.99500, lng: -85.37500 },
            { lat: 35.00500, lng: -85.36500 },
            { lat: 35.01380, lng: -85.34140 }, // Cravens House bench
            { lat: 35.01140, lng: -85.34410 }, // Point Park / summit prow
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Osterhaus's / Cruft's divisions",
          branch: 'infantry',
          echelon: 'division',
          // Cross the creek slightly further SE, advance along the lower bench
          // joining Geary near Cravens House.
          path: [
            { lat: 34.99000, lng: -85.38000 },
            { lat: 35.00000, lng: -85.36800 },
            { lat: 35.01000, lng: -85.35500 },
            { lat: 35.01300, lng: -85.34300 }, // reaching Cravens House level
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Stevenson's / Walthall's forces",
          branch: 'infantry',
          echelon: 'division', // mixed Stevenson + Walthall infantry, division-level grouping
          strength: 8726,
          // Confederate forces on Lookout Mountain withdrawn overnight via Summertown Road
          // eastward into Chattanooga Valley then NE to Missionary Ridge (NOT south).
          path: [
            { lat: 35.01140, lng: -85.34410 }, // summit
            { lat: 35.02000, lng: -85.32000 }, // descending NE slope
            { lat: 35.02500, lng: -85.30000 }, // Chattanooga Valley road
            { lat: 35.02800, lng: -85.27500 }, // reaching Missionary Ridge W base
          ],
        },
      ],
    },
    {
      caption:
        "Nov 25 morning: Sherman's four divisions assault Tunnel Hill at the north end of " +
        'Missionary Ridge, crossing south from the Tennessee River. All-day attacks ' +
        "are pinned by Cleburne's division on the false crest.",
      duration: 7,
      events: [
        {
          coords: { lat: 35.06003, lng: -85.24561 },
          label: "Tunnel Hill — Cleburne holds; Sherman's assaults repulsed",
        },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Ewing's division — north approach",
          branch: 'infantry',
          echelon: 'division',
          // Sherman's men crossed the Tennessee to a bridgehead ~35.09,-85.265,
          // advanced south along/across the hills toward Tunnel Hill.
          path: [
            { lat: 35.09000, lng: -85.26500 },
            { lat: 35.08000, lng: -85.26000 },
            { lat: 35.07000, lng: -85.25500 },
            { lat: 35.06400, lng: -85.24800 },
            { lat: 35.06003, lng: -85.24561 }, // Tunnel Hill crest
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "M. L. Smith's division — SW flank",
          branch: 'infantry',
          echelon: 'division',
          // Attacked via the valley E of Tunnel Hill, across open fields.
          path: [
            { lat: 35.08500, lng: -85.25500 },
            { lat: 35.07500, lng: -85.25000 },
            { lat: 35.06800, lng: -85.24700 },
            { lat: 35.06300, lng: -85.24400 },
          ],
        },
        {
          side: 'confederate',
          style: 'feint',
          unit: "Cleburne's division — Tunnel Hill",
          branch: 'infantry',
          echelon: 'division',
          strength: 4000,
          // Cleburne holds the Tunnel Hill crest and knocks back every attack.
          // Short segment showing the defended line on the actual ridge crest.
          path: [
            { lat: 35.06553, lng: -85.24027 }, // N anchor of Cleburne's line
            { lat: 35.06207, lng: -85.24303 }, // mid-Tunnel Hill
            { lat: 35.06003, lng: -85.24561 }, // S end near the tunnel itself
          ],
        },
      ],
    },
    {
      caption:
        "Nov 25 afternoon: Thomas's men, ordered only to take the rifle-pits at the ridge base, " +
        "spontaneously keep climbing — four divisions pour over the crest; Bragg's centre " +
        'collapses and his army dissolves south toward Chickamauga Station.',
      duration: 9,
      events: [
        {
          coords: { lat: 35.03106, lng: -85.25664 },
          label: "Unauthorized charge — Thomas's men crest Missionary Ridge",
        },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Wood's division — centre charge",
          branch: 'infantry',
          echelon: 'division',
          // From Orchard Knob (35.040,-85.274), due east to the ridge crest
          // at the corresponding latitude (OSM ridge pt ~35.031, -85.257).
          path: [
            { lat: 35.03960, lng: -85.27350 }, // Orchard Knob
            { lat: 35.03700, lng: -85.27000 },
            { lat: 35.03400, lng: -85.26500 },
            { lat: 35.03200, lng: -85.26100 },
            { lat: 35.03106, lng: -85.25664 }, // ridge crest (OSM pt 47)
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Sheridan's division",
          branch: 'infantry',
          echelon: 'division',
          strength: 6000,
          // Sheridan's axis: slightly south of Wood's, angling SE to crest
          // at OSM ridge pt ~35.020,-85.262 (OSM pt 37).
          path: [
            { lat: 35.03500, lng: -85.27500 },
            { lat: 35.03000, lng: -85.26800 },
            { lat: 35.02500, lng: -85.26400 },
            { lat: 35.02191, lng: -85.26155 }, // Sheridan's breakthrough point (OSM pt 38)
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Baird's division — left / north of Wood",
          branch: 'infantry',
          echelon: 'division',
          // Baird's axis: north of Wood, advances from city's NE and hits the ridge
          // near OSM pt 35.038,-85.254 (OSM pts 50-52).
          path: [
            { lat: 35.04500, lng: -85.27800 },
            { lat: 35.04300, lng: -85.27000 },
            { lat: 35.04000, lng: -85.26500 },
            { lat: 35.03800, lng: -85.25900 },
            { lat: 35.03613, lng: -85.25436 }, // Baird's crest point (OSM pt 52)
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Bragg's centre — general rout",
          branch: 'command', // Bragg's Army of Tennessee centre — army-level command marker
          echelon: 'corps',
          // CSA forces flee SE off the back (E) slope in two columns:
          // one toward Chickamauga Station (~34.97,-85.21), one via Rossville Gap south.
          path: [
            { lat: 35.03106, lng: -85.25664 }, // ridge crest at breakthrough
            { lat: 35.02500, lng: -85.24500 }, // back slope
            { lat: 35.01000, lng: -85.23500 }, // descending SE
            { lat: 35.00000, lng: -85.22500 }, // heading toward Chickamauga Station
            { lat: 34.97500, lng: -85.21000 }, // Chickamauga Station area
          ],
        },
      ],
    },
  ],
}

// Keys = memoir chapter numbers whose stops receive the battle overlay.
// Ch. 22 = "Fort Donelson, Tennessee" (Feb 1862) -- the investment + "unconditional surrender" stop.
// Ch. 24 = first Shiloh stop (Apr 6 1862) -- the surprise attack day.
// Ch. 38 = "Vicksburg, Mississippi" (May-Jul 1863) -- the siege stop.
// Ch. 43 = "Ch. 43 -- Lookout Mountain" (Nov 24 1863) -- first day of the Chattanooga battle.
export const grantBattles: Record<number, Battle> = {
  22: fortDonelson,
  24: shiloh,
  38: vicksburg,
  43: chattanooga,
}
