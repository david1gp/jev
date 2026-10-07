import type { PromiseResult } from "@adaptive-ds/result"
import type { Questions } from "../shared/questions.js"
import type { SystemOneEvaluateOptions } from "../system/systemOneEvaluateOptions.js"
import type { SystemOneRequest } from "../system/systemOneRequest.js"
import type { SystemOneResponse } from "../system/systemOneResponse.js"

export type ClefClient = {
  readonly evaluate: <Q extends Questions>(
    request: SystemOneRequest<Q>,
    options?: SystemOneEvaluateOptions,
  ) => PromiseResult<SystemOneResponse<Q>>
}
