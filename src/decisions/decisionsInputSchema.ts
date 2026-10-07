import * as v from "valibot"
import { decisionsMessageSchema } from "./decisionsMessageSchema.js"

export const decisionsInputSchema = v.union([
  v.pipe(v.string(), v.minLength(1)),
  v.pipe(v.array(decisionsMessageSchema), v.minLength(1)),
])

export type DecisionsInput = v.InferOutput<typeof decisionsInputSchema>
