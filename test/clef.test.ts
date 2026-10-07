import { expect, test } from "bun:test"
import { clefClientCreate, clefFetchWrap, noul } from "../src/index.js"

const imageUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

const clefResponse = {
  model: "clef",
  answers: { urgent: { type: "noul", noul: 0.8 } },
  usage: { input_tokens: 12, output_tokens: 4 },
}

test("clef fetch wrapper unwraps workers AI envelopes and passes other bodies through", async () => {
  const wrapped = clefFetchWrap(async () =>
    Response.json({ result: clefResponse, success: true, errors: [], messages: [] }, { status: 200 }),
  )
  const unwrapped = await wrapped("https://example.test/clef")
  expect(await unwrapped.json()).toEqual(clefResponse)

  const plain = clefFetchWrap(async () => Response.json(clefResponse, { status: 200 }))
  expect(await (await plain("https://example.test/clef")).json()).toEqual(clefResponse)

  const failed = clefFetchWrap(async () => Response.json({ success: false, errors: ["busy"] }, { status: 429 }))
  const failure = await failed("https://example.test/clef")
  expect(failure.status).toBe(429)
  expect(await failure.json()).toEqual({ success: false, errors: ["busy"] })
})

test("clef client targets workers AI with the clef model by default", async () => {
  let input: string | URL | undefined
  let init: RequestInit | undefined
  const result = clefClientCreate({
    apiToken: "test-cf-token",
    accountId: "test-account",
    fetch: (async (requestInput: string | URL, requestInit?: RequestInit) => {
      input = requestInput
      init = requestInit
      return new Response(JSON.stringify(clefResponse), { status: 200 })
    }) as never,
    maxRetries: 0,
  })
  expect(result.success).toBe(true)
  if (!result.success) return

  const evaluated = await result.data.evaluate({
    state: "Checkout has been failing for an hour.",
    questions: { urgent: noul("Is this urgent?") },
    images: [imageUrl],
  })

  expect(evaluated.success).toBe(true)
  expect(input).toBe("https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/cloudflare/clef")
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-cf-token")
  expect(JSON.parse(init?.body as string)).toMatchObject({ model: "clef", images: [imageUrl] })
  if (evaluated.success) expect(evaluated.data.answers.urgent.noul).toBe(0.8)
})

test("clef client honors explicit model and base URL overrides", async () => {
  let body: Record<string, unknown> | undefined
  const result = clefClientCreate({
    apiToken: "test-cf-token",
    baseUrl: "http://localhost:11434/v1/systemone",
    model: "clef-flash",
    fetch: (async (_input: string | URL, init?: RequestInit) => {
      body = JSON.parse(init?.body as string) as Record<string, unknown>
      return new Response(JSON.stringify({ ...clefResponse, model: "clef-flash" }), { status: 200 })
    }) as never,
    maxRetries: 0,
  })
  expect(result.success).toBe(true)
  if (!result.success) return

  const evaluated = await result.data.evaluate({
    state: "Hello World",
    model: "clef",
    questions: { urgent: noul("Is this urgent?") },
  })
  expect(evaluated.success).toBe(true)
  expect(body?.model).toBe("clef")
})

test("clef client rejects missing credentials without fetching", async () => {
  expect(clefClientCreate({ apiToken: "", accountId: "test-account" }).success).toBe(false)
  expect(clefClientCreate({ apiToken: "test-cf-token" }).success).toBe(false)

  let fetchCalls = 0
  const result = clefClientCreate({
    apiToken: "test-cf-token",
    accountId: "test-account",
    fetch: (async () => {
      fetchCalls += 1
      return new Response("{}", { status: 200 })
    }) as never,
    maxRetries: 0,
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  const evaluated = await result.data.evaluate({ state: 42, questions: { q: noul("Q?") } } as never)
  expect(evaluated.success).toBe(false)
  expect(fetchCalls).toBe(0)
})
