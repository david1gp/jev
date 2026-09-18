import * as v from "valibot"
import { entryTypeSchema } from "../shared/entryTypeSchema.js"
import { choiceCriteriaSchema } from "./choiceCriteriaSchema.js"

export const choiceSchema = v.object({
  type: v.literal("choice"),
  instructions: v.optional(entryTypeSchema),
  criteria: choiceCriteriaSchema,
})
