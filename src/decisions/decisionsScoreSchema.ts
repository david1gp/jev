import * as v from "valibot"

export const decisionsScoreSchema = v.object({
  type: v.literal("score"),
  name: v.pipe(v.string(), v.minLength(1)),
  instructions: v.pipe(v.string(), v.minLength(1)),
  levels: v.pipe(
    v.array(
      v.object({
        label: v.pipe(v.string(), v.minLength(1)),
        description: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
      }),
    ),
    v.minLength(2),
    v.maxLength(10),
  ),
})

export type DecisionsScoreQuestion = v.InferOutput<typeof decisionsScoreSchema>
