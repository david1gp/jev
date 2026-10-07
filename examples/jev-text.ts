import { choice, noul, score, systemOneClientCreate } from "../src/index.js"
import { exampleKeyRead } from "./exampleShared.js"

const clientResult = systemOneClientCreate({ apiKey: exampleKeyRead("JEV_API_KEY") })
if (!clientResult.success) {
  console.error(`${clientResult.op}: ${clientResult.errorMessage}`)
  process.exit(1)
}

const responseResult = await clientResult.data.evaluate({
  state: "My payout has failed for three days and rent is due tomorrow.",
  questions: {
    department: choice("Which team should handle this?", {
      billing: "Payments, invoicing, or refunds",
      technical: "Bugs, outages, or integrations",
      sales: "Pricing, upgrades, or new accounts",
    }),
    severity: score("How severe is this?", ["Minor", "Blocking", "Business-critical"]),
    urgent: noul("Does this require urgent handling?", {
      true: "Explicitly time-sensitive",
      false: "No urgency expressed",
    }),
  },
})

if (!responseResult.success) {
  console.error(`${responseResult.op}: ${responseResult.errorMessage}`)
  process.exit(1)
}

console.log(JSON.stringify(responseResult.data))
