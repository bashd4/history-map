import type { Battle } from '../../data/schema'

// NOTE: All phases must set an explicit `duration` — the 6s playback default is tuned for city-scale battles, not campaign-scale phases.
const SIDES = { union: '#4d8fdb', confederate: '#c0392b' }

// ─── Fort Donelson ──────────────────────────────────────────────────────────
// Feb 12–16, 1862 · Fort at 36.4922, -87.8617 on the Cumberland River
// Union ~24,500 / Confederate ~16,000
const fortDonelson: Battle = {
  name: 'Battle of Fort Donelson',
  date: 'February 12-16, 1862',
  sides: SIDES,
  strengths: { union: '~24,500 men', confederate: '~16,000 men' },
  // Camera stands NW on the river, looking SE across the fort and bluffs.
  fieldAzimuth: 315,
  areas: [
    {
      name: 'Fort Donelson',
      kind: 'terrain',
      outline: [
        { lat: 36.4940, lng: -87.8650 },
        { lat: 36.4955, lng: -87.8630 },
        { lat: 36.4960, lng: -87.8600 },
        { lat: 36.4945, lng: -87.8580 },
        { lat: 36.4920, lng: -87.8575 },
        { lat: 36.4905, lng: -87.8595 },
        { lat: 36.4910, lng: -87.8630 },
        { lat: 36.4928, lng: -87.8648 },
      ],
    },
    {
      name: 'Dover',
      kind: 'settlement',
      outline: [
        { lat: 36.4900, lng: -87.8510 },
        { lat: 36.4905, lng: -87.8475 },
        { lat: 36.4880, lng: -87.8460 },
        { lat: 36.4858, lng: -87.8470 },
        { lat: 36.4855, lng: -87.8500 },
        { lat: 36.4875, lng: -87.8518 },
      ],
    },
    {
      name: 'Outer Confederate Trenches',
      kind: 'terrain',
      outline: [
        { lat: 36.5150, lng: -87.8950 },
        { lat: 36.5100, lng: -87.8900 },
        { lat: 36.5050, lng: -87.8850 },
        { lat: 36.4980, lng: -87.8750 },
        { lat: 36.4920, lng: -87.8700 },
        { lat: 36.4880, lng: -87.8680 },
        { lat: 36.4850, lng: -87.8620 },
        { lat: 36.4870, lng: -87.8550 },
        { lat: 36.4930, lng: -87.8520 },
        { lat: 36.5020, lng: -87.8560 },
        { lat: 36.5100, lng: -87.8650 },
        { lat: 36.5180, lng: -87.8780 },
      ],
    },
  ],
  phases: [
    {
      caption:
        "Grant's infantry closes the land ring around the fort while Foote's gunboat flotilla steams up the Cumberland — McClernand's division anchors the right, Smith's the left, Wallace's in reserve.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: 'McClernand — 1st Division',
          path: [
            { lat: 36.545, lng: -87.930 },
            { lat: 36.520, lng: -87.910 },
            { lat: 36.505, lng: -87.895 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: 'C. F. Smith — 2nd Division',
          path: [
            { lat: 36.448, lng: -87.920 },
            { lat: 36.468, lng: -87.890 },
            { lat: 36.485, lng: -87.868 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Foote's Gunboat Flotilla",
          path: [
            { lat: 36.530, lng: -87.840 },
            { lat: 36.510, lng: -87.845 },
            { lat: 36.498, lng: -87.852 },
          ],
        },
      ],
    },
    {
      caption:
        "Foote's four ironclads press within 400 yards of the water batteries — accurate plunging fire cripples the fleet; St. Louis and Louisville are both hulled and driven back downriver.",
      duration: 8,
      events: [
        { coords: { lat: 36.496, lng: -87.856 }, label: "Gunboats repulsed — Foote wounded aboard St. Louis" },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Foote's Gunboat Flotilla",
          path: [
            { lat: 36.510, lng: -87.845 },
            { lat: 36.496, lng: -87.856 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          unit: "Foote's Gunboat Flotilla",
          path: [
            { lat: 36.496, lng: -87.856 },
            { lat: 36.520, lng: -87.840 },
          ],
        },
        {
          side: 'confederate',
          style: 'feint',
          unit: "Maney's river battery",
          path: [
            { lat: 36.493, lng: -87.862 },
            { lat: 36.492, lng: -87.858 },
          ],
        },
      ],
    },
    {
      caption:
        "Pillow and Buckner break through McClernand's right, nearly forcing the Forge Road to Nashville — then Pillow, fearing Grant's return, orders the men back into the fort.",
      duration: 8,
      movements: [
        {
          side: 'confederate',
          style: 'advance',
          unit: "Pillow's division",
          path: [
            { lat: 36.492, lng: -87.862 },
            { lat: 36.510, lng: -87.900 },
            { lat: 36.525, lng: -87.928 },
          ],
        },
        {
          side: 'confederate',
          style: 'advance',
          unit: "Buckner's division",
          path: [
            { lat: 36.488, lng: -87.868 },
            { lat: 36.498, lng: -87.890 },
            { lat: 36.510, lng: -87.912 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          unit: 'McClernand — 1st Division',
          path: [
            { lat: 36.512, lng: -87.902 },
            { lat: 36.532, lng: -87.928 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Pillow's division",
          path: [
            { lat: 36.525, lng: -87.928 },
            { lat: 36.492, lng: -87.862 },
          ],
        },
      ],
    },
    {
      caption:
        "Grant orders an immediate counterattack; Smith's division breaks through the Confederate right while McClernand recovers the lost ground — Buckner asks for terms.",
      duration: 9,
      events: [
        { coords: { lat: 36.492, lng: -87.862 }, label: '"No terms except unconditional surrender" — Grant to Buckner' },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: 'McClernand — 1st Division',
          path: [
            { lat: 36.532, lng: -87.928 },
            { lat: 36.510, lng: -87.905 },
            { lat: 36.495, lng: -87.882 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: 'C. F. Smith — 2nd Division',
          path: [
            { lat: 36.480, lng: -87.870 },
            { lat: 36.488, lng: -87.862 },
            { lat: 36.492, lng: -87.855 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Lew Wallace — 3rd Division",
          path: [
            { lat: 36.510, lng: -87.888 },
            { lat: 36.500, lng: -87.876 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Buckner's division",
          path: [
            { lat: 36.492, lng: -87.862 },
            { lat: 36.490, lng: -87.856 },
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
      name: "Hornet's Nest",
      kind: 'woods',
      outline: [
        { lat: 35.1420, lng: -88.3480 },
        { lat: 35.1425, lng: -88.3460 },
        { lat: 35.1418, lng: -88.3435 },
        { lat: 35.1402, lng: -88.3420 },
        { lat: 35.1388, lng: -88.3428 },
        { lat: 35.1382, lng: -88.3455 },
        { lat: 35.1392, lng: -88.3475 },
        { lat: 35.1408, lng: -88.3482 },
      ],
    },
    {
      name: 'Pittsburg Landing',
      kind: 'settlement',
      outline: [
        { lat: 35.1420, lng: -88.3430 },
        { lat: 35.1428, lng: -88.3415 },
        { lat: 35.1415, lng: -88.3398 },
        { lat: 35.1398, lng: -88.3395 },
        { lat: 35.1388, lng: -88.3410 },
        { lat: 35.1395, lng: -88.3428 },
      ],
    },
    {
      name: 'Owl Creek Swamps',
      kind: 'water',
      outline: [
        { lat: 35.1600, lng: -88.3900 },
        { lat: 35.1580, lng: -88.3850 },
        { lat: 35.1555, lng: -88.3810 },
        { lat: 35.1530, lng: -88.3830 },
        { lat: 35.1520, lng: -88.3870 },
        { lat: 35.1545, lng: -88.3920 },
        { lat: 35.1575, lng: -88.3930 },
      ],
    },
    {
      name: 'Peach Orchard',
      kind: 'terrain',
      outline: [
        { lat: 35.1328, lng: -88.3290 },
        { lat: 35.1335, lng: -88.3272 },
        { lat: 35.1320, lng: -88.3258 },
        { lat: 35.1302, lng: -88.3262 },
        { lat: 35.1298, lng: -88.3280 },
        { lat: 35.1312, lng: -88.3295 },
      ],
    },
  ],
  phases: [
    {
      caption:
        "Before dawn Johnston's army crashes through the Union pickets — Hardee's corps leads, Bragg follows close; Sherman and McClernand are overwhelmed near Shiloh Church and fall back.",
      duration: 8,
      movements: [
        {
          side: 'confederate',
          style: 'advance',
          unit: "Hardee — III Corps (front wave)",
          path: [
            { lat: 35.110, lng: -88.385 },
            { lat: 35.128, lng: -88.368 },
            { lat: 35.138, lng: -88.357 },
          ],
        },
        {
          side: 'confederate',
          style: 'advance',
          unit: "Bragg — II Corps (second wave)",
          path: [
            { lat: 35.105, lng: -88.375 },
            { lat: 35.120, lng: -88.362 },
            { lat: 35.135, lng: -88.350 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          unit: 'Sherman — 5th Division',
          path: [
            { lat: 35.138, lng: -88.357 },
            { lat: 35.145, lng: -88.348 },
            { lat: 35.150, lng: -88.340 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          unit: 'McClernand — 1st Division',
          path: [
            { lat: 35.142, lng: -88.360 },
            { lat: 35.148, lng: -88.348 },
            { lat: 35.152, lng: -88.338 },
          ],
        },
      ],
    },
    {
      caption:
        "Prentiss anchors the Hornet's Nest with 2,200 men and repulses eleven Confederate charges for six hours; Johnston rides forward to direct the Peach Orchard assault and is hit.",
      duration: 9,
      events: [
        { coords: { lat: 35.131, lng: -88.327 }, label: 'Johnston mortally wounded leading the Peach Orchard charge' },
        { coords: { lat: 35.141, lng: -88.345 }, label: "Prentiss holds the Hornet's Nest — eleven charges repulsed" },
      ],
      movements: [
        {
          side: 'union',
          style: 'feint',
          unit: "Prentiss — 6th Division (Hornet's Nest)",
          path: [
            { lat: 35.141, lng: -88.346 },
            { lat: 35.140, lng: -88.344 },
          ],
        },
        {
          side: 'confederate',
          style: 'advance',
          unit: "Ruggles' massed artillery (62 guns)",
          path: [
            { lat: 35.130, lng: -88.352 },
            { lat: 35.136, lng: -88.347 },
          ],
        },
        {
          side: 'confederate',
          style: 'advance',
          unit: "Chalmers & Jackson — brigades",
          path: [
            { lat: 35.126, lng: -88.322 },
            { lat: 35.132, lng: -88.327 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Webster's artillery line — Landing",
          path: [
            { lat: 35.148, lng: -88.342 },
            { lat: 35.150, lng: -88.338 },
          ],
        },
      ],
    },
    {
      caption:
        "Prentiss's force, surrounded, surrenders at dusk; overnight Buell's Army of the Ohio crosses the river and Lew Wallace's lost division finally arrives on the right.",
      duration: 7,
      events: [
        { coords: { lat: 35.141, lng: -88.344 }, label: "Prentiss surrenders ~2,200 men — dusk, Apr 6" },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Nelson's div. (Buell) — river crossing",
          path: [
            { lat: 35.140, lng: -88.328 },
            { lat: 35.143, lng: -88.336 },
            { lat: 35.148, lng: -88.342 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Lew Wallace — 3rd Division",
          path: [
            { lat: 35.165, lng: -88.310 },
            { lat: 35.155, lng: -88.325 },
            { lat: 35.150, lng: -88.338 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Crittenden & McCook divisions (Buell)",
          path: [
            { lat: 35.138, lng: -88.328 },
            { lat: 35.140, lng: -88.334 },
            { lat: 35.145, lng: -88.340 },
          ],
        },
      ],
    },
    {
      caption:
        "Dawn on the 7th: the full Union line surges west — Sherman retakes Shiloh Church, Lew Wallace envelops the Confederate left, and Beauregard orders a general retreat toward Corinth.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: 'Sherman — 5th Division',
          path: [
            { lat: 35.148, lng: -88.344 },
            { lat: 35.140, lng: -88.354 },
            { lat: 35.138, lng: -88.358 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Lew Wallace — 3rd Division",
          path: [
            { lat: 35.152, lng: -88.340 },
            { lat: 35.148, lng: -88.352 },
            { lat: 35.143, lng: -88.362 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Hurlbut & McCook — center push",
          path: [
            { lat: 35.145, lng: -88.342 },
            { lat: 35.138, lng: -88.352 },
            { lat: 35.130, lng: -88.363 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Beauregard — Army of the Mississippi",
          path: [
            { lat: 35.138, lng: -88.357 },
            { lat: 35.120, lng: -88.372 },
            { lat: 35.105, lng: -88.388 },
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
      name: 'Vicksburg Fortress',
      kind: 'settlement',
      outline: [
        { lat: 32.3650, lng: -90.8900 },
        { lat: 32.3620, lng: -90.8820 },
        { lat: 32.3580, lng: -90.8760 },
        { lat: 32.3520, lng: -90.8720 },
        { lat: 32.3460, lng: -90.8740 },
        { lat: 32.3420, lng: -90.8800 },
        { lat: 32.3440, lng: -90.8880 },
        { lat: 32.3500, lng: -90.8930 },
        { lat: 32.3580, lng: -90.8940 },
      ],
    },
    {
      name: 'Champion Hill',
      kind: 'terrain',
      outline: [
        { lat: 32.3360, lng: -90.5700 },
        { lat: 32.3380, lng: -90.5650 },
        { lat: 32.3340, lng: -90.5600 },
        { lat: 32.3280, lng: -90.5590 },
        { lat: 32.3220, lng: -90.5620 },
        { lat: 32.3210, lng: -90.5680 },
        { lat: 32.3260, lng: -90.5730 },
        { lat: 32.3320, lng: -90.5730 },
      ],
    },
  ],
  phases: [
    {
      caption:
        "Porter's gunboats and transport fleet run the Vicksburg batteries in darkness — hulls ablaze with burning cotton, guns firing continuously — opening the southern crossing route.",
      duration: 8,
      events: [
        { coords: { lat: 32.353, lng: -90.878 }, label: "Porter's fleet runs the batteries — night of April 16" },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Porter's gunboat fleet — river run",
          path: [
            { lat: 32.500, lng: -90.880 },
            { lat: 32.353, lng: -90.878 },
            { lat: 32.100, lng: -91.100 },
          ],
        },
        {
          side: 'confederate',
          style: 'feint',
          unit: "Vicksburg river batteries",
          path: [
            { lat: 32.358, lng: -90.880 },
            { lat: 32.355, lng: -90.875 },
          ],
        },
        {
          side: 'union',
          style: 'feint',
          unit: "Sherman's corps — Haines' Bluff feint",
          path: [
            { lat: 32.420, lng: -90.820 },
            { lat: 32.400, lng: -90.835 },
          ],
        },
      ],
    },
    {
      caption:
        "McClernand's and McPherson's corps cross at Bruinsburg — the largest unopposed amphibious landing in American history — then push inland to Port Gibson, cutting Grand Gulf's supply line.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "McClernand — XIII Corps",
          path: [
            { lat: 31.967, lng: -91.126 },
            { lat: 31.958, lng: -91.000 },
            { lat: 31.965, lng: -90.983 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps",
          path: [
            { lat: 31.980, lng: -91.120 },
            { lat: 31.975, lng: -91.005 },
            { lat: 31.980, lng: -90.970 },
          ],
        },
      ],
    },
    {
      caption:
        "Turning east before Confederate forces can concentrate, McPherson takes Raymond; Sherman's corps marches from Milliken's Bend to join the drive on Jackson, which falls in a single day.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps (Raymond→Jackson)",
          path: [
            { lat: 32.000, lng: -90.900 },
            { lat: 32.160, lng: -90.680 },
            { lat: 32.299, lng: -90.185 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Sherman — XV Corps (Jackson flank)",
          path: [
            { lat: 32.050, lng: -90.820 },
            { lat: 32.200, lng: -90.500 },
            { lat: 32.299, lng: -90.185 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps (wheel west)",
          path: [
            { lat: 32.299, lng: -90.185 },
            { lat: 32.326, lng: -90.574 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Johnston's force — retreats north",
          path: [
            { lat: 32.299, lng: -90.185 },
            { lat: 32.360, lng: -90.200 },
          ],
        },
      ],
    },
    {
      caption:
        "At Champion Hill, Hovey's division cracks Pemberton's center; Logan's division cuts the Raymond Road — Pemberton's army is shattered and flees across the Big Black River.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Hovey — 12th Division (center assault)",
          path: [
            { lat: 32.310, lng: -90.545 },
            { lat: 32.326, lng: -90.574 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Logan — 3rd Division (flank cut)",
          path: [
            { lat: 32.315, lng: -90.560 },
            { lat: 32.340, lng: -90.590 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "McClernand — XIII Corps (Big Black)",
          path: [
            { lat: 32.326, lng: -90.574 },
            { lat: 32.348, lng: -90.730 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Pemberton's army — flight to Vicksburg",
          path: [
            { lat: 32.326, lng: -90.574 },
            { lat: 32.353, lng: -90.878 },
          ],
        },
      ],
    },
    {
      caption:
        "Forty-seven days of siege: Grant's three corps invest the city; two infantry assaults are repulsed, then mines and starvation do the work — Pemberton surrenders July 4.",
      duration: 9,
      events: [
        { coords: { lat: 32.353, lng: -90.878 }, label: "Pemberton surrenders 30,000 men — July 4, 1863" },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Sherman — XV Corps (north siege line)",
          path: [
            { lat: 32.380, lng: -90.870 },
            { lat: 32.365, lng: -90.875 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "McPherson — XVII Corps (center siege)",
          path: [
            { lat: 32.358, lng: -90.905 },
            { lat: 32.353, lng: -90.882 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "McClernand/Ord — XIII Corps (south line)",
          path: [
            { lat: 32.332, lng: -90.910 },
            { lat: 32.340, lng: -90.890 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Pemberton — Vicksburg garrison",
          path: [
            { lat: 32.353, lng: -90.878 },
            { lat: 32.350, lng: -90.875 },
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
  // Camera stands SE of the city, looking NW — Lookout Mountain rises on the left,
  // Missionary Ridge stretches across the frame, Orchard Knob in the middle distance.
  fieldAzimuth: 135,
  areas: [
    {
      name: 'Missionary Ridge',
      kind: 'terrain',
      // Elongated NE-SW band ~10 km, centered ~35.022, -85.249
      outline: [
        { lat: 35.0550, lng: -85.2350 },
        { lat: 35.0480, lng: -85.2280 },
        { lat: 35.0380, lng: -85.2330 },
        { lat: 35.0280, lng: -85.2420 },
        { lat: 35.0150, lng: -85.2560 },
        { lat: 35.0080, lng: -85.2650 },
        { lat: 35.0100, lng: -85.2720 },
        { lat: 35.0180, lng: -85.2680 },
        { lat: 35.0300, lng: -85.2560 },
        { lat: 35.0420, lng: -85.2440 },
        { lat: 35.0520, lng: -85.2370 },
      ],
    },
    {
      name: 'Lookout Mountain',
      kind: 'terrain',
      outline: [
        { lat: 35.0200, lng: -85.3500 },
        { lat: 35.0180, lng: -85.3420 },
        { lat: 35.0100, lng: -85.3380 },
        { lat: 34.9980, lng: -85.3420 },
        { lat: 34.9950, lng: -85.3520 },
        { lat: 35.0020, lng: -85.3600 },
        { lat: 35.0120, lng: -85.3590 },
      ],
    },
    {
      name: 'Orchard Knob',
      kind: 'terrain',
      outline: [
        { lat: 35.0352, lng: -85.2790 },
        { lat: 35.0360, lng: -85.2768 },
        { lat: 35.0348, lng: -85.2748 },
        { lat: 35.0330, lng: -85.2742 },
        { lat: 35.0318, lng: -85.2758 },
        { lat: 35.0325, lng: -85.2782 },
      ],
    },
  ],
  phases: [
    {
      caption:
        "Nov 23: Thomas's Army of the Cumberland moves out in parade formation and storms Orchard Knob, a bold daylight demonstration that seizes the Confederate outpost and anchors the Union center.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Wood's division — Orchard Knob",
          path: [
            { lat: 35.042, lng: -85.295 },
            { lat: 35.036, lng: -85.282 },
            { lat: 35.033, lng: -85.277 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Sheridan's division — right of Wood",
          path: [
            { lat: 35.038, lng: -85.288 },
            { lat: 35.032, lng: -85.274 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Walthall's brigade — outpost line",
          path: [
            { lat: 35.033, lng: -85.277 },
            { lat: 35.025, lng: -85.262 },
          ],
        },
      ],
    },
    {
      caption:
        "Nov 24: Hooker's three divisions climb Lookout Mountain through morning clouds; Walthall's brigade is outflanked and the summit is cleared by afternoon — the 'Battle Above the Clouds.'",
      duration: 8,
      events: [
        { coords: { lat: 35.010, lng: -85.340 }, label: '"Battle Above the Clouds" — Lookout Mountain summit cleared' },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Geary's division — up the east slope",
          path: [
            { lat: 34.992, lng: -85.368 },
            { lat: 35.002, lng: -85.352 },
            { lat: 35.010, lng: -85.340 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Osterhaus's division — along the base",
          path: [
            { lat: 34.990, lng: -85.358 },
            { lat: 35.000, lng: -85.345 },
            { lat: 35.008, lng: -85.335 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Stevenson's division — south face",
          path: [
            { lat: 35.010, lng: -85.340 },
            { lat: 35.018, lng: -85.312 },
            { lat: 35.022, lng: -85.280 },
          ],
        },
      ],
    },
    {
      caption:
        "Nov 25 morning: Sherman's four divisions assault Tunnel Hill at the north end of Missionary Ridge but are pinned on the false crest by Cleburne's division all day.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Ewing's division — north approach",
          path: [
            { lat: 35.068, lng: -85.258 },
            { lat: 35.060, lng: -85.255 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "M. L. Smith's division — tunnel flank",
          path: [
            { lat: 35.065, lng: -85.260 },
            { lat: 35.058, lng: -85.255 },
          ],
        },
        {
          side: 'confederate',
          style: 'feint',
          unit: "Cleburne's division — Tunnel Hill",
          path: [
            { lat: 35.058, lng: -85.253 },
            { lat: 35.055, lng: -85.250 },
          ],
        },
      ],
    },
    {
      caption:
        "Nov 25 afternoon: Thomas's men, ordered only to take the rifle-pits at the base, keep climbing — division after division pours over the crest; Bragg's center collapses and the army dissolves southward.",
      duration: 9,
      events: [
        { coords: { lat: 35.022, lng: -85.249 }, label: "Unauthorized charge — Thomas's men crest Missionary Ridge" },
      ],
      movements: [
        {
          side: 'union',
          style: 'advance',
          unit: "Wood's division — center of the ridge",
          path: [
            { lat: 35.033, lng: -85.277 },
            { lat: 35.027, lng: -85.262 },
            { lat: 35.022, lng: -85.249 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Sheridan's division — right flank charge",
          path: [
            { lat: 35.028, lng: -85.272 },
            { lat: 35.022, lng: -85.258 },
            { lat: 35.018, lng: -85.247 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          unit: "Baird's division — left of Wood",
          path: [
            { lat: 35.038, lng: -85.282 },
            { lat: 35.032, lng: -85.265 },
            { lat: 35.026, lng: -85.252 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          unit: "Bragg's center — general collapse",
          path: [
            { lat: 35.022, lng: -85.249 },
            { lat: 35.010, lng: -85.240 },
            { lat: 34.990, lng: -85.228 },
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
