import type { ScoreCriteria } from "./scoreCriteriaSchema.js"
import type { ScoreOf } from "./scoreOf.js"

export type ScoreLegend<T extends ScoreCriteria> = {
  readonly [K in ScoreOf<T>]: T[K]
}
