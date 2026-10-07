import {
  createResult,
  createResultError,
  type PromiseResult,
  type Result,
  resultTryParsingFetchErr,
} from "@adaptive-ds/result"
import * as v from "valibot"
import type { DecisionsClient } from "./decisionsClient.js"
import type { DecisionsClientOptions } from "./decisionsClientOptions.js"
import type { DecisionsEvaluateOptions } from "./decisionsEvaluateOptions.js"
import type { DecisionsFetch } from "./decisionsFetch.js"
import type { DecisionsRequest } from "./decisionsRequest.js"
import { decisionsRequestSchema } from "./decisionsRequestSchema.js"
import type { DecisionsResponse } from "./decisionsResponse.js"
import { decisionsResponseSchema } from "./decisionsResponseSchema.js"

const decisionsEndpoint = "https://api.openai.com/v1/decisions"
const defaultModel = "gpt-6-luna"
const defaultMaxRetries = 2
const defaultMaxRetryDelayMs = 10_000
const defaultRetryDelayMs = 250
const defaultTimeoutMs = 30_000
const maxResponseErrorLength = 2_000
const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504, 529])

const decisionsClientOptionsSchema = v.object({
  apiKey: v.pipe(v.string(), v.minLength(1)),
  baseUrl: v.optional(v.pipe(v.string(), v.minLength(1))),
  fetch: v.optional(v.unknown()),
  maxRetries: v.optional(v.pipe(v.number(), v.finite(), v.integer(), v.minValue(0), v.maxValue(5))),
  maxRetryDelayMs: v.optional(v.pipe(v.number(), v.finite(), v.integer(), v.minValue(0), v.maxValue(60_000))),
  retryDelayMs: v.optional(v.pipe(v.number(), v.finite(), v.integer(), v.minValue(0), v.maxValue(60_000))),
  signal: v.optional(v.unknown()),
  sleep: v.optional(v.unknown()),
  timeoutMs: v.optional(v.pipe(v.number(), v.finite(), v.integer(), v.minValue(1), v.maxValue(300_000))),
})

type AttemptResponse = {
  readonly response: Response
  readonly text: string
}

type AttemptFailure = "cancelled" | "network" | "timeout"

type AttemptResult =
  | { readonly success: true; readonly data: AttemptResponse }
  | { readonly success: false; readonly kind: AttemptFailure }

type RetrySleep = (milliseconds: number, signal?: AbortSignal) => Promise<void>

const signalIsValid = (value: unknown): value is AbortSignal => {
  if (value === undefined) return true
  if (value === null || typeof value !== "object") return false
  const candidate = value as {
    readonly aborted?: unknown
    readonly addEventListener?: unknown
    readonly removeEventListener?: unknown
  }
  return (
    typeof candidate.aborted === "boolean" &&
    typeof candidate.addEventListener === "function" &&
    typeof candidate.removeEventListener === "function"
  )
}

const sleepIsValid = (value: unknown): value is RetrySleep => value === undefined || typeof value === "function"

const responseTextRedact = (text: string, apiKey: string): string => {
  const redacted = apiKey.length === 0 ? text : text.split(apiKey).join("[REDACTED]")
  return redacted.slice(0, maxResponseErrorLength)
}

const clientError = (message: string): Result<never> => createResultError("decisionsClientCreate", message)

const endpointParse = (baseUrl: string): Result<string> => {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return clientError("The Decisions base URL was invalid")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return clientError("The Decisions base URL must use HTTP or HTTPS")
  }
  if (url.username || url.password || url.search || url.hash) {
    return clientError("The Decisions base URL must not contain credentials, query parameters, or a fragment")
  }

  return createResult(url.toString().replace(/\/$/u, ""))
}

const retryAfterMilliseconds = (response: Response, maximum: number): number | undefined => {
  const retryAfter = response.headers?.get?.("retry-after")?.trim()
  if (!retryAfter) return undefined

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(maximum, Math.round(seconds * 1_000))

  const date = Date.parse(retryAfter)
  if (!Number.isFinite(date)) return undefined
  return Math.min(maximum, Math.max(0, date - Date.now()))
}

const defaultSleep: RetrySleep = (milliseconds, signal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("cancelled"))
      return
    }

    const abort = () => {
      clearTimeout(timer)
      signal?.removeEventListener("abort", abort)
      reject(new Error("cancelled"))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort)
      resolve()
    }, milliseconds)
    signal?.addEventListener("abort", abort, { once: true })
  })

const retryDelay = (
  attempt: number,
  response: Response | undefined,
  retryDelayMs: number,
  maxRetryDelayMs: number,
): number => {
  const retryAfter = response === undefined ? undefined : retryAfterMilliseconds(response, maxRetryDelayMs)
  if (retryAfter !== undefined) return retryAfter
  return Math.min(maxRetryDelayMs, retryDelayMs * 2 ** attempt)
}

const requestAttempt = async (
  fetchFn: DecisionsFetch,
  endpoint: string,
  body: string,
  apiKey: string,
  timeoutMs: number,
  signals: readonly (AbortSignal | undefined)[],
): Promise<AttemptResult> => {
  const callerSignal = signals.find((signal): signal is AbortSignal => signal?.aborted === true)
  if (callerSignal !== undefined) return { success: false, kind: "cancelled" }

  const controller = new AbortController()
  let timedOut = false
  let abortReject: ((reason: AttemptFailure) => void) | undefined
  const abortPromise = new Promise<never>((_, reject) => {
    abortReject = reject
  })
  const abortListeners = signals
    .filter((signal): signal is AbortSignal => signal !== undefined)
    .map((signal) => {
      const abort = () => {
        controller.abort()
        abortReject?.(timedOut ? "timeout" : "cancelled")
      }
      signal.addEventListener("abort", abort, { once: true })
      return { signal, abort }
    })
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
    abortReject?.("timeout")
  }, timeoutMs)

  const requestPromise = (async () => {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    })
    const text = await response.text()
    return { response, text }
  })()
  void requestPromise.catch(() => undefined)

  try {
    const data = await Promise.race([requestPromise, abortPromise])
    return { success: true, data }
  } catch (error) {
    if (timedOut || error === "timeout") return { success: false, kind: "timeout" }
    if (error === "cancelled" || signals.some((signal) => signal?.aborted)) {
      return { success: false, kind: "cancelled" }
    }
    return { success: false, kind: "network" }
  } finally {
    clearTimeout(timeout)
    for (const { signal, abort } of abortListeners) signal.removeEventListener("abort", abort)
  }
}

const probabilitiesSumToOne = (probabilities: readonly number[]): boolean =>
  Math.abs(probabilities.reduce((total, probability) => total + probability, 0) - 1) <= 1e-6

const responseValidation = (
  request: DecisionsRequest,
  responseText: string,
  apiKey: string,
): Result<DecisionsResponse> => {
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), decisionsResponseSchema), responseText)
  if (!parsed.success) {
    return createResultError(
      "decisionsEvaluate",
      `The Decisions API returned an invalid response: ${v.summarize(parsed.issues)}`,
      responseTextRedact(responseText, apiKey),
    )
  }

  const requestedNames = request.questions.map((question) => question.name)
  const answerNames = parsed.output.answers.map((answer) => answer.name)
  if (
    new Set(requestedNames).size !== requestedNames.length ||
    requestedNames.length !== answerNames.length ||
    requestedNames.some((name) => !answerNames.includes(name))
  ) {
    return createResultError(
      "decisionsEvaluate",
      "The Decisions API returned answers that do not match the requested question names",
      responseTextRedact(responseText, apiKey),
    )
  }

  const questionsByName = new Map(request.questions.map((question) => [question.name, question]))
  for (const answer of parsed.output.answers) {
    const question = questionsByName.get(answer.name)
    if (question === undefined || (answer.type !== question.type && answer.type !== "refusal")) {
      return createResultError(
        "decisionsEvaluate",
        "The Decisions API returned an answer kind that does not match a requested question",
        responseTextRedact(responseText, apiKey),
      )
    }
    if (answer.type === "refusal") continue

    if (question.type === "choice" && answer.type === "choice") {
      const choiceValues = question.choices.map((choice) => choice.value)
      const probabilityValues = answer.probabilities.map((probability) => probability.value)
      if (
        !choiceValues.includes(answer.choice) ||
        choiceValues.length !== probabilityValues.length ||
        choiceValues.some((value) => !probabilityValues.includes(value)) ||
        !probabilitiesSumToOne(answer.probabilities.map((probability) => probability.probability))
      ) {
        return createResultError(
          "decisionsEvaluate",
          "The Decisions API returned choice probabilities that do not match the requested choices",
          responseTextRedact(responseText, apiKey),
        )
      }
      continue
    }

    if (question.type === "score" && answer.type === "score") {
      const levelIndexes = question.levels.map((_, index) => index)
      const probabilityValues = answer.probabilities.map((probability) => probability.value)
      if (
        levelIndexes.length !== probabilityValues.length ||
        levelIndexes.some((index) => !probabilityValues.includes(index)) ||
        answer.score < 0 ||
        answer.score > question.levels.length - 1 ||
        !probabilitiesSumToOne(answer.probabilities.map((probability) => probability.probability))
      ) {
        return createResultError(
          "decisionsEvaluate",
          "The Decisions API returned score probabilities that do not match the requested levels",
          responseTextRedact(responseText, apiKey),
        )
      }
    }
  }

  return createResult(parsed.output)
}

export function decisionsClientCreate(options: DecisionsClientOptions): Result<DecisionsClient> {
  const parsedOptions = v.safeParse(decisionsClientOptionsSchema, options)
  if (!parsedOptions.success)
    return clientError(`The Decisions client options were invalid: ${v.summarize(parsedOptions.issues)}`)

  const apiKey = parsedOptions.output.apiKey
  const fetchFn = parsedOptions.output.fetch ?? globalThis.fetch
  if (typeof fetchFn !== "function") return clientError("A fetch function is required")
  if (!signalIsValid(parsedOptions.output.signal)) return clientError("The Decisions client signal was invalid")
  if (!sleepIsValid(parsedOptions.output.sleep)) return clientError("The Decisions sleep function was invalid")

  const endpointResult = endpointParse(parsedOptions.output.baseUrl ?? decisionsEndpoint)
  if (!endpointResult.success) return endpointResult

  const maxRetries = parsedOptions.output.maxRetries ?? defaultMaxRetries
  const maxRetryDelayMs = parsedOptions.output.maxRetryDelayMs ?? defaultMaxRetryDelayMs
  const retryDelayMs = parsedOptions.output.retryDelayMs ?? defaultRetryDelayMs
  const sleep: RetrySleep = parsedOptions.output.sleep ?? defaultSleep
  const timeoutMs = parsedOptions.output.timeoutMs ?? defaultTimeoutMs
  const clientSignal = parsedOptions.output.signal

  const evaluate = async (
    request: DecisionsRequest,
    evaluateOptions: DecisionsEvaluateOptions = {},
  ): PromiseResult<DecisionsResponse> => {
    if (evaluateOptions === null || typeof evaluateOptions !== "object") {
      return createResultError("decisionsEvaluate", "The request options were invalid")
    }
    const requestResult = v.safeParse(decisionsRequestSchema, request)
    if (!requestResult.success) {
      return createResultError(
        "decisionsEvaluate",
        `The Decisions request was invalid: ${v.summarize(requestResult.issues)}`,
      )
    }
    if (!signalIsValid(evaluateOptions.signal))
      return createResultError("decisionsEvaluate", "The request signal was invalid")

    const validatedRequest = requestResult.output
    const model = validatedRequest.model ?? defaultModel
    if (model.trim().length === 0) return createResultError("decisionsEvaluate", "The request model must not be empty")

    const payload = {
      model,
      input: validatedRequest.input,
      questions: validatedRequest.questions,
    }

    let body: string
    try {
      body = JSON.stringify(payload)
    } catch {
      return createResultError("decisionsEvaluate", "The Decisions request could not be serialized")
    }
    if (typeof body !== "string")
      return createResultError("decisionsEvaluate", "The Decisions request could not be serialized")

    const signals = [clientSignal, evaluateOptions.signal]
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const attemptResult = await requestAttempt(
        fetchFn as DecisionsFetch,
        endpointResult.data,
        body,
        apiKey,
        timeoutMs,
        signals,
      )
      if (!attemptResult.success) {
        if (attemptResult.kind === "timeout")
          return createResultError("decisionsEvaluate", "The Decisions API request timed out")
        if (attemptResult.kind === "cancelled")
          return createResultError("decisionsEvaluate", "The Decisions API request was cancelled")
        if (attempt < maxRetries) {
          try {
            await sleep(
              retryDelay(attempt, undefined, retryDelayMs, maxRetryDelayMs),
              evaluateOptions.signal ?? clientSignal,
            )
          } catch {
            return createResultError("decisionsEvaluate", "The Decisions API request was cancelled")
          }
          if (signals.some((signal) => signal?.aborted)) {
            return createResultError("decisionsEvaluate", "The Decisions API request was cancelled")
          }
          continue
        }
        return createResultError("decisionsEvaluate", "The Decisions API request failed")
      }

      const { response, text } = attemptResult.data
      if (!response.ok) {
        if (retryableStatuses.has(response.status) && attempt < maxRetries) {
          try {
            await sleep(
              retryDelay(attempt, response, retryDelayMs, maxRetryDelayMs),
              evaluateOptions.signal ?? clientSignal,
            )
          } catch {
            return createResultError("decisionsEvaluate", "The Decisions API request was cancelled")
          }
          if (signals.some((signal) => signal?.aborted)) {
            return createResultError("decisionsEvaluate", "The Decisions API request was cancelled")
          }
          continue
        }
        const error = resultTryParsingFetchErr(
          "decisionsEvaluate",
          responseTextRedact(text, apiKey),
          response.status,
          response.statusText || "The Decisions API request failed",
        )
        return error
      }

      return responseValidation(validatedRequest, text, apiKey)
    }

    return createResultError("decisionsEvaluate", "The Decisions API request failed")
  }

  return createResult({ evaluate })
}
