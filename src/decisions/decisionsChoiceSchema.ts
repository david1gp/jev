import * as v from "valibot"

export const decisionsChoiceSchema = v.object({
  type: v.literal("choice"),
  name: v.pipe(v.string(), v.minLength(1)),
  instructions: v.pipe(v.string(), v.minLength(1)),
  choices: v.pipe(
    v.array(
      v.object({
        value: v.pipe(v.string(), v.minLength(1)),
        description: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
      }),
    ),
    v.minLength(2),
  ),
})

export type DecisionsChoiceQuestion = v.InferOutput<typeof decisionsChoiceSchema>
