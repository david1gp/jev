import * as v from "valibot"

const dataUrlPattern = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/u

export const systemOneImageSchema = v.union([
  v.pipe(v.string(), v.minLength(1), v.regex(dataUrlPattern)),
  v.object({
    content_type: v.picklist(["image/png", "image/jpeg", "image/webp"]),
    base64: v.pipe(v.string(), v.minLength(1)),
  }),
])

export type SystemOneImage = v.InferOutput<typeof systemOneImageSchema>
