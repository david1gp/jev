import type { ScoreCriteria } from "./scoreCriteriaSchema.js"

export type ScoreOf<T extends ScoreCriteria> = number extends T["length"] ? number : Extract<keyof T, `${number}`>
