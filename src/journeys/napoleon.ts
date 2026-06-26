import type { Journey } from '../data/schema'

export const napoleon: Journey = {
  id: 'napoleon',
  figure: 'Napoleon Bonaparte',
  title: 'The Rise and Fall of Napoleon',
  years: '1769–1821',
  color: '#e8b54a',
  intro: 'From a Corsican backwater to master of Europe and back to a rock in the South Atlantic — the most improbable arc in modern history.',
  protagonistSide: 'french',
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
  sides: { french: '#4d8fdb', coalition: '#c0392b' },
  strengths: { french: '73,000 men', coalition: '85,000 men' },
  // Camera stands SW of the field, looking NE across the Pratzen Heights.
  // Žuráň is at ~49.180, 16.738 (WSW of the plateau); Santon is NE at ~49.188, 16.764.
  fieldAzimuth: 250,
  // Napoleon's command position: the dawn on the Žuráň knoll watching the Allies
  // pour off the Pratzen, then forward onto the captured Heights once Soult's
  // stroke split their line.
  commander: {
    name: 'Napoleon',
    side: 'french',
    movements: [
      {
        // ~9 a.m.: with the Allied centre stripped off the Pratzen, Napoleon
        // releases Soult and rides forward from Žuráň toward the Heights.
        phase: 1,
        note: 'Releases Soult — rides forward from Žuráň',
        path: [
          { lat: 49.18000, lng: 16.73800 }, // Žuráň knoll — the command post at dawn
          { lat: 49.16500, lng: 16.75200 }, // forward by the Stará Pošta (post house)
          { lat: 49.15200, lng: 16.76200 }, // the western foot of the Pratzen
        ],
      },
      {
        // Onto the captured plateau (Staré Vinohrady) to direct the repulse of
        // the Russian Imperial Guard's counter-attack.
        phase: 2,
        note: 'Onto the captured Pratzen Heights',
        path: [
          { lat: 49.15200, lng: 16.76200 }, // from the western foot
          { lat: 49.14800, lng: 16.76600 }, // climbing the Heights
          { lat: 49.14700, lng: 16.77000 }, // Staré Vinohrady, the centre of the field
        ],
      },
      {
        // Holds the Heights, looking south over the Allied left as it routs across
        // the frozen ponds toward Újezd.
        phase: 3,
        note: 'Overlooks the rout across the frozen ponds',
        path: [
          { lat: 49.14700, lng: 16.77000 }, // from Staré Vinohrady
          { lat: 49.14200, lng: 16.76200 }, // to the southern brow of the plateau
          { lat: 49.13800, lng: 16.75500 }, // overlooking the ponds and the pursuit
        ],
      },
    ],
  },
  areas: [
    {
      // Pratzen Heights (Pracký kopec / Pratzenberg): the gently-sloping plateau
      // between the Goldbach (Říčka) valley to the west and the Litava to the east.
      // Re-centred (June 2026) onto the actual plateau, verified against relief +
      // landmark anchors: Cairn of Peace / Mohyla míru ~49.1228,16.7758 (the high
      // point); Prace village ~49.1235,16.7685 (W foot); Staré Vinohrady ~49.1295,
      // 16.779 (N height where the Russian Guard counter-attacked). The earlier
      // outline used a Prácě coord of 49.141 (~2 km too far N) and was skewed NW
      // off the plateau into flatter ground.
      name: 'Pratzen Heights',
      kind: 'terrain',
      outline: [
        { lat: 49.13300, lng: 16.77300 }, // N, Staré Vinohrady height
        { lat: 49.13000, lng: 16.78500 }, // NE
        { lat: 49.12300, lng: 16.79000 }, // E edge, above the Litava/Rausnitz fall
        { lat: 49.11600, lng: 16.78500 }, // SE
        { lat: 49.11400, lng: 16.77400 }, // S, toward the Pratzen–Sokolnice rim
        { lat: 49.11700, lng: 16.76200 }, // SW foot
        { lat: 49.12400, lng: 16.75800 }, // W foot, above Prace toward the Goldbach
        { lat: 49.13000, lng: 16.76300 }, // NW slope
      ],
    },
    {
      // Satschan/Žatčany and Mönitz/Měnín ponds: two frozen ponds SE of the battle,
      // into which the Allied left fled. Žatčany village 49.08778,16.73389;
      // Měnín village 49.08250,16.69417. The ponds (now drained) lay between these
      // two villages, on either side of a causeway the Allies were funnelled along.
      // Žatčanský pond: east of causeway (~49.085–49.095, 16.720–16.745).
      // Měnínský pond: west of causeway (~49.080–49.090, 16.685–16.715).
      name: 'Satschan Ponds',
      kind: 'water',
      outline: [
        { lat: 49.09500, lng: 16.69500 }, // NW — Měnínský pond north
        { lat: 49.09500, lng: 16.72200 }, // N causeway / between ponds
        { lat: 49.09400, lng: 16.73800 }, // NE — Žatčanský pond north
        { lat: 49.08800, lng: 16.74200 }, // E — Žatčany village edge
        { lat: 49.08200, lng: 16.73600 }, // SE — Žatčanský pond south
        { lat: 49.07800, lng: 16.71800 }, // S — between ponds south
        { lat: 49.07900, lng: 16.69200 }, // SW — Měnínský pond south
        { lat: 49.08400, lng: 16.68600 }, // W — Měnín village edge
      ],
    },
    {
      // Goldbach Valley (Říčka brook corridor): the N–S marshy valley through which
      // Davout's right flank was anchored and Buxhöwden's columns attacked.
      // Brook runs N→S through Kobylnice (49.138,16.732) → Sokolnice (49.114,16.722)
      // → Telnice (49.102,16.718). Valley is ~500–800 m wide.
      name: 'Goldbach Valley',
      kind: 'terrain',
      outline: [
        { lat: 49.14500, lng: 16.71500 }, // N end, above Kobylnice
        { lat: 49.14500, lng: 16.73000 }, // NE edge of valley
        { lat: 49.13500, lng: 16.73200 }, // E side at Kobylnice
        { lat: 49.12000, lng: 16.73000 }, // E side toward Sokolnice
        { lat: 49.10800, lng: 16.72500 }, // E side at Sokolnice
        { lat: 49.09800, lng: 16.72200 }, // E side at Telnice
        { lat: 49.09500, lng: 16.71000 }, // SE end
        { lat: 49.09500, lng: 16.70200 }, // SW end
        { lat: 49.10200, lng: 16.70500 }, // W side at Telnice
        { lat: 49.11200, lng: 16.70800 }, // W side at Sokolnice
        { lat: 49.13500, lng: 16.71500 }, // W side at Kobylnice
      ],
    },
  ],
  phases: [
    {
      caption: 'The trap is set (night of 1–2 Dec): Napoleon deliberately abandons the Pratzen Heights, pulling Soult\'s IV Corps westward off the plateau into the Goldbach valley mist. Lannes anchors the French left at the Santon hill; Murat\'s cavalry screens the Brünn–Olmütz road between Santon and Žuráň. Bernadotte holds the centre behind Ponětovice. Davout\'s III Corps, having marched 110 km in 48 hours from Rajhrad, arrives to hold the thinned right near Telnice.',
      duration: 7,
      events: [
        { coords: { lat: 49.17977, lng: 16.73840 }, label: 'Žuráň hill — Napoleon\'s command post' },
      ],
      movements: [
        {
          // Soult's IV Corps (St. Hilaire + Vandamme) pulls WEST off the plateau
          // into the Goldbach valley, assembling at Ponětovice (49.152,16.742).
          // This is the feint that invites the Allied assault on the southern flank.
          side: 'french', style: 'feint',
          unit: "Soult — IV Corps",
          branch: 'infantry', echelon: 'corps',
          strength: 23600,
          departs: true, // hands off to its divisions — vanishes into the Goldbach fog, re-emerges as St. Hilaire + Vandamme on the Pratzen
          path: [
            { lat: 49.12800, lng: 16.76200 }, // Pratzen plateau center
            { lat: 49.13200, lng: 16.75000 }, // W slope
            { lat: 49.13800, lng: 16.74200 }, // Kobylnice area
            { lat: 49.15000, lng: 16.74200 }, // Ponětovice assembly point
          ],
        },
        {
          // Lannes' V Corps holds the French left, anchored on Santon (49.188,16.764),
          // extending SE toward Bosenitz/Tvarožná along the Olmütz road.
          side: 'french', style: 'feint',
          unit: "Lannes — V Corps",
          branch: 'infantry', echelon: 'corps',
          strength: 12700,
          path: [
            { lat: 49.18837, lng: 16.76376 }, // Santon hill top
            { lat: 49.17600, lng: 16.75800 }, // SE toward Tvarožná
          ],
        },
        {
          // Murat's cavalry reserve screens between Santon and the main army
          // along the Brünn–Austerlitz road (roughly the N part of the field).
          side: 'french', style: 'feint',
          unit: "Murat — Cavalry Reserve",
          branch: 'cavalry', echelon: 'corps',
          strength: 7400,
          path: [
            { lat: 49.18000, lng: 16.75000 }, // N, near Bosenitz road
            { lat: 49.16500, lng: 16.76000 }, // S toward Blažovice road
          ],
        },
      ],
    },
    {
      caption: 'The Allies take the bait (dawn, ~7:00 a.m.): Buxhöwden\'s three columns (Dokhturov, Langeron, Przybyszewski) pour south and southwest off the Pratzen plateau toward Sokolnice and Telnice, leaving the heights stripped. Kienmayer\'s Austrians attack Telnice first. On the Allied right, Bagration attacks the Santon but is repelled. Davout\'s exhausted divisions (Friant, Gudin) plug the Goldbach line from Sokolnice south to Telnice with barely 5,000 men.',
      duration: 8,
      movements: [
        {
          // Allied columns descend from the Pratzen plateau SW toward the Goldbach.
          // Route: from plateau center, through Újezd (49.104,16.758), then SW to Sokolnice.
          side: 'coalition', style: 'advance',
          unit: "Buxhöwden — three left-wing columns",
          branch: 'infantry', echelon: 'corps', // three columns = corps-level wing
          strength: 32190,
          path: [
            { lat: 49.12800, lng: 16.76200 }, // Pratzen plateau
            { lat: 49.11800, lng: 16.75800 }, // W slope / Újezd approach
            { lat: 49.11400, lng: 16.74500 }, // Descended toward valley
            { lat: 49.11000, lng: 16.72800 }, // Sokolnice approach
            { lat: 49.10200, lng: 16.71900 }, // Telnice approach
          ],
        },
        {
          // Kienmayer's Austrian advance guard attacks Telnice directly from the E/NE.
          side: 'coalition', style: 'advance',
          unit: "Kienmayer — Austrian advance guard",
          branch: 'cavalry', echelon: 'division', // light-cavalry-led advance guard (mixed; cavalry was the defining arm)
          strength: 6880,
          path: [
            { lat: 49.11000, lng: 16.74500 }, // Plateau W slope
            { lat: 49.10200, lng: 16.73000 }, // Valley approach
            { lat: 49.10194, lng: 16.71778 }, // Telnice village
          ],
        },
        {
          // Davout's III Corps arrives from the S/SSW, from Rajhrad (49.090,16.604)
          // along the Vienna road, fanning out to hold Telnice and Sokolnice.
          side: 'french', style: 'advance',
          unit: "Davout — III Corps",
          branch: 'infantry', echelon: 'corps',
          strength: 6300,
          arrives: true, // genuinely marched in (110 km in 48 h from Rajhrad) — not present at the start
          path: [
            { lat: 49.09028, lng: 16.60389 }, // Rajhrad (Gross-Raigern)
            { lat: 49.09800, lng: 16.64000 }, // March N along road
            { lat: 49.10000, lng: 16.68500 }, // Approach Telnice from SW
            { lat: 49.10194, lng: 16.71778 }, // Telnice — right anchor
            { lat: 49.11389, lng: 16.72167 }, // Sokolnice — right flank
          ],
        },
        {
          // Bagration attacks the Santon from the NE (from Krenovice road / Prostějov direction).
          side: 'coalition', style: 'advance',
          unit: "Bagration — right wing",
          branch: 'infantry', echelon: 'corps', // combined-arms right wing
          strength: 13700,
          path: [
            { lat: 49.19500, lng: 16.80000 }, // Allied right start, NE
            { lat: 49.18837, lng: 16.76376 }, // Santon hill (repelled)
          ],
        },
      ],
    },
    {
      caption: 'The masterstroke (9:00 a.m.): as the "Sun of Austerlitz" burns off the Goldbach fog, Soult\'s IV Corps crosses the brook and storms eastward up the now-empty Pratzen plateau. St. Hilaire\'s division takes the S sector of the heights; Vandamme\'s division sweeps the N sector through Prácě village. Bernadotte crosses to Blažovice (Blasowitz) to pin the Allied centre and cover the gap between Soult and Lannes.',
      duration: 7,
      events: [
        { coords: { lat: 49.17977, lng: 16.73840 }, label: "Napoleon orders Soult\'s assault from Žuráň hill — \"One" },
        { coords: { lat: 49.12350, lng: 16.76850 }, label: 'Prácě village — epicentre of the Pratzen Heights assault' },
      ],
      movements: [
        {
          // St. Hilaire's division: from Ponětovice valley, crosses Říčka, attacks E/NE
          // up the southern Pratzen slope toward Sokolnice–Újezd ridge line.
          side: 'french', style: 'advance',
          unit: "St. Hilaire — division",
          branch: 'infantry', echelon: 'division',
          strength: 8000, // est. ~half of the documented 16,000-man two-division Pratzen assault
          arrives: true, // detaches from Soult's IV Corps for the masterstroke
          path: [
            { lat: 49.13000, lng: 16.73000 }, // Assembly E of Kobylnice (Goldbach)
            { lat: 49.12800, lng: 16.74500 }, // Climbing W slope of heights
            { lat: 49.12500, lng: 16.76000 }, // S plateau
            { lat: 49.11800, lng: 16.77500 }, // S heights, driving towardÚjezd
          ],
        },
        {
          // Vandamme's division: from Ponětovice/Kobylnice, attacks E/NE
          // up the northern Pratzen slope toward Prácě village.
          side: 'french', style: 'advance',
          unit: "Vandamme — division",
          branch: 'infantry', echelon: 'division',
          strength: 8000, // est. ~half of the documented 16,000-man two-division Pratzen assault
          arrives: true, // detaches from Soult's IV Corps for the masterstroke
          path: [
            { lat: 49.14500, lng: 16.73500 }, // Kobylnice / N Goldbach
            { lat: 49.14300, lng: 16.75000 }, // W slope
            { lat: 49.14111, lng: 16.76528 }, // Prácě village — plateau summit
            { lat: 49.14000, lng: 16.78000 }, // E plateau edge
          ],
        },
        {
          // Bernadotte's I Corps: from Ponětovice area, moves NE to Blažovice (Blasowitz)
          // to cover gap between Soult and Lannes, threatening Allied centre.
          side: 'french', style: 'advance',
          unit: "Bernadotte — I Corps",
          branch: 'infantry', echelon: 'corps',
          strength: 13000,
          path: [
            { lat: 49.15500, lng: 16.74500 }, // Ponětovice area
            { lat: 49.16000, lng: 16.76500 }, // NE toward Blažovice
            { lat: 49.16583, lng: 16.78611 }, // Blažovice (Blasowitz)
          ],
        },
        {
          // Kollowrath's Allied centre column, on the Pratzen, is caught in the open
          // and pushed eastward off the plateau toward Slavkov town.
          side: 'coalition', style: 'retreat',
          unit: "Kollowrath — Allied centre",
          branch: 'infantry', echelon: 'corps', // large IV-Column centre under Kollowrat/Miloradovich
          strength: 13900,
          path: [
            { lat: 49.13800, lng: 16.76500 }, // Plateau centre
            { lat: 49.14000, lng: 16.79000 }, // E edge of heights
            { lat: 49.14500, lng: 16.82000 }, // Retreat toward Slavkov road
          ],
        },
      ],
    },
    {
      caption: 'The rout (11 a.m.–2 p.m.): French wheel south from the Pratzen heights, encircling Buxhöwden\'s trapped columns between the plateau and the frozen ponds. The Russian Imperial Guard under Grand Duke Constantine counter-attacks from the east toward the N Pratzen, briefly capturing a French standard, before Rapp\'s Guard cavalry repulses it. The Allied left — Dokhturov, Langeron — dissolves southeastward across the frozen Žatčanský and Měnínský ponds under French cannon fire.',
      duration: 8,
      events: [
        { coords: { lat: 49.08600, lng: 16.71800 }, label: "Allied troops flee across the frozen Žatčany–Měnín ponds" },
        { coords: { lat: 49.10444, lng: 16.75750 }, label: "Újezd — French seal the trap; Przybyszewski\'s column" },
      ],
      movements: [
        {
          // St. Hilaire's division wheels S off the plateau toward Újezd and the
          // frozen ponds, closing the trap on the Allied left. (Continues as the
          // same counter that took the S Pratzen in the previous phase.)
          side: 'french', style: 'advance',
          unit: "St. Hilaire — division",
          branch: 'infantry', echelon: 'division',
          strength: 8000,
          path: [
            { lat: 49.11800, lng: 16.77500 }, // S heights — continues from the Pratzen assault
            { lat: 49.11200, lng: 16.76600 }, // driving SW above Újezd
            { lat: 49.10444, lng: 16.75750 }, // Újezd — closing the trap at the ponds
          ],
        },
        {
          // Vandamme's division wheels S through the plateau centre, pressing the
          // trapped columns toward the Žatčanský pond.
          side: 'french', style: 'advance',
          unit: "Vandamme — division",
          branch: 'infantry', echelon: 'division',
          strength: 8000,
          path: [
            { lat: 49.14000, lng: 16.78000 }, // E plateau edge — continues from the assault
            { lat: 49.12500, lng: 16.76800 }, // wheeling S across the plateau
            { lat: 49.11500, lng: 16.76200 }, // pressing toward the ponds
          ],
        },
        {
          // Russian Imperial Guard (Grand Duke Constantine) — the reserve lay E of the
          // Pratzen behind the centre (toward Křenovice/Slavkov); it counter-attacked the
          // N plateau (Staré Vinohrady, Vandamme's sector) from the E/NE, briefly taking a
          // French eagle before being repulsed. (CORRECTED: not staged from Blažovice, which
          // was the French Bernadotte/Lannes sector.)
          side: 'coalition', style: 'advance',
          unit: "Russian Imperial Guard — Grand Duke",
          branch: 'infantry', echelon: 'corps', // Guard reserve (corps-sized); the counter-attack here was infantry-led
          strength: 10430,
          path: [
            { lat: 49.14500, lng: 16.81500 }, // Guard reserve, W of Křenovice / behind the centre
            { lat: 49.14600, lng: 16.79500 }, // advance W up the NE flank of Staré Vinohrady
            { lat: 49.14600, lng: 16.78000 }, // strikes the N plateau (Vandamme's sector)
          ],
        },
        {
          // Rapp's Guard cavalry (horse grenadiers + Mamelukes), committed by Napoleon from
          // the centre, counter-charges the Russian Guard over the N Pratzen / Staré Vinohrady
          // and drives it back E toward Křenovice. (CORRECTED: the clash was on the plateau,
          // not at Blažovice.)
          side: 'french', style: 'advance',
          unit: "Rapp — Guard cavalry",
          branch: 'cavalry', echelon: 'division', // Guard cavalry (horse grenadiers + Mamelukes)
          path: [
            { lat: 49.15200, lng: 16.76500 }, // committed from the W/centre
            { lat: 49.14700, lng: 16.78200 }, // charge home on the N plateau (meets the Russian Guard)
            { lat: 49.14600, lng: 16.80500 }, // pursuit E toward Křenovice
          ],
        },
        {
          // Trapped Allied left (Buxhöwden's remnants) flee SE from Sokolnice/Telnice
          // toward Újezd, then S along the causeway between the frozen ponds.
          side: 'coalition', style: 'retreat',
          unit: "Allied left wing — Dokhturov / Langeron",
          branch: 'infantry', echelon: 'corps', // two-column left wing
          strength: 25040,
          path: [
            { lat: 49.11389, lng: 16.72167 }, // Sokolnice — collapse point
            { lat: 49.10194, lng: 16.71778 }, // Telnice — southern anchor lost
            { lat: 49.09400, lng: 16.72000 }, // Toward causeway between ponds
            { lat: 49.08600, lng: 16.71500 }, // Causeway between Žatčany and Měnín ponds
            { lat: 49.07800, lng: 16.71800 }, // Across Žatčany pond (SE flight)
            { lat: 49.07000, lng: 16.72500 }, // Beyond Žatčany village — escape SE
          ],
        },
      ],
    },
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
