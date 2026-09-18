import type { EntryType } from "../shared/entryTypeSchema.js"
import type { ScoreCriteria } from "./scoreCriteriaSchema.js"

export type ScoreQuestion<T extends ScoreCriteria = ScoreCriteria> = {
  type: "score"
  instructions?: EntryType
  criteria: T
}
