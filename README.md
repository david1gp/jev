# @adaptive-ds/jev

Initial TypeScript library and command-line scaffold for the Adaptive DS ecosystem.

> **Status:** scaffold only. The library entry point is intentionally empty and the `jev` command currently provides the generated help and version foundation. No domain functionality is included yet.

## Install

The package targets Node.js 22+ and Bun 1.4+.

```sh
bun add @adaptive-ds/jev
# or
npm install @adaptive-ds/jev
```

The `jev` executable is included:

```sh
bunx --package @adaptive-ds/jev jev --help
```

## Development

```sh
bun install
bun run dev             # run the CLI scaffold from source
bun run format          # format source, tests, and configuration
bun run format:check
bun run type-check
bun run test
bun run build           # emit dist/ with JavaScript and declarations
bun run deploy          # run formatting, types, tests, and build
```

The source repository is public at [`david1gp/jev`](https://github.com/david1gp/jev). This scaffold does not publish
the package to npm or run deployment/release automation.
