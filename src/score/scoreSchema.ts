import * as v from "valibot"
import { entryTypeSchema } from "../shared/entryTypeSchema.js"
import { scoreCriteriaSchema } from "./scoreCriteriaSchema.js"

export const scoreSchema = v.object({
  type: v.literal("score"),
  instructions: v.optional(entryTypeSchema),
  criteria: scoreCriteriaSchema,
})
