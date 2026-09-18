import type { ChoiceCriteria } from "./choiceCriteriaSchema.js"

export type ChoiceAnswer<T extends ChoiceCriteria = ChoiceCriteria> = {
  readonly type: "choice"
  readonly choice: keyof T & string
  readonly probabilities: { readonly [K in keyof T]: number }
  readonly confidence: number
}
