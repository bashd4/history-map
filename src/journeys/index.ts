import type { Journey } from '../data/schema'
import { napoleon } from './napoleon'
import { grant } from './grant'

export const journeys: Journey[] = [napoleon, grant]
export const journeyById = (id: string): Journey | undefined => journeys.find((j) => j.id === id)
