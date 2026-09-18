import type { EntryType } from "../shared/entryTypeSchema.js"
import type { NoulCriteria } from "./noulCriteriaSchema.js"

export type NoulQuestion = {
  type: "noul"
  instructions?: EntryType
  criteria?: NoulCriteria | null
}
