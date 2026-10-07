import { buildApplication, buildCommand, buildRouteMap, type CommandContext, type StricliProcess } from "@stricli/core"
import { createResult, createResultError, type Result } from "@adaptive-ds/result"
import packageJson from "../package.json" with { type: "json" }
import {
  choice,
  decisionsChoice,
  decisionsPredicate,
  decisionsScore,
  noul,
  score,
  type ChoiceCriteria,
  type DecisionsChoiceCriteria,
  type DecisionsInput,
  type DecisionsPredicateCriteria,
  type DecisionsScoreLevels,
  type EntryType,
  type NoulCriteria,
  type ScoreCriteria,
  type JsonValue,
} from "./index.js"
import { cliClef } from "./cli/cliClef.js"
import { cliDecide } from "./cli/cliDecide.js"
import { cliEvaluate } from "./cli/cliEvaluate.js"
import { cliImagesRead } from "./cli/cliImagesRead.js"
import { cliInputRead } from "./cli/cliInputRead.js"
import { cliResultWrite } from "./cli/cliResultWrite.js"
import { cliVersionMetadataRender } from "./cliVersionMetadata.js"

type CliCommandContext = Omit<CommandContext, "process"> & { readonly process: StricliProcess }

type CommonFlags = {
  readonly apiKey?: string
  readonly baseUrl?: string
  readonly images?: string
  readonly model?: string
  readonly timeout?: string
}

type EvaluateFlags = CommonFlags & {
  readonly file?: string
  readonly input?: string
}

type ClefFlags = CommonFlags & {
  readonly accountId?: string
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

type DecideFlags = Omit<CommonFlags, "images"> & {
  readonly file?: string
  readonly input?: string
}

type DecideInputFlags = CommonFlags & {
  readonly images?: string
  readonly input?: string
  readonly instructions: string
  readonly name: string
}

type DecidePredicateFlags = DecideInputFlags & {
  readonly criteria?: string
}

type DecideChoiceFlags = DecideInputFlags & {
  readonly choices: string
}

type DecideScoreFlags = DecideInputFlags & {
  readonly levels: string
}

const commonFlagParameters = {
  apiKey: { kind: "parsed" as const, parse: String, optional: true, brief: "API key (or JEV_API_KEY)" },
  baseUrl: { kind: "parsed" as const, parse: String, optional: true, brief: "System One base URL" },
  images: {
    kind: "parsed" as const,
    parse: String,
    optional: true,
    brief: "Comma-separated image file paths (PNG, JPEG, WebP)",
  },
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
    const imagesResult = await cliImagesRead(flags.images)
    if (!imagesResult.success) {
      cliResultWrite(this.process, imagesResult)
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
      images: imagesResult.data === undefined ? undefined : [...imagesResult.data],
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

const clefCommand = buildCommand({
  async func(this: CliCommandContext, flags: ClefFlags) {
    const timeoutResult = cliTimeoutRead(flags.timeout)
    if (!timeoutResult.success) {
      cliResultWrite(this.process, timeoutResult)
      return
    }
    const imagesResult = await cliImagesRead(flags.images)
    if (!imagesResult.success) {
      cliResultWrite(this.process, imagesResult)
      return
    }
    const inputResult = await cliInputRead(flags.file ?? flags.input)
    if (!inputResult.success) {
      cliResultWrite(this.process, inputResult)
      return
    }

    const result = await cliClef({
      requestInput: inputResult.data,
      apiToken: flags.apiKey ?? this.process.env?.CLOUDFLARE_API_TOKEN,
      accountId: flags.accountId ?? this.process.env?.CLOUDFLARE_ACCOUNT_ID,
      baseUrl: flags.baseUrl,
      model: flags.model,
      timeout: timeoutResult.data,
      images: imagesResult.data === undefined ? undefined : [...imagesResult.data],
    })
    cliResultWrite(this.process, result)
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      accountId: {
        kind: "parsed",
        parse: String,
        optional: true,
        brief: "Cloudflare account ID (or CLOUDFLARE_ACCOUNT_ID)",
      },
      file: { kind: "parsed", parse: String, optional: true, brief: "Read JSON from a file (use - for stdin)" },
      input: { kind: "parsed", parse: String, optional: true, brief: "Read JSON from a file (use - for stdin)" },
    },
    aliases: { k: "apiKey", b: "baseUrl", i: "input", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate one or more JSON requests with Cloudflare Clef" },
})

const decideCommand = buildCommand({
  async func(this: CliCommandContext, flags: DecideFlags) {
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

    const result = await cliDecide({
      requestInput: inputResult.data,
      apiKey: flags.apiKey ?? this.process.env?.OPENAI_API_KEY,
      baseUrl: flags.baseUrl,
      model: flags.model,
      timeout: timeoutResult.data,
    })
    cliResultWrite(this.process, result)
  },
  parameters: {
    flags: {
      apiKey: commonFlagParameters.apiKey,
      baseUrl: commonFlagParameters.baseUrl,
      model: commonFlagParameters.model,
      timeout: commonFlagParameters.timeout,
      file: { kind: "parsed", parse: String, optional: true, brief: "Read JSON from a file (use - for stdin)" },
      input: { kind: "parsed", parse: String, optional: true, brief: "Read JSON from a file (use - for stdin)" },
    },
    aliases: { k: "apiKey", b: "baseUrl", i: "input", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate one or more OpenAI Decisions JSON requests from a file or stdin" },
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

const decidePredicateCommand = buildCommand({
  async func(this: CliCommandContext, flags: DecidePredicateFlags) {
    await cliDecidePrimitiveRun(this, flags, "predicate")
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      criteria: { kind: "parsed", parse: String, optional: true, brief: "True/false criteria as JSON" },
      input: { kind: "parsed", parse: String, optional: true, brief: "Input as JSON (text or messages)" },
      instructions: { kind: "parsed", parse: String, brief: "Instructions as JSON" },
      name: { kind: "parsed", parse: String, default: "question", brief: "Question name" },
    },
    aliases: { k: "apiKey", b: "baseUrl", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate an OpenAI Decisions predicate question" },
})

const decideChoiceCommand = buildCommand({
  async func(this: CliCommandContext, flags: DecideChoiceFlags) {
    await cliDecidePrimitiveRun(this, flags, "choice")
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      choices: { kind: "parsed", parse: String, brief: "Choice criteria as JSON" },
      input: { kind: "parsed", parse: String, optional: true, brief: "Input as JSON (text or messages)" },
      instructions: { kind: "parsed", parse: String, brief: "Instructions as JSON" },
      name: { kind: "parsed", parse: String, default: "question", brief: "Question name" },
    },
    aliases: { k: "apiKey", b: "baseUrl", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate an OpenAI Decisions choice question" },
})

const decideScoreCommand = buildCommand({
  async func(this: CliCommandContext, flags: DecideScoreFlags) {
    await cliDecidePrimitiveRun(this, flags, "score")
  },
  parameters: {
    flags: {
      ...commonFlagParameters,
      input: { kind: "parsed", parse: String, optional: true, brief: "Input as JSON (text or messages)" },
      instructions: { kind: "parsed", parse: String, brief: "Instructions as JSON" },
      levels: { kind: "parsed", parse: String, brief: "Score levels as JSON" },
      name: { kind: "parsed", parse: String, default: "question", brief: "Question name" },
    },
    aliases: { k: "apiKey", b: "baseUrl", m: "model", t: "timeout" },
  },
  docs: { brief: "Evaluate an OpenAI Decisions score question" },
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
    clef: clefCommand,
    decide: decideCommand,
    "decide-choice": decideChoiceCommand,
    "decide-predicate": decidePredicateCommand,
    "decide-score": decideScoreCommand,
    evaluate: evaluateCommand,
    noul: noulCommand,
    score: scoreCommand,
    version: versionCommand,
  },
  docs: { brief: "TypeSafe System One, Cloudflare Clef, and OpenAI Decisions client and CLI" },
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
  const imagesResult = await cliImagesRead(flags.images)
  if (!imagesResult.success) {
    cliResultWrite(context.process, imagesResult)
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
      ...(imagesResult.data === undefined ? {} : { images: [...imagesResult.data] }),
      questions: { [flags.name]: question },
    },
    apiKey: flags.apiKey ?? context.process.env?.JEV_API_KEY,
    baseUrl: flags.baseUrl,
    model: undefined,
    timeout: timeoutResult.data,
    images: undefined,
  })
  cliResultWrite(context.process, result)
}

async function cliDecidePrimitiveRun(
  context: CliCommandContext,
  flags: CommonFlags & {
    readonly choices?: string
    readonly criteria?: string
    readonly input?: string
    readonly instructions: string
    readonly levels?: string
    readonly name: string
  },
  type: "predicate" | "choice" | "score",
): Promise<void> {
  const inputResult = flags.input === undefined ? createResult(undefined) : cliJsonParse(flags.input)
  if (!inputResult.success) {
    cliResultWrite(context.process, inputResult)
    return
  }
  const instructionsResult = cliJsonParse(flags.instructions)
  if (!instructionsResult.success) {
    cliResultWrite(context.process, instructionsResult)
    return
  }
  const choicesResult = flags.choices === undefined ? createResult(undefined) : cliJsonParse(flags.choices)
  if (!choicesResult.success) {
    cliResultWrite(context.process, choicesResult)
    return
  }
  const levelsResult = flags.levels === undefined ? createResult(undefined) : cliJsonParse(flags.levels)
  if (!levelsResult.success) {
    cliResultWrite(context.process, levelsResult)
    return
  }
  const criteriaResult = flags.criteria === undefined ? createResult(undefined) : cliJsonParse(flags.criteria)
  if (!criteriaResult.success) {
    cliResultWrite(context.process, criteriaResult)
    return
  }
  const imagesResult = await cliImagesRead(flags.images)
  if (!imagesResult.success) {
    cliResultWrite(context.process, imagesResult)
    return
  }
  const timeoutResult = cliTimeoutRead(flags.timeout)
  if (!timeoutResult.success) {
    cliResultWrite(context.process, timeoutResult)
    return
  }

  if (typeof instructionsResult.data !== "string") {
    cliResultWrite(context.process, createResultError("cliDecidePrimitive", "Instructions must be a JSON string"))
    return
  }
  const inputWithImages = cliDecideInputApply(inputResult.data, imagesResult.data)
  if (inputWithImages === undefined) {
    cliResultWrite(
      context.process,
      createResultError("cliDecidePrimitive", "An input or at least one image is required"),
    )
    return
  }

  const question =
    type === "predicate"
      ? decisionsPredicate(
          flags.name,
          instructionsResult.data,
          criteriaResult.data as DecisionsPredicateCriteria | undefined,
        )
      : type === "choice"
        ? decisionsChoice(flags.name, instructionsResult.data, choicesResult.data as DecisionsChoiceCriteria)
        : decisionsScore(flags.name, instructionsResult.data, levelsResult.data as DecisionsScoreLevels)
  const result = await cliDecide({
    requestInput: { input: inputWithImages, questions: [question] },
    apiKey: flags.apiKey ?? context.process.env?.OPENAI_API_KEY,
    baseUrl: flags.baseUrl,
    model: flags.model,
    timeout: timeoutResult.data,
  })
  cliResultWrite(context.process, result)
}

function cliDecideInputApply(
  input: JsonValue | undefined,
  images: readonly string[] | undefined,
): DecisionsInput | undefined {
  const imageParts = (images ?? []).map((image_url) => ({ type: "input_image" as const, image_url }))
  if (imageParts.length === 0) return input as DecisionsInput | undefined
  if (typeof input === "string")
    return [{ role: "user" as const, content: [{ type: "input_text" as const, text: input }, ...imageParts] }]
  if (Array.isArray(input)) {
    const messages = input as DecisionsInput as { role?: string; content: unknown[] }[]
    if (messages.length === 0) return [{ role: "user" as const, content: [...imageParts] }]
    const last = messages[messages.length - 1]
    if (last === undefined || !Array.isArray(last.content)) return undefined
    return [...messages.slice(0, -1), { ...last, content: [...last.content, ...imageParts] }] as DecisionsInput
  }
  if (input === undefined) return [{ role: "user" as const, content: [...imageParts] }]
  return undefined
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
