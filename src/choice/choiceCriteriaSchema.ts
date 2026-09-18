import * as v from "valibot"
import { type Description, descriptionSchema } from "../shared/descriptionSchema.js"

export const choiceCriteriaSchema = v.pipe(v.record(v.string(), descriptionSchema), v.minEntries(1), v.maxEntries(255))

export type ChoiceCriteria = Record<string, Description>
