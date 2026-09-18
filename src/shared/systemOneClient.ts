import type { PromiseResult } from "@adaptive-ds/result"
import type { Questions } from "./questions.js"
import type { SystemOneEvaluateOptions } from "./systemOneEvaluateOptions.js"
import type { SystemOneRequest } from "./systemOneRequest.js"
import type { SystemOneResponse } from "./systemOneResponse.js"

export type SystemOneClient = {
  readonly evaluate: <Q extends Questions>(
    request: SystemOneRequest<Q>,
    options?: SystemOneEvaluateOptions,
  ) => PromiseResult<SystemOneResponse<Q>>
}
