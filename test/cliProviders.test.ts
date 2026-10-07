import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const projectRoot = resolve(import.meta.dir, "..")

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

type CliRun = {
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
}

test("CLI help lists the decisions and clef commands", async () => {
  const help = await cliRun(["--help"])
  expect(help.exitCode).toBe(0)
  expect(help.stdout).toContain("jev decide")
  expect(help.stdout).toContain("decide-predicate")
  expect(help.stdout).toContain("decide-choice")
  expect(help.stdout).toContain("decide-score")
  expect(help.stdout).toContain("jev clef")
})

test("CLI decide evaluates stdin JSON with OPENAI_API_KEY and emits answers", async () => {
  const server = decisionsServer()
  try {
    const result = await cliRun(
      ["decide", "--input", "-", "--base-url", server.url, "--model", "mock-luna"],
      JSON.stringify({
        input: "I was charged twice.",
        questions: [
          {
            type: "choice",
            name: "department",
            instructions: "Which team?",
            choices: [
              { value: "billing", description: "Payments" },
              { value: "technical", description: "Bugs" },
            ],
          },
        ],
      }),
      { OPENAI_API_KEY: "decide-secret" },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    const output = JSON.parse(result.stdout)
    expect(output.answers[0]).toMatchObject({ type: "choice", name: "department", choice: "billing" })
    expect(server.authorization).toBe("Bearer decide-secret")
    expect(server.requestBody?.model).toBe("mock-luna")
  } finally {
    server.stop()
  }
})

test("CLI decide primitives build questions and image inputs", async () => {
  const server = decisionsServer()
  const directory = await mkdtemp(join(tmpdir(), "jev-decide-"))
  const imagePath = join(directory, "product.png")
  try {
    await writeFile(imagePath, tinyPng)
    const predicate = await cliRun(
      [
        "decide-predicate",
        "--input",
        '"Inspect the product in this photo."',
        "--instructions",
        '"Does the product have visible damage?"',
        "--name",
        "visible_damage",
        "--images",
        imagePath,
        "--api-key",
        "decide-secret",
        "--base-url",
        server.url,
      ],
      undefined,
    )

    expect(predicate.exitCode).toBe(0)
    expect(JSON.parse(predicate.stdout).answers[0]).toMatchObject({ type: "predicate" })
    const content = (
      server.requestBody?.input as { role: string; content: { type: string; image_url?: string }[] }[]
    )[0]?.content
    expect(content?.[0]).toMatchObject({ type: "input_text" })
    expect(content?.[1]?.image_url?.startsWith("data:image/png;base64,")).toBe(true)

    const choice = await cliRun([
      "decide-choice",
      "--input",
      '"I was charged twice."',
      "--instructions",
      '"Which team?"',
      "--choices",
      '{"billing":"Payments","technical":"Bugs"}',
      "--api-key",
      "decide-secret",
      "--base-url",
      server.url,
    ])
    expect(choice.exitCode).toBe(0)
    expect(JSON.parse(choice.stdout).answers[0].type).toBe("choice")

    const missing = await cliRun([
      "decide-score",
      "--instructions",
      '"How severe?"',
      "--levels",
      '["low","high"]',
      "--api-key",
      "decide-secret",
      "--base-url",
      server.url,
    ])
    expect(missing.exitCode).toBe(1)
    expect(JSON.parse(missing.stderr)).toMatchObject({ success: false })
  } finally {
    server.stop()
    await rm(directory, { recursive: true, force: true })
  }
})

test("CLI clef evaluates with Cloudflare credentials and image files", async () => {
  const server = systemOneServer()
  const directory = await mkdtemp(join(tmpdir(), "jev-clef-"))
  const imagePath = join(directory, "product.png")
  try {
    await writeFile(imagePath, tinyPng)
    const result = await cliRun(
      ["clef", "--input", "-", "--base-url", server.url, "--model", "clef-flash", "--images", imagePath],
      JSON.stringify({
        state: "Inspect this photo.",
        questions: { damaged: { type: "noul", instructions: "Is it damaged?" } },
      }),
      { CLOUDFLARE_API_TOKEN: "cf-secret", CLOUDFLARE_ACCOUNT_ID: "test-account" },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout).answers.damaged.type).toBe("noul")
    expect(server.authorization).toBe("Bearer cf-secret")
    expect(server.requestBody?.model).toBe("clef-flash")
    expect((server.requestBody?.images as string[])[0]?.startsWith("data:image/png;base64,")).toBe(true)
  } finally {
    server.stop()
    await rm(directory, { recursive: true, force: true })
  }
})

test("CLI evaluate primitives forward image files as data URLs", async () => {
  const server = systemOneServer()
  const directory = await mkdtemp(join(tmpdir(), "jev-images-"))
  const imagePath = join(directory, "product.png")
  try {
    await writeFile(imagePath, tinyPng)
    const result = await cliRun([
      "noul",
      "--state",
      '"Inspect this photo."',
      "--instructions",
      '"Is it damaged?"',
      "--images",
      imagePath,
      "--api-key",
      "cli-secret",
      "--base-url",
      server.url,
    ])

    expect(result.exitCode).toBe(0)
    expect((server.requestBody?.images as string[])[0]?.startsWith("data:image/png;base64,")).toBe(true)

    const missing = await cliRun([
      "noul",
      "--state",
      '"Inspect this photo."',
      "--instructions",
      '"Is it damaged?"',
      "--images",
      join(directory, "absent.png"),
      "--api-key",
      "cli-secret",
      "--base-url",
      server.url,
    ])
    expect(missing.exitCode).toBe(1)
    expect(JSON.parse(missing.stderr)).toMatchObject({ success: false, op: "cliImagesRead" })
  } finally {
    server.stop()
    await rm(directory, { recursive: true, force: true })
  }
})

async function cliRun(
  args: readonly string[],
  input?: string,
  environment: Record<string, string> = {},
): Promise<CliRun> {
  const child = Bun.spawn([process.execPath, "run", "src/cli.ts", ...args], {
    cwd: projectRoot,
    env: { ...process.env, JEV_API_KEY: "", OPENAI_API_KEY: "", ...environment },
    stdin: input === undefined ? "ignore" : new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()])
  return { exitCode: await child.exited, stderr, stdout }
}

function decisionsServer() {
  let authorization: string | undefined
  let requestBody: Record<string, unknown> | undefined
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      authorization = request.headers.get("authorization") ?? undefined
      requestBody = (await request.json()) as Record<string, unknown>
      const questions = requestBody.questions as { type: string; name: string; choices?: { value: string }[] }[]
      const answers = questions.map((question) => {
        if (question.type === "predicate") return { type: "predicate", name: question.name, probability: 0.9 }
        if (question.type === "choice") {
          const value = question.choices?.[0]?.value ?? "other"
          return {
            type: "choice",
            name: question.name,
            choice: value,
            probabilities: (question.choices ?? []).map((choice) => ({
              value: choice.value,
              probability: choice.value === value ? 1 : 0,
            })),
            confidence: 1,
          }
        }
        return {
          type: "score",
          name: question.name,
          score: 1,
          probabilities: [
            { value: 0, probability: 0 },
            { value: 1, probability: 1 },
          ],
          confidence: 1,
        }
      })
      return Response.json({ model: requestBody.model, answers, usage: { input_tokens: 3, output_tokens: 0 } })
    },
  })

  return {
    get authorization() {
      return authorization
    },
    get requestBody() {
      return requestBody
    },
    stop: () => server.stop(true),
    url: `http://${server.hostname}:${server.port}`,
  }
}

function systemOneServer() {
  let authorization: string | undefined
  let requestBody: Record<string, unknown> | undefined
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      authorization = request.headers.get("authorization") ?? undefined
      requestBody = (await request.json()) as Record<string, unknown>
      const questions = requestBody.questions as Record<string, { type: string }>
      const answers = Object.fromEntries(Object.entries(questions).map(([name]) => [name, { type: "noul", noul: 0.5 }]))
      return Response.json({ model: requestBody.model, answers, usage: { input_tokens: 3, output_tokens: 1 } })
    },
  })

  return {
    get authorization() {
      return authorization
    },
    get requestBody() {
      return requestBody
    },
    stop: () => server.stop(true),
    url: `http://${server.hostname}:${server.port}`,
  }
}
