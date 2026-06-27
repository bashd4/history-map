import type { Stop } from '../../data/schema'

export const grantStopsVol1: Stop[] = [
  {
    name: 'Ch. 1 — Point Pleasant, Ohio',
    coords: { lat: 38.8945, lng: -84.2330 },
    date: '1822–1839',
    story:
      '"My family is American, and has been for generations, in all its branches, direct and collateral." Grant traces his ancestry and boyhood in southern Ohio.',
  },
  {
    name: 'Ch. 2 — West Point, New York',
    coords: { lat: 41.3915, lng: -73.9560 },
    date: '1839–1843',
    story:
      '"A military life had no charms for me, and I had not the faintest idea of staying in the army even if I should be graduated." Grant recalls four years at the Academy.',
  },
  {
    name: 'Ch. 3 — Jefferson Barracks, Missouri',
    coords: { lat: 38.5009, lng: -90.2812 },
    date: '1843–1844',
    story:
      '"For myself, I was bitterly opposed to the measure, and to this day regard the war, which resulted, as one of the most unjust ever waged by a stronger against a weaker nation." Grant on the Mexican War\'s origins.',
  },
  {
    name: 'Ch. 4 — Corpus Christi, Texas',
    coords: { lat: 27.8006, lng: -97.3964 },
    date: '1845',
    story:
      '"We were sent to provoke a fight, but it was essential that Mexico should commence it." Grant describes the Army of Occupation assembling at Corpus Christi.',
    via: [
      { lat: 29.95, lng: -90.07 }, // New Orleans (embark — regiment sailed from here in sailing vessels)
      { lat: 27.80, lng: -97.39 }, // Gulf approach to Corpus Christi Bay
    ],
  },
  {
    name: 'Ch. 5 — San Antonio Road, Texas',
    coords: { lat: 29.4241, lng: -98.4936 },
    date: '1845–1846',
    story:
      '"There were just TWO of them. Seated upon their haunches, with their mouths close together, they had made all the noise we had been hearing for the past ten minutes." Grant\'s wolf story on march.',
  },
  {
    name: 'Ch. 6 — Rio Grande, Texas',
    coords: { lat: 25.8696, lng: -97.5022 },
    date: 'March 1846',
    story:
      '"The day we started was the first time the horse had ever been under saddle." Grant advances with Taylor\'s army to the Rio Grande on a wild mustang.',
  },
  {
    name: 'Ch. 7 — Palo Alto, Texas',
    coords: { lat: 26.0180, lng: -97.6561 },
    date: 'May 1846',
    story:
      '"for myself, a young second-lieutenant who had never heard a hostile gun before, I felt sorry that I had enlisted." Grant at the battles of Palo Alto and Resaca de la Palma.',
  },
  {
    name: 'Ch. 8 — Monterrey, Mexico',
    coords: { lat: 25.6866, lng: -100.3161 },
    date: 'September 1846',
    story:
      '"My pity was aroused by the sight of the Mexican garrison of Monterey marching out of town as prisoners." Grant\'s famous ride through Monterrey streets under fire.',
  },
  {
    name: 'Ch. 9 — Vera Cruz, Mexico',
    coords: { lat: 19.1738, lng: -96.1342 },
    date: 'March 1847',
    story:
      '"On the 9th of March the troops were landed and the investment of Vera Cruz, from the Gulf of Mexico south of the city to the Gulf again on the north, was soon and easily effected."',
    via: [
      { lat: 25.87, lng: -97.50 }, // mouth of the Rio Grande / Brazos Santiago (embarkation point)
      { lat: 19.05, lng: -96.00 }, // Anton Lizardo anchorage — assembly point south of Vera Cruz
    ],
  },
  {
    name: 'Ch. 10 — Cerro Gordo, Mexico',
    coords: { lat: 19.6167, lng: -96.9167 },
    date: 'April–August 1847',
    story:
      '"The surprise of the enemy was complete, the victory overwhelming; some three thousand prisoners fell into Scott\'s hands." Battle of Cerro Gordo and advance to Puebla.',
  },
  {
    name: 'Ch. 11 — San Cosme Gate, Mexico City',
    coords: { lat: 19.4000, lng: -99.1700 },
    date: 'August–September 1847',
    story:
      '"I got an officer of the voltigeurs, with a mountain howitzer and men to work it, to go with me." Grant places a howitzer in a church belfry near the San Cosme gate.',
  },
  {
    name: 'Ch. 12 — Mexico City, Mexico',
    coords: { lat: 19.4326, lng: -99.1332 },
    date: 'September 1847',
    story:
      '"I had gone into the battle of Palo Alto in May, 1846, a second lieutenant, and I entered the city of Mexico sixteen months later with the same rank." Occupation of Mexico City.',
  },
  {
    name: 'Ch. 13 — Mexico City, Mexico',
    coords: { lat: 19.4326, lng: -99.1332 },
    date: '1847–1848',
    story:
      '"I attended one of them--just one--not wishing to leave the country without having witnessed the national sport." Grant at a Mexican bullfight and excursion toward Popocatapetl.',
  },
  {
    name: 'Ch. 14 — Sackets Harbor, New York',
    coords: { lat: 43.9459, lng: -76.1191 },
    date: '1848–1852',
    story:
      '"About one-third of the people with me died, either at Cruces or on the way to Panama." Return from Mexico, marriage, and ordering to Pacific Coast via cholera-ridden Isthmus.',
  },
  {
    name: 'Ch. 15 — Fort Vancouver, Washington',
    coords: { lat: 45.6260, lng: -122.6615 },
    date: '1852–1854',
    story:
      '"I with three other officers concluded that we would raise a crop for ourselves, and by selling the surplus realize something handsome." Life on the Pacific Coast; promotion to captain.',
    via: [
      { lat: 32.30, lng: -64.78 },  // Atlantic steamer lane (off Bermuda) — smooth arc south
      { lat: 9.36,  lng: -79.90 },  // Aspinwall / Colón — Caribbean side of the Isthmus
      { lat: 8.95,  lng: -79.53 },  // Panama City — Pacific side (the Isthmus crossing)
      { lat: 15.00, lng: -95.00 },  // Pacific steamer lane up the coast
      { lat: 37.77, lng: -122.42 }, // San Francisco
      { lat: 46.25, lng: -124.08 }, // mouth of the Columbia River
    ],
  },
  {
    name: 'Ch. 16 — Galena, Illinois',
    coords: { lat: 42.4167, lng: -90.4290 },
    date: '1854–1861',
    story:
      '"In May, 1860, removed to Galena, Illinois, and took a clerkship in my father\'s store." Resignation from the army, farming near St. Louis, and pre-war years in Galena.',
    via: [
      { lat: 37.77, lng: -122.42 }, // San Francisco (embark)
      { lat: 15.00, lng: -95.00 },  // Pacific lane south
      { lat: 8.95,  lng: -79.53 },  // Panama City
      { lat: 9.36,  lng: -79.90 },  // Aspinwall / Colón
      { lat: 32.30, lng: -64.78 },  // Atlantic lane north
      { lat: 40.71, lng: -74.01 },  // New York (then overland to Galena)
    ],
  },
  {
    name: 'Ch. 17 — Galena & Springfield, Illinois',
    coords: { lat: 42.4167, lng: -90.4290 },
    date: 'April–June 1861',
    story:
      '"After the speaking was over volunteers were called for to form a company." Outbreak of rebellion; Grant presides at Union meeting in Galena and serves as mustering officer.',
  },
  {
    name: 'Ch. 18 — Mexico, Missouri',
    coords: { lat: 39.1731, lng: -91.8835 },
    date: 'June–August 1861',
    story:
      '"my heart kept getting higher and higher until it felt to me as though it was in my throat." Colonel of the 21st Illinois marches to Missouri; approach to Harris\'s deserted camp.',
  },
  {
    name: 'Ch. 19 — Cairo, Illinois',
    coords: { lat: 36.9970, lng: -89.1764 },
    date: 'August–September 1861',
    story:
      '"There was no time for delay; I reported by telegraph to the department commander the information I had received, and added that I was taking steps to get off that night." Seizure of Paducah.',
  },
  {
    name: 'Ch. 20 — Belmont, Missouri',
    coords: { lat: 36.7540, lng: -89.1360 },
    date: 'November 1861',
    story:
      '"I announced that we had cut our way in and could cut our way out just as well, it seemed a new revelation to officers and soldiers." Battle of Belmont, Grant\'s first Civil War engagement.',
  },
  {
    name: 'Ch. 21 — Fort Henry, Tennessee',
    coords: { lat: 36.3312, lng: -87.9983 },
    date: 'February 1862',
    story:
      '"On the 28th of January, renewed the suggestion by telegraph that \'if permitted, I could take and hold Fort Henry on the Tennessee.\'" Halleck assumes command; Fort Henry falls.',
  },
  {
    name: 'Ch. 22 — Fort Donelson, Tennessee',
    coords: { lat: 36.4922, lng: -87.8617 },
    date: 'February 1862',
    story:
      '"No terms except an unconditional and immediate surrender can be accepted. I propose to move immediately upon your works." Investment and capture of Fort Donelson.',
  },
  {
    name: 'Ch. 23 — Nashville, Tennessee',
    coords: { lat: 36.1627, lng: -86.7816 },
    date: 'February–March 1862',
    story:
      '"My opinion was and still is that immediately after the fall of Fort Donelson the way was opened to the National forces all over the South-west without much resistance." Advance on Nashville.',
  },
  {
    name: 'Ch. 24 — Shiloh, Tennessee',
    coords: { lat: 35.1402, lng: -88.3420 },
    date: 'April 6, 1862',
    story:
      '"The sight was more unendurable than encountering the enemy\'s fire, and I returned to my tree in the rain." Confederate surprise at Shiloh; desperate first day; Grant in a rainstorm.',
  },
  {
    name: 'Ch. 25 — Shiloh, Tennessee',
    coords: { lat: 35.1402, lng: -88.3420 },
    date: 'April 7, 1862',
    story:
      '"Up to the battle of Shiloh I, as well as thousands of other citizens, believed that the rebellion against the Government would collapse suddenly and soon, if a decisive victory could be gained."',
  },
  {
    name: 'Ch. 26 — Corinth, Mississippi',
    coords: { lat: 34.9343, lng: -88.5227 },
    date: 'May 1862',
    story:
      '"The possession of Corinth by the National troops was of strategic importance, but the victory was barren in every other particular." Halleck\'s slow advance; Confederates evacuate Corinth.',
  },
  {
    name: 'Ch. 27 — Memphis, Tennessee',
    coords: { lat: 35.1495, lng: -90.0490 },
    date: 'June–September 1862',
    story:
      '"The most anxious period of the war, to me, was during the time the Army of the Tennessee was guarding the territory acquired by the fall of Corinth and Memphis." Bragg\'s movement west.',
  },
  {
    name: 'Ch. 28 — Iuka, Mississippi',
    coords: { lat: 34.8112, lng: -88.1923 },
    date: 'September 1862',
    story:
      '"During the 19th the wind blew in the wrong direction to transmit sound either towards the point where Ord was, or to Burnsville where I had remained." Battle of Iuka; wind foils coordination.',
  },
  {
    name: 'Ch. 29 — Corinth, Mississippi',
    coords: { lat: 34.9343, lng: -88.5227 },
    date: 'October 1862',
    story:
      '"Two or three hours of pursuit on the day of battle, without anything except what the men carried on their persons, would have been worth more than any pursuit commenced the next day." Van Dorn repulsed.',
  },
  {
    name: 'Ch. 30 — Holly Springs, Mississippi',
    coords: { lat: 34.7732, lng: -89.4503 },
    date: 'November–December 1862',
    story:
      '"I was amazed at the quantity of supplies the country afforded. It showed that we could have subsisted off the country for two months instead of two weeks." Van Dorn raids Holly Springs.',
  },
  {
    name: "Ch. 31 — Young's Point, Louisiana",
    coords: { lat: 32.36, lng: -91.0 },
    date: 'January–March 1863',
    story:
      '"There was nothing left to be done but to go FORWARD TO A DECISIVE VICTORY." Grant takes personal command below Vicksburg; canal and bayou schemes fail; resolve to press on.',
  },
  {
    name: "Ch. 32 — Milliken's Bend, Louisiana",
    coords: { lat: 32.5090, lng: -91.0540 },
    date: 'March–April 1863',
    story:
      '"The sight was magnificent, but terrible." Running the Vicksburg batteries; waterway schemes abandoned; army marches south via Louisiana levee roads.',
  },
  {
    name: 'Ch. 33 — Grand Gulf, Mississippi',
    coords: { lat: 31.9667, lng: -91.0500 },
    date: 'April 1863',
    story:
      '"When this was effected I felt a degree of relief scarcely ever equalled since." Landing at Bruinsburg; Grant on dry ground east of the river; the Vicksburg campaign truly begins.',
  },
  {
    name: 'Ch. 34 — Port Gibson, Mississippi',
    coords: { lat: 31.9573, lng: -90.9834 },
    date: 'May 1863',
    story:
      '"When I reached Grand Gulf May 3d I had not been with my baggage since the 27th of April and consequently had had no change of underclothing." First bath after a week; victory at Port Gibson.',
  },
  {
    name: 'Ch. 35 — Jackson, Mississippi',
    coords: { lat: 32.2988, lng: -90.1848 },
    date: 'May 14, 1863',
    story:
      '"I rode immediately to the State House, where I was soon followed by Sherman." Fall of the Confederate capital of Mississippi; seventeen guns and the city taken; Grant sleeps in Johnston\'s room.',
  },
  {
    name: "Ch. 36 — Champion's Hill, Mississippi",
    coords: { lat: 32.326, lng: -90.574 },
    date: 'May 16, 1863',
    story:
      '"While a battle is raging one can see his enemy mowed down by the thousand, or the ten thousand, with great composure; but after the battle these scenes are distressing." After Champion\'s Hill.',
  },
  {
    name: 'Ch. 37 — Big Black River, Mississippi',
    coords: { lat: 32.3600, lng: -90.6800 },
    date: 'May 17, 1863',
    story:
      '"I heard great cheering to the right of our line and, looking in that direction, saw Lawler in his shirt sleeves leading a charge upon the enemy." Bridge taken; Pemberton flees to Vicksburg.',
  },
  {
    name: 'Ch. 38 — Vicksburg, Mississippi',
    coords: { lat: 32.3526, lng: -90.8779 },
    date: 'May–July 1863',
    story:
      '"I now determined upon a regular siege--to \'out-camp the enemy,\' as it were, and to incur no more losses." Forty-seven days of siege works, mines, and starvation until Vicksburg falls.',
  },
  {
    name: 'Ch. 39 — Vicksburg, Mississippi',
    coords: { lat: 32.3526, lng: -90.8779 },
    date: 'Jul–Oct 1863',
    story:
      '"The fate of the Confederacy was sealed when Vicksburg fell. Much hard fighting was to be done afterwards and many precious lives were to be sacrificed; but the MORALE was with the supporters of the Union ever after." Horse fall in New Orleans; Grant injured; ordered to Chattanooga.',
  },
]
