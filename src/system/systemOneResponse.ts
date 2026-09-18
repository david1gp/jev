import type { Questions } from "../shared/questions.js"
import type { ResultFor } from "../shared/resultFor.js"
import type { Usage } from "../shared/usageSchema.js"

export type SystemOneResponse<Q extends Questions = Questions> = {
  readonly model: string
  readonly answers: { readonly [K in keyof Q]: ResultFor<Q[K]> }
  readonly usage: Usage
}
