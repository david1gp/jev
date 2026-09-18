import * as v from "valibot"
import { stateSchema } from "../state/stateSchema.js"
import { questionsSchema } from "./questionsSchema.js"

export const systemOneRequestSchema = v.object({
  state: stateSchema,
  model: v.optional(v.string()),
  questions: questionsSchema,
})
