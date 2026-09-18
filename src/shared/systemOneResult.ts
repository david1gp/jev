import type { Questions } from "./questions.js"
import type { SystemOneResponse } from "./systemOneResponse.js"

export type SystemOneResult<Q extends Questions = Questions> = SystemOneResponse<Q>
