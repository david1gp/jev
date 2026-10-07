import { noul, systemOneClientCreate } from "../src/index.js"
import { exampleKeyRead, imageDataUrlRead } from "./exampleShared.js"

// The hosted Jev endpoint currently rejects image requests with HTTP 400, so
// images live on ClefRequest (not SystemOneRequest) until upstream enables
// vision. The shared runtime still forwards them; use Clef for image calls.

const clientResult = systemOneClientCreate({ apiKey: exampleKeyRead("JEV_API_KEY") })
if (!clientResult.success) {
  console.error(`${clientResult.op}: ${clientResult.errorMessage}`)
  process.exit(1)
}

const responseResult = await clientResult.data.evaluate({
  state: "Inspect the product in these photos.",
  questions: { visible_damage: noul("Does the product have visible damage, such as a crack or tear?") },
  images: [await imageDataUrlRead("images/product-damaged.png")],
})

if (!responseResult.success) {
  console.error(`${responseResult.op}: ${responseResult.errorMessage}`)
  process.exit(1)
}

console.log(JSON.stringify(responseResult.data))
