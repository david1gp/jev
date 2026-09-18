import * as v from "valibot"
import { answerSchema } from "./answerSchema.js"
import { usageSchema } from "./usageSchema.js"

export const systemOneResponseSchema = v.object({
  model: v.string(),
  answers: v.pipe(v.record(v.string(), answerSchema), v.minEntries(1)),
  usage: usageSchema,
})
