import * as v from "valibot"
import { decisionsChoiceSchema } from "./decisionsChoiceSchema.js"
import { decisionsPredicateSchema } from "./decisionsPredicateSchema.js"
import { decisionsScoreSchema } from "./decisionsScoreSchema.js"

export const decisionsQuestionSchema = v.variant("type", [
  decisionsPredicateSchema,
  decisionsChoiceSchema,
  decisionsScoreSchema,
])

export type DecisionsQuestion = v.InferOutput<typeof decisionsQuestionSchema>
