import { readFile } from "node:fs/promises"
import { stdin } from "node:process"
import { createResult, createResultError, type Result } from "@adaptive-ds/result"

export async function cliInputRead(path: string | undefined): Promise<Result<unknown>> {
  const op = "cliInputRead"
  let input: string
  try {
    input = path === undefined || path === "-" ? await cliStdinRead() : await readFile(path, "utf8")
  } catch {
    return createResultError(op, "The CLI input could not be read")
  }

  if (input.trim().length === 0) return createResultError(op, "The CLI input was empty")

  try {
    return createResult(JSON.parse(input) as unknown)
  } catch {
    return createResultError(op, "The CLI input was not valid JSON")
  }
}

async function cliStdinRead(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}
