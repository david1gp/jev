import type { Questions } from "./questions.js"
import type { ResultFor } from "./resultFor.js"
import type { Usage } from "./usageSchema.js"

export type SystemOneResponse<Q extends Questions = Questions> = {
  readonly model: string
  readonly answers: { readonly [K in keyof Q]: ResultFor<Q[K]> }
  readonly usage: Usage
}
