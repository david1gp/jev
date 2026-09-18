import * as v from "valibot"
import { questionSchema } from "./questionSchema.js"

export const questionsSchema = v.pipe(v.record(v.string(), questionSchema), v.minEntries(1))
