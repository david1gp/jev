import type { ScoreCriteria } from "./scoreCriteriaSchema.js"
import type { ScoreLegend } from "./scoreLegend.js"
import type { ScoreOf } from "./scoreOf.js"

export type ScoreAnswer<T extends ScoreCriteria = ScoreCriteria> = {
  readonly type: "score"
  readonly score: number
  readonly legend: ScoreLegend<T>
  readonly probabilities: { readonly [K in ScoreOf<T>]: number }
  readonly confidence: number
}
