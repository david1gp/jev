import * as v from "valibot"

export const decisionsRefusalAnswerSchema = v.object({
  type: v.literal("refusal"),
  name: v.pipe(v.string(), v.minLength(1)),
})

export type DecisionsRefusalAnswer = v.InferOutput<typeof decisionsRefusalAnswerSchema>
