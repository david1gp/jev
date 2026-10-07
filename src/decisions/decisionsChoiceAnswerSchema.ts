import * as v from "valibot"
import { probabilitySchema } from "../shared/probabilitySchema.js"

export const decisionsChoiceAnswerSchema = v.object({
  type: v.literal("choice"),
  name: v.pipe(v.string(), v.minLength(1)),
  choice: v.pipe(v.string(), v.minLength(1)),
  probabilities: v.pipe(
    v.array(
      v.object({
        value: v.pipe(v.string(), v.minLength(1)),
        probability: probabilitySchema,
      }),
    ),
    v.minLength(1),
  ),
  confidence: probabilitySchema,
})

export type DecisionsChoiceAnswer = v.InferOutput<typeof decisionsChoiceAnswerSchema>
