import type { PromiseResult } from "@adaptive-ds/result"
import type { Questions } from "../shared/questions.js"
import type { SystemOneEvaluateOptions } from "../system/systemOneEvaluateOptions.js"
import type { SystemOneResponse } from "../system/systemOneResponse.js"
import type { ClefRequest } from "./clefRequest.js"

export type ClefClient = {
  readonly evaluate: <Q extends Questions>(
    request: ClefRequest<Q>,
    options?: SystemOneEvaluateOptions,
  ) => PromiseResult<SystemOneResponse<Q>>
}
