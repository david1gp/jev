import * as v from "valibot"
import { type Description, descriptionSchema } from "../shared/descriptionSchema.js"

export const noulCriteriaSchema = v.object({
  true: v.optional(descriptionSchema),
  false: v.optional(descriptionSchema),
})

export type NoulCriteria = {
  true?: Description
  false?: Description
}
