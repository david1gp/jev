import type { DecisionsFetch } from "./decisionsFetch.js"

export type DecisionsClientOptions = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly fetch?: DecisionsFetch
  readonly maxRetries?: number
  readonly maxRetryDelayMs?: number
  readonly retryDelayMs?: number
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly timeoutMs?: number
}
