import * as v from "valibot"
import { usageSchema } from "../shared/usageSchema.js"
import { decisionsAnswerSchema } from "./decisionsAnswerSchema.js"

export const decisionsResponseSchema = v.object({
  model: v.optional(v.string()),
  answers: v.pipe(v.array(decisionsAnswerSchema), v.minLength(1)),
  usage: v.optional(usageSchema),
})
