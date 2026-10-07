import * as v from "valibot"
import { decisionsInputSchema } from "./decisionsInputSchema.js"
import { decisionsQuestionSchema } from "./decisionsQuestionSchema.js"

export const decisionsRequestSchema = v.object({
  input: decisionsInputSchema,
  questions: v.pipe(v.array(decisionsQuestionSchema), v.minLength(1)),
  model: v.optional(v.string()),
})
