import * as v from "valibot"
import { decisionsChoiceAnswerSchema } from "./decisionsChoiceAnswerSchema.js"
import { decisionsPredicateAnswerSchema } from "./decisionsPredicateAnswerSchema.js"
import { decisionsRefusalAnswerSchema } from "./decisionsRefusalAnswerSchema.js"
import { decisionsScoreAnswerSchema } from "./decisionsScoreAnswerSchema.js"

export const decisionsAnswerSchema = v.variant("type", [
  decisionsPredicateAnswerSchema,
  decisionsChoiceAnswerSchema,
  decisionsScoreAnswerSchema,
  decisionsRefusalAnswerSchema,
])

export type DecisionsAnswer = v.InferOutput<typeof decisionsAnswerSchema>
