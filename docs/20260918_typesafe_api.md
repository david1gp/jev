# TypeSafe API library and CLI

## Goal
Implement the documented TypeSafe System One HTTP API as `@adaptive-ds/jev` and the `jev` CLI. Follow the code-style skill and sibling project conventions. This is a Result-based client, not a promise-rejection-compatible replacement for the official SDK.

## Decisions
- Support choice, score, noul, structured state, named question batches, model selection, and usage responses according to the upstream documentation.
- Use `src/{choice,score,noul,state,shared,cli}`; expand only when a clear bounded context requires it.
- Use Valibot for runtime validation and declare it as a peer dependency. Follow the code-style skill for Result handling, one export per implementation file, naming, and explicit public barrels.
- Use `@stricli/core` for CLI parsing. Prefer installed/sibling libraries over new unrelated dependencies.
- Default endpoint: `https://api.typesafe.ai/v1/systemone`; default model: `jev-latest`. Support configurable base URL, injected fetch, timeout, cancellation, and bounded retries for transient failures.
- Library accepts an explicit API key; CLI supports `JEV_API_KEY` and explicit flags. Never expose secrets. Do not invent undocumented model endpoints.
- CLI supports batched JSON requests via file/stdin, plus usable primitive commands if the documented shapes allow it. JSON output and failure exit codes must work for automation.
- README includes introduction, quick links, installation, library and CLI examples, configuration, primitive semantics, validation/errors, testing and links; package and GitHub metadata should match sibling project style.

## Approach and tasks
1. Implement schemas, primitive helpers, request/response types and focused tests after checking exact upstream constraints and the actual code-style skill. Status: completed.
2. Implement HTTP client and deterministic transport tests, with correct authentication, validation, timeout, retry, and Result behavior. Status: completed.
3. Implement Stricli CLI and CLI tests, public package exports and build metadata. Status: completed.
4. Finish README and GitHub description/topics using sibling conventions. Status: completed.
5. Run repository checks and real API tests of choice, score, noul and batched requests using `.env` credentials without exposing them. Correct issues found. Status: completed.

## Current context
Repository is a Bun/TypeScript ESM scaffold named `@adaptive-ds/jev`, with GitHub origin `david1gp/jev`. Upstream docs: https://docs.typesafe.ai/llms.txt, https://docs.typesafe.ai/api.md, and primitive and JavaScript SDK pages linked there. Respect unrelated local changes.
Implemented library entry point is `systemOneClientCreate(config)` returning a Result whose client exposes `evaluate(request, options?)`. Valibot and `@adaptive-ds/result` are peer dependencies.
CLI includes `evaluate`, `choice`, `score`, `noul`, and `version`. Live integration tests are explicitly opt-in through `bun run test:live`. Contracts permit structured descriptions and nullable instructions, exclude top-level null state, and require usable instructions or criteria for Noul.
