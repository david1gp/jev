#!/usr/bin/env bun

import { cliVersionMetadataRender } from "./cliVersionMetadata.js"

const commandName = "jev"
const cliArguments = Bun.argv.slice(2)
const versionVerbose = cliVersionVerboseRead(cliArguments)

if (versionVerbose !== undefined) {
  process.stdout.write(cliVersionMetadataRender(versionVerbose))
} else {
  if (Bun.argv.includes("--help")) {
    console.log(`Usage: ${commandName}`)
  }
}

function cliVersionVerboseRead(argumentsList: readonly string[]): boolean | undefined {
  const command = argumentsList[0]
  if (command !== "version" && command !== "--version" && command !== "-V") return undefined
  return argumentsList.slice(1).some((argument) => argument === "--verbose" || argument === "-v")
}
