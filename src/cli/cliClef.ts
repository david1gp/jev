import { createResult, createResultError, type Result } from "@adaptive-ds/result"
import { clefClientCreate, type SystemOneRequest, type SystemOneResponse } from "../index.js"

type CliClefInput = {
  readonly requestInput: unknown
  readonly apiToken: string | undefined
  readonly accountId: string | undefined
  readonly baseUrl: string | undefined
  readonly model: string | undefined
  readonly timeout: number | undefined
  readonly images: readonly string[] | undefined
}

type CliClefOutput = SystemOneResponse | readonly SystemOneResponse[]

export async function cliClef(input: CliClefInput): Promise<Result<CliClefOutput>> {
  const op = "cliClef"
  if (input.apiToken === undefined || input.apiToken.length === 0)
    return createResultError(op, "A Cloudflare API token is required")

  const requests = Array.isArray(input.requestInput) ? input.requestInput : [input.requestInput]
  if (requests.length === 0) return createResultError(op, "At least one evaluation request is required")

  const clientResult = clefClientCreate({
    apiToken: input.apiToken,
    ...(input.accountId === undefined ? {} : { accountId: input.accountId }),
    ...(input.baseUrl === undefined ? {} : { baseUrl: input.baseUrl }),
    ...(input.model === undefined ? {} : { model: input.model }),
    ...(input.timeout === undefined ? {} : { timeoutMs: input.timeout }),
  })
  if (!clientResult.success) return createResultError(op, clientResult.errorMessage)

  const responses: SystemOneResponse[] = []
  for (const requestInput of requests) {
    const request = cliClefImagesApply(cliClefModelApply(requestInput, input.model), input.images)
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

function cliClefModelApply(requestInput: unknown, model: string | undefined): unknown {
  if (model === undefined || requestInput === null || typeof requestInput !== "object") return requestInput
  if (Array.isArray(requestInput)) return requestInput.map((entry) => cliClefModelApply(entry, model))
  return { ...requestInput, model }
}

function cliClefImagesApply(requestInput: unknown, images: readonly string[] | undefined): unknown {
  if (images === undefined || requestInput === null || typeof requestInput !== "object" || Array.isArray(requestInput))
    return requestInput
  return { ...requestInput, images: [...images] }
}
