import type { EntryType } from "../shared/entryTypeSchema.js"
import type { ScoreCriteria } from "./scoreCriteriaSchema.js"
import type { ScoreQuestion } from "./scoreQuestion.js"

export function score<const T extends ScoreCriteria>(instructions: EntryType, criteria: T): ScoreQuestion<T> {
  return {
    type: "score",
    instructions,
    criteria,
  }
}
