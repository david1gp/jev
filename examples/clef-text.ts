import { choice, noul, score } from "../src/index.js"
import { clefClientCreate } from "../src/index.js"
import { exampleKeyRead } from "./exampleShared.js"

const clientResult = clefClientCreate({
  apiToken: exampleKeyRead("CLOUDFLARE_API_TOKEN"),
  accountId: exampleKeyRead("CLOUDFLARE_ACCOUNT_ID"),
})
if (!clientResult.success) {
  console.error(`${clientResult.op}: ${clientResult.errorMessage}`)
  process.exit(1)
}

const responseResult = await clientResult.data.evaluate({
  state: "Checkout has been failing for every customer for the last hour.",
  questions: {
    urgent: noul("Is this support request urgent?"),
    team: choice("Which team should handle this request?", {
      billing: "Payments, invoices, and refunds",
      technical: "Outages, errors, and configuration",
      sales: "Plans and upgrades",
    }),
    severity: score("How severe is the customer impact?", ["No impact", "Minor", "Major", "Critical"]),
  },
})

if (!responseResult.success) {
  console.error(`${responseResult.op}: ${responseResult.errorMessage}`)
  process.exit(1)
}

console.log(JSON.stringify(responseResult.data))
