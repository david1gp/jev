import { expect, test } from "bun:test"
import * as v from "valibot"
import type { ClefRequest, SystemOneRequest } from "../src/index.js"
import { choice, noul, systemOneClientCreate, systemOneImageSchema, systemOneRequestSchema } from "../src/index.js"

const imageUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

test("system one image schema accepts data URLs and content objects", () => {
  expect(v.safeParse(systemOneImageSchema, imageUrl).success).toBe(true)
  expect(v.safeParse(systemOneImageSchema, { content_type: "image/jpeg", base64: "aGVsbG8=" }).success).toBe(true)
  expect(v.safeParse(systemOneImageSchema, "https://example.test/p.png").success).toBe(false)
  expect(v.safeParse(systemOneImageSchema, "data:image/gif;base64,aGVsbG8=").success).toBe(false)
  expect(
    v.safeParse(systemOneRequestSchema, {
      state: "Inspect this photo.",
      questions: { damaged: noul("Is it damaged?") },
      images: [imageUrl],
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(systemOneRequestSchema, {
      state: "Inspect this photo.",
      questions: { damaged: noul("Is it damaged?") },
      images: [],
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(systemOneRequestSchema, {
      state: "Inspect this photo.",
      questions: { damaged: noul("Is it damaged?") },
      images: [imageUrl, imageUrl, imageUrl, imageUrl, imageUrl],
    }).success,
  ).toBe(false)
})

test("image param typing follows the provider request type", () => {
  const text: SystemOneRequest = { state: "Inspect this photo.", questions: { damaged: noul("Is it damaged?") } }
  const vision: ClefRequest = { ...text, images: [imageUrl] }
  expect(vision.images).toHaveLength(1)
  // @ts-expect-error images are Clef-only while hosted Jev is text-only
  const rejected: SystemOneRequest = { ...text, images: [imageUrl] }
  expect(rejected).toBeDefined()
})

test("system one client sends images and omits them when absent", async () => {
  const bodies: unknown[] = []
  const result = systemOneClientCreate({
    apiKey: "test-api-key",
    baseUrl: "https://example.test/systemone",
    fetch: (async (_input: string | URL, init?: RequestInit) => {
      const payload = JSON.parse(init?.body as string) as {
        model: string
        questions: Record<string, { type: string }>
      }
      bodies.push(payload)
      const answers = Object.fromEntries(
        Object.entries(payload.questions).map(([name, question]) => [
          name,
          question.type === "choice"
            ? { type: "choice", choice: "billing", probabilities: { billing: 1, technical: 0 }, confidence: 1 }
            : { type: "noul", noul: 0.9 },
        ]),
      )
      return new Response(
        JSON.stringify({
          model: payload.model,
          answers,
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
        { status: 200 },
      )
    }) as never,
    maxRetries: 0,
  })
  expect(result.success).toBe(true)
  if (!result.success) return

  const withImages = await result.data.evaluate({
    state: "Inspect this photo.",
    questions: { damaged: noul("Is it damaged?") },
    // Images are typed on ClefRequest only; the shared wire runtime still forwards them.
    images: [imageUrl],
  } as never)
  expect(withImages.success).toBe(true)
  expect(bodies[0]).toMatchObject({ model: "jev-latest", images: [imageUrl] })

  const withoutImages = await result.data.evaluate({
    state: "Plain text.",
    questions: { route: choice("Which team?", { billing: null, technical: null }) },
  })
  expect(withoutImages.success).toBe(true)
  expect(bodies[1]).not.toHaveProperty("images")
})
