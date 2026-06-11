import type { Journey } from '../../data/schema'
import { grantStopsVol1 } from './stops1'
import { grantStopsVol2 } from './stops2'
import { grantBattles } from './battles'

const allStops = [...grantStopsVol1, ...grantStopsVol2].map((stop, i) => {
  const battle = grantBattles[i + 1] // chapter number = index + 1
  return battle ? { ...stop, battle } : stop
})

export const grant: Journey = {
  id: 'grant',
  figure: 'Ulysses S. Grant',
  title: 'The Personal Memoirs of U. S. Grant',
  years: '1822–1865',
  color: '#7da7c4', // steel union blue — distinct from Napoleon's gold on the shared globe
  intro: 'Seventy chapters in his own words — from an Ohio farm boy who hated the sight of blood to the general who received Lee\'s surrender at Appomattox.',
  stops: allStops,
}
