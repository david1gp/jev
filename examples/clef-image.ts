import { choice, noul } from "../src/index.js"
import { clefClientCreate } from "../src/index.js"
import { exampleKeyRead, imageDataUrlRead } from "./exampleShared.js"

const clientResult = clefClientCreate({
  apiToken: exampleKeyRead("CLOUDFLARE_API_TOKEN"),
  accountId: exampleKeyRead("CLOUDFLARE_ACCOUNT_ID"),
})
if (!clientResult.success) {
  console.error(`${clientResult.op}: ${clientResult.errorMessage}`)
  process.exit(1)
}

const responseResult = await clientResult.data.evaluate({
  state: "Inspect the product in this photo.",
  questions: {
    visible_damage: noul("Does the product have visible damage, such as a crack, tear, or dent?"),
    category: choice("What is shown?", {
      phone: "A mobile phone or its screen",
      other: "Anything else",
    }),
  },
  images: [await imageDataUrlRead("images/product-damaged.png")],
})

if (!responseResult.success) {
  console.error(`${responseResult.op}: ${responseResult.errorMessage}`)
  process.exit(1)
}

console.log(JSON.stringify(responseResult.data))
