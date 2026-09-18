import * as v from "valibot"
import { entryTypeSchema } from "../shared/entryTypeSchema.js"

export const stateSchema = v.nonNullable(entryTypeSchema)

export type State = v.InferOutput<typeof stateSchema>
