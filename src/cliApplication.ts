import { buildApplication, buildCommand, buildRouteMap, type CommandContext, type StricliProcess } from "@stricli/core"
import { createResult, createResultError, type Result } from "@adaptive-ds/result"
import packageJson from "../package.json" with { type: "json" }
import {
  choice,
  noul,
  score,
  type ChoiceCriteria,
  type EntryType,
  type NoulCriteria,
  type ScoreCriteria,
  type JsonValue,
} from "./index.js"
import { cliEvaluate } from "./cli/cliEvaluate.js"
import { cliInputRead } from "./cli/cliInputRead.js"
import { cliResultWrite } from "./cli/cliResultWrite.js"
import { cliVersionMetadataRender } from "./cliVersionMetadata.js"

type CliCommandContext = Omit<CommandContext, "process"> & { readonly process: StricliProcess }

type CommonFlags = {
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly model?: string
  readonly timeout?: string
}

type EvaluateFlags = CommonFlags & {
  readonly file?: string
  readonly input?: string
}

type ChoiceFlags = CommonFlags & {
  readonly criteria: string
  readonly instructions: string
  readonly name: string
  readonly state: string
}

type ScoreFlags = ChoiceFlags

type NoulFlags = CommonFlags & {
  readonly criteria?: string
  readonly instructions: string
  readonly name: string
  readonly state: string
}

const commonFlagParameters = {
  apiKey: { kind: "parsed" as const, parse: String, optional: true, brief: "API key (or JEV_API_KEY)" },
  baseUrl: { kind: "parsed" as const, parse: String, optional: true, brief: "System One base URL" },
  model: { kind: "parsed" as const, parse: String, optional: true, brief: "Model name" },
  timeout: {
    kind: "parsed" as const,
    parse: String,
    optional: true,
    brief: "Request timeout in milliseconds",
  },
} as const

const evaluateCommand = buildCommand({
  async func(this: CliCommandContext, flags: EvaluateFlags) {
    const timeoutResult = cliTimeoutRead(flags.timeout)
    if (!timeoutResult.success) {
      cliResultWrite(this.process, timeoutResult)
      return
    }
    const inputResult = await cliInputRead(flags.file ?? flags.input)
    if (!inputResult.success) {
      cliResultWrite(this.process, inputResult)
      return
    }

    const result = await cliEvaluate({
      requestInput: inputResult.data,
      apiKey: flags.apiKey ?? this.process.env?.JEV_API_KEY,
      baseUrl: flags.baseUrl,
      model: flags.model,
      timeout: timeoutResult.data,
    })
    cliResultWrite(this.process, result)
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      file: { kind: "parsed", parse: String, optional: true, brief: "Read JSON from a file (use - for stdin)" },
      input: { kind: "parsed", parse: String, optional: true, brief: "Read JSON from a file (use - for stdin)" },
    },
    aliases: { k: "apiKey", b: "baseUrl", i: "input", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate one or more JSON requests from a file or stdin" },
})

const choiceCommand = buildCommand({
  async func(this: CliCommandContext, flags: ChoiceFlags) {
    await cliPrimitiveRun(this, flags, "choice")
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      criteria: { kind: "parsed", parse: String, brief: "Choice criteria as JSON" },
      instructions: { kind: "parsed", parse: String, brief: "Instructions as JSON" },
      name: { kind: "parsed", parse: String, default: "question", brief: "Question name" },
      state: { kind: "parsed", parse: String, brief: "State as JSON" },
    },
    aliases: { k: "apiKey", b: "baseUrl", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate a choice question" },
})

const scoreCommand = buildCommand({
  async func(this: CliCommandContext, flags: ScoreFlags) {
    await cliPrimitiveRun(this, flags, "score")
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      criteria: { kind: "parsed", parse: String, brief: "Score criteria as JSON" },
      instructions: { kind: "parsed", parse: String, brief: "Instructions as JSON" },
      name: { kind: "parsed", parse: String, default: "question", brief: "Question name" },
      state: { kind: "parsed", parse: String, brief: "State as JSON" },
    },
    aliases: { k: "apiKey", b: "baseUrl", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate a score question" },
})

const noulCommand = buildCommand({
  async func(this: CliCommandContext, flags: NoulFlags) {
    await cliPrimitiveRun(this, flags, "noul")
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      criteria: { kind: "parsed", parse: String, optional: true, brief: "True/false criteria as JSON" },
      instructions: { kind: "parsed", parse: String, brief: "Instructions as JSON" },
      name: { kind: "parsed", parse: String, default: "question", brief: "Question name" },
      state: { kind: "parsed", parse: String, brief: "State as JSON" },
    },
    aliases: { k: "apiKey", b: "baseUrl", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate a noul question" },
})

const versionCommand = buildCommand({
  func(this: CliCommandContext, flags: { readonly verbose?: boolean }) {
    this.process.stdout.write(cliVersionMetadataRender(flags.verbose === true))
  },
  parameters: { flags: { verbose: { kind: "boolean", optional: true, brief: "Include runtime details" } } },
  docs: { brief: "Print version information" },
})

const routes = buildRouteMap({
  routes: {
    choice: choiceCommand,
    evaluate: evaluateCommand,
    noul: noulCommand,
    score: scoreCommand,
    version: versionCommand,
  },
  docs: { brief: "TypeSafe System One client and CLI" },
})

export const jevCliApplication = buildApplication(routes, {
  name: "jev",
  versionInfo: { currentVersion: packageJson.version },
  scanner: { caseStyle: "allow-kebab-for-camel" },
  documentation: { disableAnsiColor: true },
})

async function cliPrimitiveRun(
  context: CliCommandContext,
  flags: CommonFlags & {
    readonly criteria?: string
    readonly instructions: string
    readonly name: string
    readonly state: string
  },
  type: "choice" | "score" | "noul",
): Promise<void> {
  const stateResult = cliJsonParse(flags.state)
  if (!stateResult.success) {
    cliResultWrite(context.process, stateResult)
    return
  }
  const instructionsResult = cliJsonParse(flags.instructions)
  if (!instructionsResult.success) {
    cliResultWrite(context.process, instructionsResult)
    return
  }
  const criteriaResult = flags.criteria === undefined ? createResult(undefined) : cliJsonParse(flags.criteria)
  if (!criteriaResult.success) {
    cliResultWrite(context.process, criteriaResult)
    return
  }
  const timeoutResult = cliTimeoutRead(flags.timeout)
  if (!timeoutResult.success) {
    cliResultWrite(context.process, timeoutResult)
    return
  }

  const question =
    type === "choice"
      ? choice(instructionsResult.data as EntryType, criteriaResult.data as ChoiceCriteria)
      : type === "score"
        ? score(instructionsResult.data as EntryType, criteriaResult.data as unknown as ScoreCriteria)
        : noul(instructionsResult.data as EntryType, criteriaResult.data as NoulCriteria | undefined)
  const result = await cliEvaluate({
    requestInput: {
      state: stateResult.data,
      ...(flags.model === undefined ? {} : { model: flags.model }),
      questions: { [flags.name]: question },
    },
    apiKey: flags.apiKey ?? context.process.env?.JEV_API_KEY,
    baseUrl: flags.baseUrl,
    model: undefined,
    timeout: timeoutResult.data,
  })
  cliResultWrite(context.process, result)
}

function cliJsonParse(input: string): Result<JsonValue> {
  try {
    return createResult(JSON.parse(input) as JsonValue)
  } catch {
    return createResultError("cliJsonParse", "JSON input is invalid")
  }
}

function cliTimeoutRead(input: string | undefined): Result<number | undefined> {
  if (input === undefined) return createResult(undefined)
  const timeout = Number(input)
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 300_000)
    return createResultError("cliTimeoutRead", "Timeout must be 1-300000 milliseconds")
  return createResult(timeout)
}
