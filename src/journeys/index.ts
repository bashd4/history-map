import type { Journey } from '../data/schema'
// Napoleon journey temporarily disabled — re-add the import + array entry to restore.
// import { napoleon } from './napoleon'
import { grant } from './grant'

export const journeys: Journey[] = [grant]
export const journeyById = (id: string): Journey | undefined => journeys.find((j) => j.id === id)
