import type { ScoreAnswer } from "./scoreAnswer.js"
import type { ScoreCriteria } from "./scoreCriteriaSchema.js"

export type ScoreResponse<T extends ScoreCriteria = ScoreCriteria> = ScoreAnswer<T>
