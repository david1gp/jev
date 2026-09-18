import { expect, test } from "bun:test"
import * as entrypoint from "../src/index.js"

test("the library entry point loads", () => {
  expect(entrypoint).toBeDefined()
})
