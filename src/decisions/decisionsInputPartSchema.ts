import * as v from "valibot"
import { decisionsImagePartSchema } from "./decisionsImagePartSchema.js"
import { decisionsTextPartSchema } from "./decisionsTextPartSchema.js"

export const decisionsInputPartSchema = v.variant("type", [decisionsTextPartSchema, decisionsImagePartSchema])

export type DecisionsInputPart = v.InferOutput<typeof decisionsInputPartSchema>
