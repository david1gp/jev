import type { SystemOneFetch } from "./systemOneFetch.js"

export type SystemOneClientOptions = {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly fetch?: SystemOneFetch
  readonly maxRetries?: number
  readonly maxRetryDelayMs?: number
  readonly retryDelayMs?: number
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly timeoutMs?: number
}
