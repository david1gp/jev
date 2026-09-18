import * as v from "valibot"
import { jsonValueSchema } from "./jsonValueSchema.js"

export const entryTypeSchema = v.union([
  v.string(),
  v.array(jsonValueSchema),
  v.record(v.string(), jsonValueSchema),
  v.null(),
])

export type EntryType = v.InferOutput<typeof entryTypeSchema>
