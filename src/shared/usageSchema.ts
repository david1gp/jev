import * as v from "valibot"

export const usageSchema = v.object({
  input_tokens: v.pipe(v.number(), v.finite(), v.integer(), v.minValue(0)),
  output_tokens: v.pipe(v.number(), v.finite(), v.integer(), v.minValue(0)),
})

export type Usage = v.InferOutput<typeof usageSchema>
