import { decisionsClientCreate, decisionsPredicate } from "../src/index.js"
import { exampleKeyRead, imageDataUrlRead } from "./exampleShared.js"

const clientResult = decisionsClientCreate({
  apiKey: exampleKeyRead("OPENAI_API_KEY"),
  ...(process.env.DECISIONS_BASE_URL === undefined ? {} : { baseUrl: process.env.DECISIONS_BASE_URL }),
})
if (!clientResult.success) {
  console.error(`${clientResult.op}: ${clientResult.errorMessage}`)
  process.exit(1)
}

const responseResult = await clientResult.data.evaluate({
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "Inspect the product in this photo." },
        { type: "input_image", image_url: await imageDataUrlRead("images/product-damaged.png") },
      ],
    },
  ],
  questions: [
    decisionsPredicate(
      "visible_damage",
      "Does the product have visible damage, such as a crack, tear, or dent? Ignore shadows and damage to the packaging.",
    ),
  ],
})

if (!responseResult.success) {
  console.error(`${responseResult.op}: ${responseResult.errorMessage}`)
  process.exit(1)
}

console.log(JSON.stringify(responseResult.data))
