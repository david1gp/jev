import type { EntryType } from "../shared/entryTypeSchema.js"
import type { ChoiceCriteria } from "./choiceCriteriaSchema.js"

export type ChoiceQuestion<T extends ChoiceCriteria = ChoiceCriteria> = {
  type: "choice"
  instructions?: EntryType
  criteria: T
}
