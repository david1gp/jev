import * as v from "valibot"
import { type Description, descriptionSchema } from "../shared/descriptionSchema.js"

export const scoreCriteriaSchema = v.pipe(v.array(descriptionSchema), v.minLength(2), v.maxLength(10))

export type ScoreCriteria = readonly [Description, Description, ...Description[]]
