import * as v from "valibot"
import { stateSchema } from "../state/stateSchema.js"
import { questionsSchema } from "./questionsSchema.js"

export const systemOneRequestPayloadSchema = v.object({
  state: stateSchema,
  model: v.string(),
  questions: questionsSchema,
})
