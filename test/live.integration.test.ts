import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  choice,
  clefClientCreate,
  decisionsChoice,
  decisionsClientCreate,
  decisionsPredicate,
  decisionsScore,
  noul,
  score,
  systemOneClientCreate,
  type DecisionsResponse,
  type SystemOneFetch,
  type SystemOneResponse,
} from "../src/index.js"

const apiKey = process.env.JEV_API_KEY
const liveEnabled = process.env.JEV_LIVE === "1" && apiKey !== undefined && apiKey.trim().length > 0

test.skipIf(!liveEnabled)("evaluates all primitives through the library and plain Node CLI paths", async () => {
  const startedAt = new Date().toISOString()
  let libraryHttpCalls = 0
  const liveFetch: SystemOneFetch = async (input, init) => {
    libraryHttpCalls += 1
    return fetch(input, init)
  }
  const clientResult = systemOneClientCreate({
    apiKey: apiKey as string,
    fetch: liveFetch,
    maxRetries: 0,
    timeoutMs: 30_000,
  })
  expect(clientResult.success).toBe(true)
  if (!clientResult.success) return

  const libraryResult = await clientResult.data.evaluate({
    state: "A customer says their payout failed and asks for help.",
    questions: {
      department: choice("Which team should handle this?", { billing: "Payments", other: null }),
      severity: score("How severe is this?", ["Minor", "Blocking"] as const),
      urgent: noul("Does this require urgent handling?"),
    },
  })
  liveResponseAssert(libraryResult.success ? libraryResult.data : undefined, {
    department: "choice",
    severity: "score",
    urgent: "noul",
  })
  expect(libraryHttpCalls).toBe(1)

  const cliResults = [
    await cliLiveRun([
      "choice",
      "--state",
      '"A customer asks about a payment."',
      "--instructions",
      '"Which team should handle this?"',
      "--criteria",
      '{"billing":"Payments","other":null}',
      "--name",
      "department",
    ]),
    await cliLiveRun([
      "score",
      "--state",
      '"A customer reports a blocked payout."',
      "--instructions",
      '"How severe is this?"',
      "--criteria",
      '["Minor","Blocking"]',
    ]),
    await cliLiveRun([
      "noul",
      "--state",
      '"A customer reports a failed payout."',
      "--instructions",
      '"Does this require urgent handling?"',
    ]),
  ]
  liveResponseAssert(cliResults[0], { department: "choice" })
  liveResponseAssert(cliResults[1], { question: "score" })
  liveResponseAssert(cliResults[2], { question: "noul" })

  const directory = await mkdtemp(join(tmpdir(), "jev-live-"))
  try {
    const request = JSON.stringify({
      state: "A customer asks whether a payout failure needs urgent handling.",
      questions: { urgent: { type: "noul", instructions: "Does this need urgent handling?" } },
    })
    const inputFile = join(directory, "request.json")
    await writeFile(inputFile, request)
    const stdinResult = await cliLiveRun(["evaluate", "--input", "-"], request)
    const fileResult = await cliLiveRun(["evaluate", "--file", inputFile])
    liveResponseAssert(stdinResult, { urgent: "noul" })
    liveResponseAssert(fileResult, { urgent: "noul" })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }

  const finishedAt = new Date().toISOString()
  console.log(
    `live integration passed: 6 evaluation calls (library batch 1; CLI choice, score, noul, stdin, file) ${startedAt} -> ${finishedAt}`,
  )
})

const clefToken = process.env.CLOUDFLARE_API_TOKEN
const clefAccount = process.env.CLOUDFLARE_ACCOUNT_ID
const clefEnabled = process.env.CLEF_LIVE === "1" && clefToken !== undefined && clefAccount !== undefined

test.skipIf(!clefEnabled)("evaluates text and images through Cloudflare Clef", async () => {
  const clientResult = clefClientCreate({ apiToken: clefToken as string, accountId: clefAccount as string })
  expect(clientResult.success).toBe(true)
  if (!clientResult.success) return

  const textResult = await clientResult.data.evaluate({
    state: "Checkout has been failing for every customer for the last hour.",
    questions: {
      urgent: noul("Is this support request urgent?"),
      team: choice("Which team should handle this request?", {
        billing: "Payments, invoices, and refunds",
        technical: "Outages, errors, and configuration",
      }),
      severity: score("How severe is the customer impact?", ["No impact", "Minor", "Major", "Critical"]),
    },
  })
  liveResponseAssert(textResult.success ? textResult.data : undefined, {
    urgent: "noul",
    team: "choice",
    severity: "score",
  })

  const image = await liveImageDataUrl("images/product-damaged.png")
  const imageResult = await clientResult.data.evaluate({
    state: "Inspect the product in this photo.",
    questions: { visible_damage: noul("Does the product have visible damage?") },
    images: [image],
  })
  liveResponseAssert(imageResult.success ? imageResult.data : undefined, { visible_damage: "noul" })
  if (imageResult.success) expect(imageResult.data.answers.visible_damage.noul).toBeGreaterThan(0.5)

  const cliResult = await cliLiveRun(
    ["clef", "--input", "-", "--images", "images/product-intact.png"],
    JSON.stringify({
      state: "Inspect the product in this photo.",
      questions: { visible_damage: { type: "noul", instructions: "Does the product have visible damage?" } },
    }),
  )
  liveResponseAssert(cliResult, { visible_damage: "noul" })
  console.log("live clef integration passed: text batch, image evaluation, CLI image evaluation")
})

const decisionsKey = process.env.OPENAI_API_KEY
const decisionsBaseUrl = process.env.DECISIONS_BASE_URL
const decisionsEnabled =
  process.env.DECISIONS_LIVE === "1" && (decisionsKey !== undefined || decisionsBaseUrl !== undefined)

test.skipIf(!decisionsEnabled)("evaluates text and images through OpenAI Decisions", async () => {
  const clientResult = decisionsClientCreate({
    apiKey: (decisionsKey ?? "decisions-live-proxy") as string,
    ...(decisionsBaseUrl === undefined ? {} : { baseUrl: decisionsBaseUrl }),
  })
  expect(clientResult.success).toBe(true)
  if (!clientResult.success) return

  const textResult = await clientResult.data.evaluate({
    input: "I was charged twice for my order.",
    questions: [
      decisionsPredicate("duplicate_charge", "Was the customer charged more than once?"),
      decisionsChoice("department", "Which department should handle this complaint?", {
        billing: "Payments, invoices, and refunds.",
        technical: "Problems using the product.",
      }),
      decisionsScore("severity", "How severe is this issue?", [
        { label: "Cosmetic", description: "Appearance only." },
        { label: "Fully blocked", description: "No workaround." },
      ]),
    ],
  })
  expect(textResult.success).toBe(true)
  if (textResult.success) {
    expect(textResult.data.answers.map((answer) => answer.name).sort()).toEqual(
      ["department", "duplicate_charge", "severity"].sort(),
    )
  }

  const image = await liveImageDataUrl("images/product-damaged.png")
  const imageResult = await clientResult.data.evaluate({
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Inspect the product in this photo." },
          { type: "input_image", image_url: image },
        ],
      },
    ],
    questions: [decisionsPredicate("visible_damage", "Does the product have visible damage?")],
  })
  expect(imageResult.success).toBe(true)
  console.log("live decisions integration passed: text batch and image evaluation")
})

async function liveImageDataUrl(path: string): Promise<string> {
  const bytes = await Bun.file(join(import.meta.dir.replace(/\/test$/u, ""), path)).arrayBuffer()
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`
}

async function cliLiveRun(args: readonly string[], input?: string): Promise<SystemOneResponse> {
  const child = Bun.spawn(["node", "dist/cli.js", ...args], {
    cwd: import.meta.dir.replace(/\/test$/u, ""),
    env: { ...process.env, JEV_API_KEY: apiKey as string },
    stdin: input === undefined ? "ignore" : new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()])
  expect(await child.exited).toBe(0)
  expect(stderr).toBe("")
  return JSON.parse(stdout) as SystemOneResponse
}

function liveResponseAssert(
  response: SystemOneResponse | undefined,
  answers: Record<string, "choice" | "score" | "noul">,
): void {
  expect(response).toBeDefined()
  if (response === undefined) return
  expect(response.model).toBeString()
  expect(Object.keys(response.answers).sort()).toEqual(Object.keys(answers).sort())
  for (const [name, type] of Object.entries(answers)) {
    expect(response.answers[name as keyof typeof response.answers]?.type).toBe(type)
  }
  expect(response.usage.input_tokens).toBeGreaterThanOrEqual(0)
  expect(response.usage.output_tokens).toBeGreaterThanOrEqual(0)
}
