import type { SystemOneFetch } from "../system/systemOneFetch.js"

export type ClefClientOptions = {
  readonly apiToken: string
  readonly accountId?: string
  readonly baseUrl?: string
  readonly model?: string
  readonly fetch?: SystemOneFetch
  readonly maxRetries?: number
  readonly maxRetryDelayMs?: number
  readonly retryDelayMs?: number
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly timeoutMs?: number
}
