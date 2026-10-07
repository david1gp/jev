import * as v from "valibot"
import { probabilitySchema } from "../shared/probabilitySchema.js"

export const decisionsScoreAnswerSchema = v.object({
  type: v.literal("score"),
  name: v.pipe(v.string(), v.minLength(1)),
  score: v.number(),
  probabilities: v.pipe(
    v.array(
      v.object({
        value: v.pipe(v.number(), v.integer(), v.minValue(0)),
        label: v.optional(v.string()),
        probability: probabilitySchema,
      }),
    ),
    v.minLength(1),
  ),
  confidence: probabilitySchema,
})

export type DecisionsScoreAnswer = v.InferOutput<typeof decisionsScoreAnswerSchema>
