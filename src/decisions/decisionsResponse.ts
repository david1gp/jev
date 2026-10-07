import type { DecisionsAnswer } from "./decisionsAnswerSchema.js"
import type { Usage } from "../shared/usageSchema.js"

export type DecisionsResponse = {
  readonly model?: string
  readonly answers: readonly DecisionsAnswer[]
  readonly usage?: Usage
}
