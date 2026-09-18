import { expect, test } from "bun:test"
import * as v from "valibot"
import type { ResultFor, SystemOneRequest, SystemOneResponse } from "../src/index.js"
import {
  choice,
  choiceSchema,
  noul,
  noulSchema,
  score,
  scoreSchema,
  stateSchema,
  systemOneRequestPayloadSchema,
  systemOneRequestSchema,
  systemOneResponseSchema,
} from "../src/index.js"

test("primitive helpers preserve typed choice and score criteria", () => {
  const questions = {
    department: choice("Which team should handle this?", {
      billing: "Payments and invoices",
      technical: null,
    }),
    severity: score("How severe is this?", ["Minor", "Major", "Blocking"] as const),
    urgent: noul("Does this convey urgency?"),
  }

  const request: SystemOneRequest<typeof questions> = {
    state: { message: "The export is broken" },
    questions,
  }
  const response: SystemOneResponse<typeof questions> = {
    model: "jev-latest",
    answers: {
      department: {
        type: "choice",
        choice: "technical",
        probabilities: { billing: 0.2, technical: 0.8 },
        confidence: 0.7,
      },
      severity: {
        type: "score",
        score: 1.7,
        legend: { 0: "Minor", 1: "Major", 2: "Blocking" },
        probabilities: { 0: 0.1, 1: 0.1, 2: 0.8 },
        confidence: 0.8,
      },
      urgent: { type: "noul", noul: 0.9 },
    },
    usage: { input_tokens: 10, output_tokens: 5 },
  }

  const routeAnswer: ResultFor<typeof questions.department> = response.answers.department
  expect(routeAnswer.choice).toBe("technical")
  expect(request.questions.severity.criteria).toHaveLength(3)
})

test("state and primitive schemas accept structured API entries", () => {
  expect(v.safeParse(stateSchema, "A plain state").success).toBe(true)
  expect(v.safeParse(stateSchema, null).success).toBe(false)
  expect(v.safeParse(stateSchema, 42).success).toBe(false)
  expect(
    v.safeParse(stateSchema, {
      ticket: { subject: "Duplicate charge", messages: ["Please refund it"] },
    }).success,
  ).toBe(true)
  expect(v.safeParse(stateSchema, ["first message", { source: "customer" }]).success).toBe(true)

  expect(
    v.safeParse(
      choiceSchema,
      choice({ question: "Which team?", context: ["billing", "technical"] }, { billing: "Payments", technical: null }),
    ).success,
  ).toBe(true)
  expect(v.safeParse(choiceSchema, { type: "choice", criteria: { billing: null } }).success).toBe(true)
  expect(v.safeParse(scoreSchema, score("How severe?", [{ label: "minor" }, "major"] as const)).success).toBe(true)
  expect(v.safeParse(scoreSchema, { type: "score", criteria: [null, "major"] }).success).toBe(true)
  expect(
    v.safeParse(noulSchema, noul("Is this urgent?", { true: { meaning: "time-sensitive" }, false: "not urgent" }))
      .success,
  ).toBe(true)
  expect(v.safeParse(noulSchema, { type: "noul", criteria: null }).success).toBe(false)
  expect(v.safeParse(noulSchema, { type: "noul", criteria: { true: null } }).success).toBe(true)
  expect(v.safeParse(noulSchema, noul(null, { true: null })).success).toBe(true)
  expect(v.safeParse(noulSchema, noul()).success).toBe(false)
  expect(noul()).toEqual({ type: "noul", instructions: null })
})

test("primitive schemas enforce documented criteria bounds", () => {
  expect(v.safeParse(choiceSchema, { type: "choice", instructions: "Pick", criteria: {} }).success).toBe(false)
  expect(
    v.safeParse(choiceSchema, {
      type: "choice",
      instructions: "Pick",
      criteria: Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`option-${index}`, null])),
    }).success,
  ).toBe(false)
  expect(v.safeParse(scoreSchema, { type: "score", instructions: "Rate", criteria: ["one"] }).success).toBe(false)
  expect(
    v.safeParse(scoreSchema, {
      type: "score",
      instructions: "Rate",
      criteria: Array.from({ length: 11 }, () => "level"),
    }).success,
  ).toBe(false)
  expect(v.safeParse(noulSchema, { type: "noul", instructions: 42 }).success).toBe(false)
})

test("named request and response schemas validate mixed primitive batches", () => {
  const request = {
    state: "A customer asks for a refund",
    model: "jev-latest",
    questions: {
      kind: { type: "choice", instructions: "What is requested?", criteria: { refund: null, other: null } },
      severity: { type: "score", instructions: "How severe?", criteria: ["low", "high"] },
      urgent: { type: "noul", instructions: "Is this urgent?" },
    },
  }
  const response = {
    model: "jev-latest",
    answers: {
      kind: { type: "choice", choice: "refund", probabilities: { refund: 1, other: 0 }, confidence: 1 },
      severity: {
        type: "score",
        score: 0,
        legend: { "0": "low", "1": "high" },
        probabilities: { "0": 1, "1": 0 },
        confidence: 1,
      },
      urgent: { type: "noul", noul: 0.1 },
    },
    usage: { input_tokens: 30, output_tokens: 15 },
  }

  expect(v.safeParse(systemOneRequestSchema, request).success).toBe(true)
  expect(v.safeParse(systemOneRequestPayloadSchema, request).success).toBe(true)
  expect(v.safeParse(systemOneRequestPayloadSchema, { ...request, model: undefined }).success).toBe(false)
  expect(v.safeParse(systemOneResponseSchema, response).success).toBe(true)
  expect(
    v.safeParse(systemOneResponseSchema, {
      ...response,
      answers: { urgent: { type: "noul", noul: 1.1 } },
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(systemOneResponseSchema, {
      ...response,
      answers: {
        kind: { type: "choice", choice: "refund", probabilities: { refund: 0.7, other: 0.1 }, confidence: 0.5 },
      },
    }).success,
  ).toBe(false)
})
