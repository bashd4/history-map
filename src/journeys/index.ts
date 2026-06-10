import type { Journey } from '../data/schema'
import { napoleon } from './napoleon'

export const journeys: Journey[] = [napoleon]
export const journeyById = (id: string): Journey | undefined => journeys.find((j) => j.id === id)
