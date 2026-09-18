import * as v from "valibot"
import { entryTypeSchema } from "../shared/entryTypeSchema.js"
import { noulCriteriaSchema } from "./noulCriteriaSchema.js"

export const noulSchema = v.pipe(
  v.object({
    type: v.literal("noul"),
    instructions: v.optional(entryTypeSchema),
    criteria: v.optional(v.nullable(noulCriteriaSchema)),
  }),
  v.check(
    ({ instructions, criteria }) =>
      (instructions !== undefined && instructions !== null) || (criteria !== undefined && criteria !== null),
    "Noul questions require instructions or criteria",
  ),
)
