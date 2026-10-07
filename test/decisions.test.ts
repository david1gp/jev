import { expect, test } from "bun:test"
import * as v from "valibot"
import type { DecisionsClientOptions } from "../src/index.js"
import {
  decisionsChoice,
  decisionsClientCreate,
  decisionsPredicate,
  decisionsRequestSchema,
  decisionsResponseSchema,
  decisionsScore,
} from "../src/index.js"

const imageUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

test("decisions helpers build the documented question shapes", () => {
  expect(decisionsPredicate("visible_damage", "Is the product damaged?")).toEqual({
    type: "predicate",
    name: "visible_damage",
    instructions: "Is the product damaged?",
  })
  expect(decisionsPredicate("visible_damage", "Is the product damaged?", { true: "Cracked", false: "Intact" })).toEqual(
    {
      type: "predicate",
      name: "visible_damage",
      instructions: "Is the product damaged?",
      criteria: { true: "Cracked", false: "Intact" },
    },
  )
  expect(decisionsChoice("department", "Which team?", { billing: "Payments", technical: null })).toEqual({
    type: "choice",
    name: "department",
    instructions: "Which team?",
    choices: [{ value: "billing", description: "Payments" }, { value: "technical" }],
  })
  expect(
    decisionsScore("severity", "How severe?", ["Cosmetic", { label: "Blocked", description: "No workaround" }]),
  ).toEqual({
    type: "score",
    name: "severity",
    instructions: "How severe?",
    levels: [{ label: "Cosmetic" }, { label: "Blocked", description: "No workaround" }],
  })
})

test("decisions input accepts text, messages, and inline base64 images", () => {
  const request = {
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Inspect the product in this photo." },
          { type: "input_image", image_url: imageUrl },
        ],
      },
    ],
    questions: [decisionsPredicate("visible_damage", "Is the product damaged?")],
  }
  expect(v.safeParse(decisionsRequestSchema, request).success).toBe(true)
  expect(v.safeParse(decisionsRequestSchema, { ...request, input: "A plain state" }).success).toBe(true)
  expect(v.safeParse(decisionsRequestSchema, { ...request, input: "" }).success).toBe(false)
  expect(
    v.safeParse(decisionsRequestSchema, {
      ...request,
      input: [{ role: "user", content: [{ type: "input_image", image_url: "https://example.test/p.png" }] }],
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(decisionsRequestSchema, {
      input: "state",
      questions: [decisionsChoice("department", "Which team?", { only: "One option" })],
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(decisionsRequestSchema, { input: "state", questions: [decisionsScore("s", "Rate?", ["low"])] }).success,
  ).toBe(false)
})

const clientCreate = (
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>,
  options: Partial<DecisionsClientOptions> = {},
) => {
  const result = decisionsClientCreate({ apiKey: "test-openai-key", fetch, maxRetries: 0, ...options })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

const decisionsResponse = {
  model: "gpt-6-luna",
  answers: [
    { type: "predicate", name: "visible_damage", probability: 0.92 },
    {
      type: "choice",
      name: "department",
      choice: "billing",
      probabilities: [
        { value: "billing", probability: 0.95 },
        { value: "technical", probability: 0.05 },
      ],
      confidence: 0.93,
    },
    {
      type: "score",
      name: "severity",
      score: 1.1,
      probabilities: [
        { value: 0, probability: 0.1 },
        { value: 1, probability: 0.7 },
        { value: 2, probability: 0.2 },
      ],
      confidence: 0.55,
    },
  ],
  usage: { input_tokens: 100, output_tokens: 0 },
}

const decisionsRequest = {
  input: "I was charged twice for my order.",
  questions: [
    decisionsPredicate("visible_damage", "Is the product damaged?"),
    decisionsChoice("department", "Which team?", { billing: "Payments", technical: "Bugs" }),
    decisionsScore("severity", "How severe?", ["Cosmetic", "Workaround", "Blocked"]),
  ],
}

test("decisions client posts to the decisions endpoint with defaults and authentication", async () => {
  let input: string | URL | undefined
  let init: RequestInit | undefined
  const client = clientCreate(async (requestInput, requestInit) => {
    input = requestInput
    init = requestInit
    return new Response(JSON.stringify(decisionsResponse), { status: 200 })
  })

  const result = await client.evaluate(decisionsRequest)

  expect(result.success).toBe(true)
  expect(input).toBe("https://api.openai.com/v1/decisions")
  expect(init?.method).toBe("POST")
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-openai-key")
  expect(JSON.parse(init?.body as string)).toEqual({ ...decisionsRequest, model: "gpt-6-luna" })
  if (result.success) {
    expect(result.data.answers).toHaveLength(3)
    expect(result.data.answers[0]).toMatchObject({ type: "predicate", probability: 0.92 })
  }
})

test("decisions client accepts refusals and rejects mismatched answers without fetching twice", async () => {
  const refusal = {
    answers: [{ type: "refusal", name: "visible_damage" }],
  }
  const refusalClient = clientCreate(async () => new Response(JSON.stringify(refusal), { status: 200 }))
  const refusalResult = await refusalClient.evaluate({
    input: "state",
    questions: [decisionsPredicate("visible_damage", "Damaged?")],
  })
  expect(refusalResult.success).toBe(true)

  const mismatchClient = clientCreate(async () => new Response(JSON.stringify(decisionsResponse), { status: 200 }))
  const mismatchResult = await mismatchClient.evaluate({
    input: "state",
    questions: [decisionsPredicate("other", "Something else?")],
  })
  expect(mismatchResult.success).toBe(false)

  const badProbabilityClient = clientCreate(async () => {
    const tampered = structuredClone(decisionsResponse)
    const choice = tampered.answers[1] as { probabilities: { probability: number }[] }
    choice.probabilities[0]!.probability = 0.5
    return new Response(JSON.stringify(tampered), { status: 200 })
  })
  const badProbabilityResult = await badProbabilityClient.evaluate(decisionsRequest)
  expect(badProbabilityResult.success).toBe(false)

  let fetchCalls = 0
  const invalidClient = clientCreate(async () => {
    fetchCalls += 1
    return new Response("{}", { status: 200 })
  })
  const invalidResult = await invalidClient.evaluate({ input: "", questions: [] })
  expect(invalidResult.success).toBe(false)
  expect(fetchCalls).toBe(0)
  expect(v.safeParse(decisionsResponseSchema, { answers: [] }).success).toBe(false)
})
