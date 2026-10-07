import { createResult, createResultError, type PromiseResult, type Result } from "@adaptive-ds/result"
import type { Questions } from "../shared/questions.js"
import { systemOneClientCreate } from "../system/systemOneClientCreate.js"
import type { SystemOneEvaluateOptions } from "../system/systemOneEvaluateOptions.js"
import type { SystemOneRequest } from "../system/systemOneRequest.js"
import type { SystemOneResponse } from "../system/systemOneResponse.js"
import type { ClefClient } from "./clefClient.js"
import type { ClefClientOptions } from "./clefClientOptions.js"
import { clefFetchWrap } from "./clefFetchWrap.js"

const defaultModel = "clef"

export function clefClientCreate(options: ClefClientOptions): Result<ClefClient> {
  const op = "clefClientCreate"
  if (options === null || typeof options !== "object")
    return createResultError(op, "The Clef client options were invalid")
  if (typeof options.apiToken !== "string" || options.apiToken.length === 0)
    return createResultError(op, "A Cloudflare API token is required")

  let baseUrl = options.baseUrl
  if (baseUrl === undefined) {
    if (options.accountId === undefined || options.accountId.trim().length === 0)
      return createResultError(op, "A Cloudflare account ID or base URL is required")
    baseUrl = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/run/@cf/cloudflare/clef`
  }

  const clientResult = systemOneClientCreate({
    apiKey: options.apiToken,
    baseUrl,
    fetch: clefFetchWrap(options.fetch ?? globalThis.fetch),
    ...(options.maxRetries === undefined ? {} : { maxRetries: options.maxRetries }),
    ...(options.maxRetryDelayMs === undefined ? {} : { maxRetryDelayMs: options.maxRetryDelayMs }),
    ...(options.retryDelayMs === undefined ? {} : { retryDelayMs: options.retryDelayMs }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.sleep === undefined ? {} : { sleep: options.sleep }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  })
  if (!clientResult.success) return createResultError(op, clientResult.errorMessage)

  const model = options.model ?? defaultModel
  const evaluate = async <Q extends Questions>(
    request: SystemOneRequest<Q>,
    evaluateOptions: SystemOneEvaluateOptions = {},
  ): PromiseResult<SystemOneResponse<Q>> =>
    clientResult.data.evaluate(request.model === undefined ? { ...request, model } : request, evaluateOptions)

  return createResult({ evaluate })
}
