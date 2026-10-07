import type { PromiseResult } from "@adaptive-ds/result"
import type { DecisionsEvaluateOptions } from "./decisionsEvaluateOptions.js"
import type { DecisionsRequest } from "./decisionsRequest.js"
import type { DecisionsResponse } from "./decisionsResponse.js"

export type DecisionsClient = {
  readonly evaluate: (request: DecisionsRequest, options?: DecisionsEvaluateOptions) => PromiseResult<DecisionsResponse>
}
