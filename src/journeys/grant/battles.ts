import type { Battle } from '../../data/schema'

// NOTE: All phases must set an explicit `duration` — the 6s playback default is tuned for city-scale battles, not campaign-scale phases.
const SIDES = { union: '#4d8fdb', confederate: '#c0392b' }

// ─── Fort Donelson ──────────────────────────────────────────────────────────
// Feb 12–16, 1862 · Fort at 36.4922, -87.8617 on the Cumberland River
const fortDonelson: Battle = {
  name: 'Battle of Fort Donelson',
  date: 'February 12-16, 1862',
  sides: SIDES,
  phases: [
    {
      caption:
        "Grant's infantry closes the land ring around the fort, cutting every road north while Foote's gunboats steam up the Cumberland.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 36.54, lng: -87.92 },
            { lat: 36.51, lng: -87.88 },
            { lat: 36.49, lng: -87.86 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 36.45, lng: -87.92 },
            { lat: 36.48, lng: -87.88 },
            { lat: 36.49, lng: -87.86 },
          ],
        },
      ],
    },
    {
      caption:
        "Foote's four ironclads press within 400 yards of the water batteries -- accurate Confederate plunging fire cripples the fleet and drives it downriver.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 36.51, lng: -87.87 },
            { lat: 36.496, lng: -87.862 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          path: [
            { lat: 36.496, lng: -87.862 },
            { lat: 36.52, lng: -87.87 },
          ],
        },
      ],
    },
    {
      caption:
        "Pillow's Confederates smash through McClernand's right and nearly open the Forge Road to Nashville -- but Pillow orders his men back into the fort.",
      duration: 8,
      movements: [
        {
          side: 'confederate',
          style: 'advance',
          path: [
            { lat: 36.492, lng: -87.862 },
            { lat: 36.50, lng: -87.90 },
            { lat: 36.52, lng: -87.92 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          path: [
            { lat: 36.51, lng: -87.91 },
            { lat: 36.53, lng: -87.93 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 36.52, lng: -87.92 },
            { lat: 36.492, lng: -87.862 },
          ],
        },
      ],
    },
    {
      caption:
        "Grant rides back from Foote's flagship and orders an immediate counterattack; his right flank retakes the lost ground and seals the fort -- Buckner asks for terms, and Grant replies: unconditional surrender.",
      duration: 9,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 36.53, lng: -87.93 },
            { lat: 36.51, lng: -87.91 },
            { lat: 36.492, lng: -87.862 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 36.492, lng: -87.862 },
            { lat: 36.490, lng: -87.858 },
          ],
        },
      ],
    },
  ],
}

// ─── Shiloh ─────────────────────────────────────────────────────────────────
// Apr 6-7, 1862 · Pittsburg Landing 35.1402, -88.3420 · Shiloh Church ~35.1378, -88.3565
// Hornet's Nest ~35.1407, -88.3445
const shiloh: Battle = {
  name: 'Battle of Shiloh',
  date: 'April 6-7, 1862',
  sides: SIDES,
  phases: [
    {
      caption:
        "Before dawn Johnston's 40,000 men crash through the Union pickets near Shiloh Church, driving three divisions back in confusion toward Pittsburg Landing.",
      duration: 8,
      movements: [
        {
          side: 'confederate',
          style: 'advance',
          path: [
            { lat: 35.11, lng: -88.38 },
            { lat: 35.13, lng: -88.36 },
            { lat: 35.138, lng: -88.357 },
          ],
        },
        {
          side: 'union',
          style: 'retreat',
          path: [
            { lat: 35.138, lng: -88.357 },
            { lat: 35.148, lng: -88.345 },
            { lat: 35.152, lng: -88.338 },
          ],
        },
      ],
    },
    {
      caption:
        "Prentiss anchors the Hornet's Nest with 2,200 men who repulse eleven Confederate charges for six hours, buying time for Grant to form a last-ditch artillery line at the Landing.",
      duration: 9,
      movements: [
        {
          side: 'union',
          style: 'feint',
          path: [
            { lat: 35.141, lng: -88.345 },
            { lat: 35.140, lng: -88.344 },
          ],
        },
        {
          side: 'confederate',
          style: 'advance',
          path: [
            { lat: 35.135, lng: -88.352 },
            { lat: 35.140, lng: -88.344 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 35.148, lng: -88.340 },
            { lat: 35.150, lng: -88.338 },
          ],
        },
      ],
    },
    {
      caption:
        "Under a rainstorm Grant refuses to retreat; Buell's Army of the Ohio crosses the river overnight, and Nelson's fresh division lands at the bluff by torchlight.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 35.140, lng: -88.330 },
            { lat: 35.143, lng: -88.338 },
            { lat: 35.148, lng: -88.342 },
          ],
        },
      ],
    },
    {
      caption:
        "Dawn on the 7th: the re-formed Union line surges west, the exhausted Confederates falling back through Shiloh Church and abandoning the field by noon.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 35.148, lng: -88.342 },
            { lat: 35.140, lng: -88.352 },
            { lat: 35.130, lng: -88.365 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 35.138, lng: -88.357 },
            { lat: 35.120, lng: -88.370 },
            { lat: 35.105, lng: -88.385 },
          ],
        },
      ],
    },
  ],
}

// ─── Vicksburg Campaign ─────────────────────────────────────────────────────
// Apr-Jul 1863 · Vicksburg 32.3526, -90.8779 · Bruinsburg 31.9665, -91.1262
// Jackson 32.2988, -90.1848 · Champion Hill 32.3263, -90.5743
// NOTE: paths here span up to ~200 km; this is a campaign-scale animation.
// The engine frames it wider -- still readable from the ~75 km default camera.
const vicksburg: Battle = {
  name: 'Vicksburg Campaign',
  date: 'April - July 4, 1863',
  sides: SIDES,
  phases: [
    {
      caption:
        "Porter's gunboats run the Vicksburg batteries in darkness, hulls ablaze with burning cotton bales, opening the way for Grant's army to cross the Mississippi far to the south.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 32.50, lng: -90.88 },
            { lat: 32.35, lng: -90.88 },
            { lat: 32.10, lng: -91.10 },
          ],
        },
        {
          side: 'confederate',
          style: 'feint',
          path: [
            { lat: 32.353, lng: -90.878 },
            { lat: 32.360, lng: -90.875 },
          ],
        },
      ],
    },
    {
      caption:
        "Grant crosses 24,000 men at Bruinsburg -- the largest unopposed amphibious landing in American history to that point -- then drives inland, taking Port Gibson and cutting off Grand Gulf.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 31.967, lng: -91.126 },
            { lat: 31.958, lng: -90.983 },
            { lat: 32.00, lng: -90.90 },
          ],
        },
      ],
    },
    {
      caption:
        "Turning east before Confederate forces can concentrate, Grant takes Jackson in a single day, burns the rail hub, and wheels the whole army westward toward Pemberton.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 32.00, lng: -90.90 },
            { lat: 32.20, lng: -90.55 },
            { lat: 32.299, lng: -90.185 },
          ],
        },
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 32.299, lng: -90.185 },
            { lat: 32.326, lng: -90.574 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 32.360, lng: -90.688 },
            { lat: 32.326, lng: -90.574 },
          ],
        },
      ],
    },
    {
      caption:
        "At Champion Hill, Grant's army shatters Pemberton's last field force; the survivors flee across the Big Black River and are penned inside Vicksburg's defenses.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 32.326, lng: -90.574 },
            { lat: 32.360, lng: -90.680 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 32.326, lng: -90.574 },
            { lat: 32.353, lng: -90.878 },
          ],
        },
      ],
    },
    {
      caption:
        "Forty-seven days of siege works, mines, and starvation reduce the garrison; on July 4 Pemberton surrenders 30,000 men -- the Mississippi is open.",
      duration: 9,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 32.360, lng: -90.905 },
            { lat: 32.353, lng: -90.878 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
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
const chattanooga: Battle = {
  name: 'Battle of Chattanooga',
  date: 'November 23-25, 1863',
  sides: SIDES,
  phases: [
    {
      caption:
        "Grant reopens the cracker line: a night boat-crossing at Brown's Ferry unlocks the Bridgeport road, ending the starvation siege of the Army of the Cumberland.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 35.060, lng: -85.38 },
            { lat: 35.055, lng: -85.355 },
            { lat: 35.046, lng: -85.310 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 35.046, lng: -85.380 },
            { lat: 35.030, lng: -85.365 },
          ],
        },
      ],
    },
    {
      caption:
        "Hooker storms Lookout Mountain through morning clouds; the Battle Above the Clouds clears the summit and the Confederate left flank by afternoon.",
      duration: 8,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 34.990, lng: -85.370 },
            { lat: 35.002, lng: -85.350 },
            { lat: 35.010, lng: -85.340 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 35.010, lng: -85.340 },
            { lat: 35.020, lng: -85.300 },
          ],
        },
      ],
    },
    {
      caption:
        "Sherman's four divisions assault the north end of Missionary Ridge all day but are held on the false crest by Cleburne's division -- the attack stalls.",
      duration: 7,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 35.060, lng: -85.255 },
            { lat: 35.045, lng: -85.252 },
          ],
        },
        {
          side: 'confederate',
          style: 'feint',
          path: [
            { lat: 35.045, lng: -85.252 },
            { lat: 35.048, lng: -85.250 },
          ],
        },
      ],
    },
    {
      caption:
        "Thomas's men, ordered only to take the rifle-pits at the base, keep climbing on their own and pour over Missionary Ridge's crest -- Bragg's center dissolves and the army flees south.",
      duration: 9,
      movements: [
        {
          side: 'union',
          style: 'advance',
          path: [
            { lat: 35.033, lng: -85.277 },
            { lat: 35.027, lng: -85.265 },
            { lat: 35.022, lng: -85.249 },
          ],
        },
        {
          side: 'confederate',
          style: 'retreat',
          path: [
            { lat: 35.022, lng: -85.249 },
            { lat: 35.010, lng: -85.240 },
            { lat: 34.990, lng: -85.230 },
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
