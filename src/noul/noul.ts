import type { EntryType } from "../shared/entryTypeSchema.js"
import type { NoulCriteria } from "./noulCriteriaSchema.js"
import type { NoulQuestion } from "./noulQuestion.js"

export function noul(instructions: EntryType = null, criteria?: NoulCriteria | null): NoulQuestion {
  return {
    type: "noul",
    instructions,
    ...(criteria === undefined ? {} : { criteria }),
  }
}
