import * as v from "valibot"
import { stateSchema } from "../state/stateSchema.js"
import { questionsSchema } from "../shared/questionsSchema.js"
import { systemOneImageSchema } from "./systemOneImageSchema.js"

export const systemOneRequestPayloadSchema = v.object({
  state: stateSchema,
  model: v.string(),
  questions: questionsSchema,
  images: v.optional(v.pipe(v.array(systemOneImageSchema), v.minLength(1), v.maxLength(4))),
})
