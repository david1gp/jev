import { createResult, createResultError, type Result } from "@adaptive-ds/result"
import { decisionsClientCreate, type DecisionsRequest, type DecisionsResponse } from "../index.js"

type CliDecideInput = {
  readonly requestInput: unknown
  readonly apiKey: string | undefined
  readonly baseUrl: string | undefined
  readonly model: string | undefined
  readonly timeout: number | undefined
}

type CliDecideOutput = DecisionsResponse | readonly DecisionsResponse[]

export async function cliDecide(input: CliDecideInput): Promise<Result<CliDecideOutput>> {
  const op = "cliDecide"
  if (input.apiKey === undefined || input.apiKey.length === 0) return createResultError(op, "An API key is required")

  const requests = Array.isArray(input.requestInput) ? input.requestInput : [input.requestInput]
  if (requests.length === 0) return createResultError(op, "At least one decisions request is required")

  const clientResult = decisionsClientCreate({
    apiKey: input.apiKey,
    ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
    ...(input.timeout === undefined ? {} : { timeoutMs: input.timeout }),
  })
  if (!clientResult.success) return createResultError(op, clientResult.errorMessage)

  const responses: DecisionsResponse[] = []
  for (const requestInput of requests) {
    const request = cliDecideModelApply(requestInput, input.model)
    const result = await clientResult.data.evaluate(request as DecisionsRequest)
    if (!result.success) {
      return {
        ...createResultError(op, result.errorMessage, result.errorData),
        ...(result.code === undefined ? {} : { code: result.code }),
        ...(result.statusCode === undefined ? {} : { statusCode: result.statusCode }),
      }
    }
    responses.push(result.data)
  }

  if (Array.isArray(input.requestInput)) return createResult(responses)
  const response = responses[0]
  if (response === undefined) return createResultError(op, "The evaluation returned no response")
  return createResult(response)
}

function cliDecideModelApply(requestInput: unknown, model: string | undefined): unknown {
  if (model === undefined || requestInput === null || typeof requestInput !== "object") return requestInput
  if (Array.isArray(requestInput)) return requestInput.map((entry) => cliDecideModelApply(entry, model))
  return { ...requestInput, model }
}
