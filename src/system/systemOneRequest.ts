import type { State } from "../state/stateSchema.js"
import type { Questions } from "../shared/questions.js"

export type SystemOneRequest<Q extends Questions = Questions> = {
  state: State
  questions: Q
  model?: string
}
