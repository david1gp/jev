import * as v from "valibot"
import { probabilitySchema } from "../shared/probabilitySchema.js"

export const noulAnswerSchema = v.object({
  type: v.literal("noul"),
  noul: probabilitySchema,
})
