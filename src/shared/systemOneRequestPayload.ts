import type { State } from "../state/stateSchema.js"
import type { Questions } from "./questions.js"

export type SystemOneRequestPayload<Q extends Questions = Questions> = {
  state: State
  questions: Q
  model: string
}
