import { existsSync, realpathSync } from "node:fs"
import { release as osRelease } from "node:os"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import packageJson from "../package.json" with { type: "json" }

type CliPackageMetadata = {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly author?: string | { readonly name?: string; readonly url?: string }
  readonly license?: string
  readonly homepage?: string
  readonly repository?: string | { readonly url?: string }
  readonly engines?: Readonly<Record<string, string>>
  readonly bin?: Readonly<Record<string, string>>
}

const cliPackageMetadata = packageJson as unknown as CliPackageMetadata

export function cliVersionMetadataRender(verbose: boolean): string {
  const cliName = Object.keys(cliPackageMetadata.bin ?? {})[0] ?? cliPackageMetadata.name
  const lines = [cliName + " v" + cliPackageMetadata.version]
  if (!verbose) return lines.join("\n") + "\n"

  const executable = cliVersionExecutableResolve()
  lines.push(
    "user agent: " + cliPackageMetadata.name + "/" + cliPackageMetadata.version,
    "executable: " + executable.entrypoint,
    "executable target: " + (executable.target ?? "unavailable"),
    "version: " + cliPackageMetadata.version,
    "description: " + (cliPackageMetadata.description ?? "unavailable"),
    "author: " + cliVersionAuthorRender(),
    "license: " + (cliPackageMetadata.license ?? "unavailable"),
    "project: " + cliVersionProjectRender(),
    "installation type: " + cliVersionInstallationTypeResolve(executable.target),
    "runtime: " + cliVersionRuntimeResolve(),
    "runtime requirements: " + cliVersionRequirementsRender(),
    "platform: " + process.platform + " " + process.arch + " (OS release " + osRelease() + ")",
  )
  return lines.join("\n") + "\n"
}

function cliVersionExecutableResolve(): { readonly entrypoint: string; readonly target?: string } {
  const entrypoint = process.argv[1]
  if (entrypoint === undefined) return { entrypoint: "unavailable" }

  const resolvedEntrypoint = resolve(entrypoint)
  try {
    return { entrypoint: resolvedEntrypoint, target: realpathSync(resolvedEntrypoint) }
  } catch {
    return { entrypoint: resolvedEntrypoint }
  }
}

function cliVersionInstallationTypeResolve(executableTarget: string | undefined): string {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  if (existsSync(resolve(packageRoot, ".git"))) return "development checkout"
  if (executableTarget !== undefined && !relative(packageRoot, executableTarget).startsWith(".."))
    return "package installation"
  return "unknown"
}

function cliVersionAuthorRender(): string {
  const author = cliPackageMetadata.author
  if (typeof author === "string") return author
  return [author?.name, author?.url].filter(Boolean).join(" — ") || "unavailable"
}

function cliVersionProjectRender(): string {
  const repository = cliPackageMetadata.repository
  return cliPackageMetadata.homepage ?? (typeof repository === "string" ? repository : repository?.url) ?? "unavailable"
}

function cliVersionRuntimeResolve(): string {
  return typeof Bun === "undefined" ? process.release.name + " " + process.version : "bun " + Bun.version
}

function cliVersionRequirementsRender(): string {
  return (
    Object.entries(cliPackageMetadata.engines ?? {})
      .map(([runtime, requirement]) => runtime + " " + requirement)
      .join(", ") || "unavailable"
  )
}
