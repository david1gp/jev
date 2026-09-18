import type { EntryType } from "../shared/entryTypeSchema.js"
import type { ChoiceCriteria } from "./choiceCriteriaSchema.js"
import type { ChoiceQuestion } from "./choiceQuestion.js"

export function choice<const T extends ChoiceCriteria>(instructions: EntryType, criteria: T): ChoiceQuestion<T> {
  return {
    type: "choice",
    instructions,
    criteria,
  }
}
