import type { DecisionsInput } from "./decisionsInputSchema.js"
import type { DecisionsQuestion } from "./decisionsQuestionSchema.js"

export type DecisionsRequest = {
  input: DecisionsInput
  questions: readonly DecisionsQuestion[]
  model?: string
}
