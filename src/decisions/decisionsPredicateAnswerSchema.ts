import * as v from "valibot"
import { probabilitySchema } from "../shared/probabilitySchema.js"

export const decisionsPredicateAnswerSchema = v.object({
  type: v.literal("predicate"),
  name: v.pipe(v.string(), v.minLength(1)),
  probability: probabilitySchema,
})

export type DecisionsPredicateAnswer = v.InferOutput<typeof decisionsPredicateAnswerSchema>
