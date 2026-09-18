import * as v from "valibot"
import { entryTypeSchema } from "./entryTypeSchema.js"

export const descriptionSchema = v.nullable(entryTypeSchema)

export type Description = v.InferOutput<typeof descriptionSchema>
