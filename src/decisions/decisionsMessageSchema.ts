import * as v from "valibot"
import { decisionsInputPartSchema } from "./decisionsInputPartSchema.js"

export const decisionsMessageSchema = v.object({
  role: v.optional(v.picklist(["user", "system", "developer"]), "user"),
  content: v.pipe(v.array(decisionsInputPartSchema), v.minLength(1)),
})

export type DecisionsMessage = v.InferOutput<typeof decisionsMessageSchema>
