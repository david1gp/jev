import * as v from "valibot"

export const decisionsTextPartSchema = v.object({
  type: v.literal("input_text"),
  text: v.pipe(v.string(), v.minLength(1)),
})

export type DecisionsTextPart = v.InferOutput<typeof decisionsTextPartSchema>
