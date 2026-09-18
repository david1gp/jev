#!/usr/bin/env node

import { jevCliApplication } from "./cliApplication.js"
import { cliRun } from "./cli/cliRun.js"

await cliRun(jevCliApplication, process.argv.slice(2), process)
