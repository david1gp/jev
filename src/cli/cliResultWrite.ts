import type { Result } from "@adaptive-ds/result"
import type { StricliProcess } from "@stricli/core"

export function cliResultWrite(process: StricliProcess, result: Result<unknown>): void {
  if (result.success) {
    try {
      process.stdout.write(`${JSON.stringify(result.data)}\n`)
    } catch {
      process.exitCode = 1
      process.stderr.write(
        `${JSON.stringify({ success: false, op: "cliResultWrite", errorMessage: "The result could not be serialized" })}\n`,
      )
    }
    return
  }

  process.exitCode = 1
  process.stderr.write(
    `${JSON.stringify({
      success: false,
      op: result.op,
      errorMessage: result.errorMessage,
      ...(result.code === undefined ? {} : { code: result.code }),
      ...(result.errorData === undefined ? {} : { errorData: result.errorData }),
      ...(result.statusCode === undefined ? {} : { statusCode: result.statusCode }),
    })}\n`,
  )
}
