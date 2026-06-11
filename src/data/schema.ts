import { z } from 'zod'

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

const movement = z.object({
  side: z.string(),
  style: z.enum(['advance', 'retreat', 'feint']),
  path: z.array(latLng).min(2),
})

const phase = z.object({
  caption: z.string().min(1),
  duration: z.number().positive().optional(), // seconds; default applied in battlePlayback
  movements: z.array(movement).min(1),
})

const battle = z
  .object({
    name: z.string().min(1),
    date: z.string().min(1),
    sides: z
      .record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/))
      .refine((s) => Object.keys(s).length > 0, { message: 'sides must have at least one entry' }),
    phases: z.array(phase).min(1),
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
export type LatLng = z.infer<typeof latLng>
