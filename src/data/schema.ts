import { z } from 'zod'

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

const movement = z.object({
  side: z.string(),
  style: z.enum(['advance', 'retreat', 'feint']),
  path: z.array(latLng).min(2),
  unit: z.string().min(1).max(40).optional(), // e.g. "Soult — IV Corps"
})

const event = z.object({
  coords: latLng,
  label: z.string().min(1).max(60),
})

const phase = z.object({
  caption: z.string().min(1),
  duration: z.number().positive().optional(), // seconds; default applied in battlePlayback
  movements: z.array(movement).min(1),
  events: z.array(event).optional(),
})

const landmark = z.object({
  name: z.string().min(1).max(40),
  coords: latLng,
  kind: z.enum(['terrain', 'water', 'settlement']).optional(),
})

const battle = z
  .object({
    name: z.string().min(1),
    date: z.string().min(1),
    sides: z
      .record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/))
      .refine((s) => Object.keys(s).length > 0, { message: 'sides must have at least one entry' }),
    phases: z.array(phase).min(1),
    /** Display strings per side, e.g. "66,812 men". Keys must ⊆ sides keys. */
    strengths: z.record(z.string(), z.string().min(1)).optional(),
    landmarks: z.array(landmark).optional(),
    /** Compass bearing FROM the site TOWARD the field-view camera position (degrees). */
    fieldAzimuth: z.number().min(0).max(360).optional(),
  })
  .superRefine((battle, ctx) => {
    battle.phases.forEach((phase, phaseIdx) => {
      phase.movements.forEach((movement, movIdx) => {
        if (!(movement.side in battle.sides)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `movement side "${movement.side}" is not a key in battle.sides`,
            path: ['phases', phaseIdx, 'movements', movIdx, 'side'],
          })
        }
      })
    })
    if (battle.strengths) {
      for (const key of Object.keys(battle.strengths)) {
        if (!(key in battle.sides)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `strengths key "${key}" is not a key in battle.sides`,
            path: ['strengths', key],
          })
        }
      }
    }
  })

const stop = z.object({
  name: z.string().min(1),
  coords: latLng,
  date: z.string().min(1),
  story: z.string().min(1),
  camera: z.object({ altitude: z.number().positive(), pitch: z.number().optional() }).optional(),
  battle: battle.optional(),
})

export const journeySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  figure: z.string().min(1),
  title: z.string().min(1),
  years: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  intro: z.string().min(1),
  stops: z.array(stop).min(2),
})

export type Journey = z.infer<typeof journeySchema>
export type Stop = Journey['stops'][number]
export type Battle = NonNullable<Stop['battle']>
export type Phase = Battle['phases'][number]
export type Movement = Phase['movements'][number]
export type Landmark = NonNullable<Battle['landmarks']>[number]
export type BattleEvent = NonNullable<Phase['events']>[number]
export type LatLng = z.infer<typeof latLng>
