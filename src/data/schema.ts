import { z } from 'zod'

const latLng = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

const movement = z.object({
  side: z.string(),
  style: z.enum(['advance', 'retreat', 'feint']),
  path: z.array(latLng).min(2),
  unit: z.string().min(1).max(40).optional(), // e.g. "Soult — IV Corps"
  branch: z.enum(['infantry', 'cavalry', 'artillery', 'naval', 'command']),
  echelon: z.enum(['corps', 'division', 'brigade', 'regiment', 'flotilla']),
  strength: z.number().int().positive().optional(),
  /** Unit enters at its first movement (reinforcement / detachment) rather than
   *  being present from the start of the battle. */
  arrives: z.boolean().optional(),
  /** Unit leaves after its last movement (hands off / withdraws — e.g. a corps
   *  that splits into its divisions) rather than persisting to the end. */
  departs: z.boolean().optional(),
})

const event = z.object({
  coords: latLng,
  label: z.string().min(1).max(60),
})

/** One leg of the protagonist commander's personal movement during a battle,
 *  keyed to a phase index. Phases the commander isn't listed in are treated as
 *  "hold position" (he rests where his last leg ended). */
const commanderMove = z.object({
  phase: z.number().int().min(0),
  path: z.array(latLng).min(2),
  /** He enters the field only at this leg (e.g. Grant rode up mid-battle) rather
   *  than being present from the opening phase. */
  arrives: z.boolean().optional(),
  note: z.string().max(120).optional(),
})

/** The journey's protagonist shown as a single special marker that follows his
 *  own researched path across the battle's phases (distinct from unit counters). */
const commander = z.object({
  name: z.string().min(1).max(40),
  side: z.string(),
  movements: z.array(commanderMove).min(1),
})

const phase = z.object({
  caption: z.string().min(1),
  duration: z.number().positive().optional(), // seconds; default applied in battlePlayback
  movements: z.array(movement).min(1),
  events: z.array(event).optional(),
})

const area = z.object({
  name: z.string().min(1).max(40),
  outline: z.array(latLng).min(3),
  kind: z.enum(['terrain', 'water', 'woods', 'settlement']).optional(),
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
    /** Area outlines whose EXTENT matters tactically (plateau, water body, settlement perimeter). */
    areas: z.array(area).optional(),
    /** Compass bearing FROM the site TOWARD the field-view camera position (degrees). */
    fieldAzimuth: z.number().min(0).max(360).optional(),
    /** Multiplier on the auto-computed framing altitude (default 1). Use <1 to
     *  frame tighter on the core fight when long approach marches would otherwise
     *  pull the camera too far back (e.g. Shiloh, whose 9 km countermarches dwarf
     *  a ~2 km battle). The distant legs then run off-frame — the classic
     *  battle-map look. */
    frameScale: z.number().positive().optional(),
    /** The protagonist commander's personal track across the battle (optional). */
    commander: commander.optional(),
  })
  .superRefine((battle, ctx) => {
    if (battle.commander) {
      if (!(battle.commander.side in battle.sides)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `commander side "${battle.commander.side}" is not a key in battle.sides`,
          path: ['commander', 'side'],
        })
      }
      battle.commander.movements.forEach((m, i) => {
        if (m.phase >= battle.phases.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `commander movement phase ${m.phase} is out of range (battle has ${battle.phases.length} phases)`,
            path: ['commander', 'movements', i, 'phase'],
          })
        }
      })
    }
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
  /** Real intermediate waypoints the route passes through to reach this stop from
   *  the previous one (e.g. a sea voyage via Panama). Omit for a direct line. */
  via: z.array(latLng).optional(),
  battle: battle.optional(),
})

export const journeySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    figure: z.string().min(1),
    title: z.string().min(1),
    years: z.string().min(1),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    intro: z.string().min(1),
    stops: z.array(stop).min(2),
    protagonistSide: z.string().min(1),
  })
  .superRefine((j, ctx) => {
    for (const s of j.stops) {
      if (s.battle && !(j.protagonistSide in s.battle.sides)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom,
          message: `protagonistSide "${j.protagonistSide}" missing from sides of battle "${s.battle.name}"`,
          path: ['protagonistSide'] })
      }
    }
  })

export type Journey = z.infer<typeof journeySchema>
export type Stop = Journey['stops'][number]
export type Battle = NonNullable<Stop['battle']>
export type Phase = Battle['phases'][number]
export type Movement = Phase['movements'][number]
export type BattleArea = NonNullable<Battle['areas']>[number]
export type BattleEvent = NonNullable<Phase['events']>[number]
export type Commander = NonNullable<Battle['commander']>
export type LatLng = z.infer<typeof latLng>
