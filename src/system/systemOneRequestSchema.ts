import * as v from "valibot"
import { stateSchema } from "../state/stateSchema.js"
import { questionsSchema } from "../shared/questionsSchema.js"

export const systemOneRequestSchema = v.object({
  state: stateSchema,
  model: v.optional(v.string()),
  questions: questionsSchema,
})
