import { expect, test } from "bun:test"
import type { SystemOneClientOptions } from "../src/index.js"
import { choice, noul, score, systemOneClientCreate } from "../src/index.js"

const questions = {
  urgent: noul("Is this urgent?"),
  route: choice("Which team should handle this?", { billing: null, technical: null }),
} as const

const request = {
  state: "The export is broken",
  questions,
}

const response = {
  model: "jev-latest",
  answers: {
    urgent: { type: "noul", noul: 0.9 },
    route: {
      type: "choice",
      choice: "technical",
      probabilities: { billing: 0.1, technical: 0.9 },
      confidence: 0.8,
    },
  },
  usage: { input_tokens: 10, output_tokens: 5 },
}

const responseJson = () => new Response(JSON.stringify(response), { status: 200 })

const clientCreate = (
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>,
  options: Partial<SystemOneClientOptions> = {},
) => {
  const result = systemOneClientCreate({
    apiKey: "test-api-key",
    baseUrl: "https://example.test/systemone",
    fetch,
    maxRetries: 0,
    ...options,
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

test("evaluates a typed batch with defaults, authentication, and named answers", async () => {
  let input: string | URL | undefined
  let init: RequestInit | undefined
  const client = clientCreate(async (requestInput, requestInit) => {
    input = requestInput
    init = requestInit
    return responseJson()
  })

  const result = await client.evaluate(request)

  expect(result.success).toBe(true)
  expect(input).toBe("https://example.test/systemone")
  expect(init?.method).toBe("POST")
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-api-key")
  expect(new Headers(init?.headers).get("content-type")).toBe("application/json")
  expect(JSON.parse(init?.body as string)).toEqual({ ...request, model: "jev-latest" })
  if (result.success) {
    expect(result.data.answers.urgent.noul).toBe(0.9)
    expect(result.data.answers.route.choice).toBe("technical")
  }
})

test("returns Result errors for malformed client and request inputs without fetching", async () => {
  const missingApiKey = systemOneClientCreate({} as never)
  expect(missingApiKey.success).toBe(false)

  let fetchCalls = 0
  const client = clientCreate(async () => {
    fetchCalls += 1
    return responseJson()
  })
  const result = await client.evaluate({ state: 42, questions } as never)

  expect(result.success).toBe(false)
  expect(fetchCalls).toBe(0)
})

test("returns Result errors for malformed JSON, invalid responses, missing names, and mismatched answer kinds", async () => {
  const malformedJsonClient = clientCreate(async () => new Response("not-json", { status: 200 }))
  const malformedJson = await malformedJsonClient.evaluate(request)
  expect(malformedJson.success).toBe(false)

  const invalidResponseClient = clientCreate(
    async () =>
      new Response(JSON.stringify({ ...response, usage: { input_tokens: -1, output_tokens: 5 } }), { status: 200 }),
  )
  const invalidResponse = await invalidResponseClient.evaluate(request)
  expect(invalidResponse.success).toBe(false)

  const missingNameClient = clientCreate(
    async () =>
      new Response(
        JSON.stringify({
          ...response,
          answers: { urgent: response.answers.urgent },
        }),
        { status: 200 },
      ),
  )
  const missingName = await missingNameClient.evaluate(request)
  expect(missingName.success).toBe(false)

  const mismatchedKindClient = clientCreate(
    async () =>
      new Response(
        JSON.stringify({
          ...response,
          answers: {
            ...response.answers,
            urgent: response.answers.route,
          },
        }),
        { status: 200 },
      ),
  )
  const mismatchedKind = await mismatchedKindClient.evaluate(request)
  expect(mismatchedKind.success).toBe(false)
})

test("rejects answer distributions and score levels that do not match requested criteria", async () => {
  const choiceClient = clientCreate(
    async () =>
      new Response(
        JSON.stringify({
          ...response,
          answers: {
            ...response.answers,
            route: { ...response.answers.route, probabilities: { technical: 1 } },
          },
        }),
        { status: 200 },
      ),
  )
  const choiceResult = await choiceClient.evaluate(request)
  expect(choiceResult.success).toBe(false)
  if (!choiceResult.success) expect(choiceResult.errorMessage).toContain("choice probabilities")

  const scoreRequest = {
    state: "The export is broken",
    questions: { severity: score("How severe is this?", ["low", "high"] as const) },
  }
  const scoreClient = clientCreate(
    async () =>
      new Response(
        JSON.stringify({
          model: "jev-latest",
          answers: {
            severity: {
              type: "score",
              score: 1,
              legend: { "0": "low", "2": "high" },
              probabilities: { "0": 0, "2": 1 },
              confidence: 1,
            },
          },
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
        { status: 200 },
      ),
  )
  const scoreResult = await scoreClient.evaluate(scoreRequest)
  expect(scoreResult.success).toBe(false)
  if (!scoreResult.success) expect(scoreResult.errorMessage).toContain("score levels")
})

test("returns safe HTTP and network Result errors and does not retry authentication failures", async () => {
  let httpCalls = 0
  const httpClient = clientCreate(
    async () => {
      httpCalls += 1
      return new Response(JSON.stringify({ message: "invalid test-api-key" }), {
        status: 401,
        statusText: "Unauthorized",
      })
    },
    { maxRetries: 2 },
  )
  const httpResult = await httpClient.evaluate(request)
  expect(httpResult.success).toBe(false)
  if (!httpResult.success) {
    expect(httpResult.statusCode).toBe(401)
    expect(httpResult.errorMessage).not.toContain("test-api-key")
    expect(httpResult.errorData ?? "").not.toContain("test-api-key")
  }
  expect(httpCalls).toBe(1)

  let networkCalls = 0
  const networkClient = clientCreate(
    async () => {
      networkCalls += 1
      throw new Error("network failure")
    },
    { maxRetries: 1, retryDelayMs: 0, sleep: async () => undefined },
  )
  const networkResult = await networkClient.evaluate(request)
  expect(networkResult.success).toBe(false)
  expect(networkCalls).toBe(2)
})

test("retries bounded 429 and 529 responses before returning a validated answer", async () => {
  let calls = 0
  const delays: number[] = []
  const client = clientCreate(
    async () => {
      calls += 1
      if (calls === 1) return new Response("busy", { status: 429, headers: { "Retry-After": "0" } })
      if (calls === 2) return new Response("overloaded", { status: 529 })
      return responseJson()
    },
    {
      maxRetries: 2,
      retryDelayMs: 10,
      sleep: async (milliseconds) => {
        delays.push(milliseconds)
      },
    },
  )

  const result = await client.evaluate(request)

  expect(result.success).toBe(true)
  expect(calls).toBe(3)
  expect(delays).toEqual([0, 20])
})

test("returns timeout and caller cancellation as Result errors", async () => {
  const timeoutClient = clientCreate(
    async (_input, init) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })
      }),
    { timeoutMs: 5 },
  )
  const timeoutResult = await timeoutClient.evaluate(request)
  expect(timeoutResult.success).toBe(false)
  if (!timeoutResult.success) expect(timeoutResult.errorMessage).toContain("timed out")

  const controller = new AbortController()
  let cancellationCalls = 0
  const cancellationClient = clientCreate(async (_input, init) => {
    cancellationCalls += 1
    return new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })
    })
  })
  const pending = cancellationClient.evaluate(request, { signal: controller.signal })
  controller.abort()
  const cancellationResult = await pending

  expect(cancellationResult.success).toBe(false)
  if (!cancellationResult.success) expect(cancellationResult.errorMessage).toContain("cancelled")
  expect(cancellationCalls).toBe(1)
})
