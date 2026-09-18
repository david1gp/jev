import { createResult, createResultError, type Result } from "@adaptive-ds/result"
import { systemOneClientCreate, type SystemOneRequest, type SystemOneResponse } from "../index.js"

type CliEvaluateInput = {
  readonly requestInput: unknown
  readonly apiKey: string | undefined
  readonly baseUrl: string | undefined
  readonly model: string | undefined
  readonly timeout: number | undefined
}

type CliEvaluationOutput = SystemOneResponse | readonly SystemOneResponse[]

export async function cliEvaluate(input: CliEvaluateInput): Promise<Result<CliEvaluationOutput>> {
  const op = "cliEvaluate"
  if (input.apiKey === undefined || input.apiKey.length === 0) return createResultError(op, "An API key is required")

  const requests = Array.isArray(input.requestInput) ? input.requestInput : [input.requestInput]
  if (requests.length === 0) return createResultError(op, "At least one evaluation request is required")

  const clientResult = systemOneClientCreate({
    apiKey: input.apiKey,
    ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
    ...(input.timeout === undefined ? {} : { timeoutMs: input.timeout }),
  })
  if (!clientResult.success) return createResultError(op, clientResult.errorMessage)

  const responses: SystemOneResponse[] = []
  for (const requestInput of requests) {
    const request = cliModelApply(requestInput, input.model)
    const result = await clientResult.data.evaluate(request as SystemOneRequest)
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

function cliModelApply(requestInput: unknown, model: string | undefined): unknown {
  if (model === undefined || requestInput === null || typeof requestInput !== "object" || Array.isArray(requestInput))
    return requestInput
  return { ...requestInput, model }
}
