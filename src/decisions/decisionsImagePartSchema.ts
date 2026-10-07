import * as v from "valibot"

export const decisionsImagePartSchema = v.object({
  type: v.literal("input_image"),
  image_url: v.pipe(v.string(), v.minLength(1), v.regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/u)),
})

export type DecisionsImagePart = v.InferOutput<typeof decisionsImagePartSchema>
