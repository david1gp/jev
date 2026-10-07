import * as v from "valibot"

export const decisionsPredicateSchema = v.object({
  type: v.literal("predicate"),
  name: v.pipe(v.string(), v.minLength(1)),
  instructions: v.pipe(v.string(), v.minLength(1)),
  criteria: v.optional(
    v.nullable(
      v.object({
        true: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
        false: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
      }),
    ),
  ),
})

export type DecisionsPredicateQuestion = v.InferOutput<typeof decisionsPredicateSchema>
