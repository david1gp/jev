import * as v from "valibot"
import { choiceSchema } from "../choice/choiceSchema.js"
import { noulSchema } from "../noul/noulSchema.js"
import { scoreSchema } from "../score/scoreSchema.js"

export const questionSchema = v.variant("type", [choiceSchema, scoreSchema, noulSchema])
