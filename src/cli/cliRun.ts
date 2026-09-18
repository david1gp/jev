import { run, type Application, type CommandContext, type StricliProcess } from "@stricli/core"
import { cliResultWrite } from "./cliResultWrite.js"

type CliRunOutput = {
  stdout: string
  stderr: string
}

export async function cliRun<Context extends CommandContext>(
  application: Application<Context>,
  inputs: readonly string[],
  process: NodeJS.Process,
): Promise<void> {
  const output: CliRunOutput = { stdout: "", stderr: "" }
  let exitCode: number | string | null | undefined = process.exitCode
  const runProcess = cliProcessCreate(
    process,
    output,
    () => exitCode,
    (value) => {
      exitCode = value
      process.exitCode = value
    },
  )

  try {
    const normalizedInputs = inputs[0] === "-V" ? ["--version", ...inputs.slice(1)] : inputs
    await run(application, normalizedInputs, { process: runProcess } as Context & { readonly process: StricliProcess })
  } catch {
    exitCode = 1
    process.exitCode = 1
  }

  if (output.stderr.trim().length > 0 && exitCode !== 0 && !cliOutputIsJson(output.stderr)) {
    output.stderr = JSON.stringify({ success: false, op: "cli", errorMessage: "The CLI input was invalid" }) + "\n"
  }
  if (output.stdout.length > 0) process.stdout.write(output.stdout)
  if (output.stderr.length > 0) process.stderr.write(output.stderr)
}

function cliProcessCreate(
  process: NodeJS.Process,
  output: CliRunOutput,
  getExitCode: () => number | string | null | undefined,
  setExitCode: (value: number | string | null | undefined) => void,
): StricliProcess {
  return {
    env: process.env,
    get exitCode() {
      return getExitCode()
    },
    set exitCode(value) {
      setExitCode(value)
    },
    stdout: { write: (value) => (output.stdout += value), getColorDepth: () => 1 },
    stderr: { write: (value) => (output.stderr += value), getColorDepth: () => 1 },
  }
}

function cliOutputIsJson(output: string): boolean {
  try {
    JSON.parse(output)
    return true
  } catch {
    return false
  }
}
