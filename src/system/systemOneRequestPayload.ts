import type { State } from "../state/stateSchema.js"
import type { Questions } from "../shared/questions.js"
import type { SystemOneImage } from "./systemOneImageSchema.js"

export type SystemOneRequestPayload<Q extends Questions = Questions> = {
  state: State
  questions: Q
  model: string
  images?: readonly SystemOneImage[]
}
