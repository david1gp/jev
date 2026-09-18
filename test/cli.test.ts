import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const projectRoot = resolve(import.meta.dir, "..")

type CliRun = {
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
}

test("CLI help and version run as Node-distributable ESM entrypoints", async () => {
  const help = await cliRun(["--help"])
  expect(help.exitCode).toBe(0)
  expect(help.stdout).toContain("jev evaluate")
  expect(help.stdout).toContain("choice")

  const version = await cliRun(["--version"])
  expect(version.exitCode).toBe(0)
  expect(version.stdout.trim()).toBe("0.1.0")

  const legacyVersion = await cliRun(["-V"])
  expect(legacyVersion.exitCode).toBe(0)
  expect(legacyVersion.stdout.trim()).toBe("0.1.0")
})

test("CLI evaluates stdin JSON, uses JEV_API_KEY, and emits the API response as JSON", async () => {
  const server = mockServer()
  try {
    const result = await cliRun(
      ["evaluate", "--input", "-", "--base-url", server.url, "--model", "mock-model"],
      JSON.stringify({
        state: { ticket: 7 },
        questions: { urgent: { type: "noul", instructions: "Is this urgent?" } },
      }),
      { JEV_API_KEY: "cli-secret" },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout)).toEqual({
      model: "mock-model",
      answers: { urgent: { type: "noul", noul: 0.75 } },
      usage: { input_tokens: 3, output_tokens: 1 },
    })
    expect(server.authorization).toBe("Bearer cli-secret")
    expect(server.requestBody?.model).toBe("mock-model")
  } finally {
    server.stop()
  }
})

test("CLI primitive commands parse JSON flags and preserve named question batches", async () => {
  const server = mockServer()
  try {
    const result = await cliRun(
      [
        "choice",
        "--state",
        '{"ticket":7}',
        "--instructions",
        '"Which team?"',
        "--criteria",
        '{"billing":null,"technical":null}',
        "--name",
        "route",
        "--api-key",
        "cli-secret",
        "--base-url",
        server.url,
      ],
      undefined,
    )

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).answers.route.type).toBe("choice")
    expect((server.requestBody?.questions as Record<string, unknown>).route).toEqual({
      type: "choice",
      instructions: "Which team?",
      criteria: { billing: null, technical: null },
    })

    for (const [command, criteria, expectedType] of [
      ["score", '["low","high"]', "score"],
      ["noul", '{"true":null,"false":null}', "noul"],
    ] as const) {
      const primitive = await cliRun([
        command,
        "--state",
        '{"ticket":7}',
        "--instructions",
        '"Evaluate this"',
        "--criteria",
        criteria,
        "--api-key",
        "cli-secret",
        "--base-url",
        server.url,
      ])
      expect(primitive.exitCode).toBe(0)
      expect(JSON.parse(primitive.stdout).answers.question.type).toBe(expectedType)
    }
  } finally {
    server.stop()
  }
})

test("CLI reads a JSON request batch from a file", async () => {
  const server = mockServer()
  const directory = await mkdtemp(join(tmpdir(), "jev-cli-"))
  const inputPath = join(directory, "requests.json")
  try {
    await writeFile(
      inputPath,
      JSON.stringify([
        { state: "one", questions: { first: { type: "noul", instructions: "first" } } },
        { state: "two", questions: { second: { type: "noul", instructions: "second" } } },
      ]),
    )
    const result = await cliRun(["evaluate", "--file", inputPath, "--api-key", "cli-secret", "--base-url", server.url])
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toHaveLength(2)
  } finally {
    server.stop()
    await rm(directory, { recursive: true, force: true })
  }
})

test("CLI reports invalid input and API failures as safe JSON with nonzero exit codes", async () => {
  const invalidInput = await cliRun(["evaluate", "--input", "-", "--api-key", "cli-secret"], "not-json")
  expect(invalidInput.exitCode).toBe(1)
  expect(JSON.parse(invalidInput.stderr)).toMatchObject({ success: false, op: "cliInputRead" })
  expect(invalidInput.stderr).not.toContain("cli-secret")

  const server = mockServer(500)
  try {
    const failed = await cliRun(
      ["evaluate", "--input", "-", "--api-key", "cli-secret", "--base-url", server.url],
      JSON.stringify({ state: "x", questions: { q: { type: "noul", instructions: "q" } } }),
    )
    expect(failed.exitCode).toBe(1)
    const failureOutput = JSON.parse(failed.stderr)
    expect(failureOutput).toMatchObject({ success: false, op: "cliEvaluate", statusCode: 500 })
    expect(failureOutput.errorData).toBeDefined()
    expect(failed.stderr).not.toContain("cli-secret")
  } finally {
    server.stop()
  }
})

async function cliRun(
  args: readonly string[],
  input?: string,
  environment: Record<string, string> = {},
): Promise<CliRun> {
  const child = Bun.spawn([process.execPath, "run", "src/cli.ts", ...args], {
    cwd: projectRoot,
    env: { ...process.env, JEV_API_KEY: "", ...environment },
    stdin: input === undefined ? "ignore" : new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()])
  return { exitCode: await child.exited, stderr, stdout }
}

function mockServer(status = 200) {
  let authorization: string | undefined
  let requestBody: Record<string, unknown> | undefined
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      authorization = request.headers.get("authorization") ?? undefined
      requestBody = (await request.json()) as Record<string, unknown>
      if (status !== 200) return Response.json({ error: "mock failure" }, { status })

      const questions = requestBody.questions as Record<string, { type: string; criteria?: unknown }>
      const answers = Object.fromEntries(
        Object.entries(questions).map(([name, question]) => [name, mockAnswer(question.type, question)]),
      )
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

function mockAnswer(type: string, question: { readonly criteria?: unknown }): Record<string, unknown> {
  if (type === "choice") {
    const criteria = question.criteria as Record<string, unknown>
    const probabilities = Object.fromEntries(Object.keys(criteria).map((name, index) => [name, index === 0 ? 1 : 0]))
    return { type, choice: Object.keys(criteria)[0], probabilities, confidence: 1 }
  }
  if (type === "score")
    return { type, score: 1, legend: { "0": null, "1": null }, probabilities: { "0": 0, "1": 1 }, confidence: 1 }
  return { type: "noul", noul: 0.75 }
}
