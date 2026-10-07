import { decisionsChoice, decisionsClientCreate, decisionsPredicate, decisionsScore } from "../src/index.js"
import { exampleKeyRead } from "./exampleShared.js"

const clientResult = decisionsClientCreate({
  apiKey: exampleKeyRead("OPENAI_API_KEY"),
  ...(process.env.DECISIONS_BASE_URL === undefined ? {} : { baseUrl: process.env.DECISIONS_BASE_URL }),
})
if (!clientResult.success) {
  console.error(`${clientResult.op}: ${clientResult.errorMessage}`)
  process.exit(1)
}

const responseResult = await clientResult.data.evaluate({
  input: "I was charged twice for my order.",
  questions: [
    decisionsPredicate("duplicate_charge", "Was the customer charged more than once?"),
    decisionsChoice("department", "Which department should handle this complaint?", {
      billing: "Payments, invoices, and refunds.",
      technical: "Problems using the product.",
      shipping: "Delivery and tracking.",
      other: "Requests outside these categories.",
    }),
    decisionsScore("severity", "How severe is this issue?", [
      { label: "Cosmetic", description: "Appearance only; no lost functionality." },
      { label: "Workaround available", description: "A task fails, but another way works." },
      { label: "Fully blocked", description: "A task fails with no workaround." },
    ]),
  ],
})

if (!responseResult.success) {
  console.error(`${responseResult.op}: ${responseResult.errorMessage}`)
  process.exit(1)
}

console.log(JSON.stringify(responseResult.data))
