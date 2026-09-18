import * as v from "valibot"
import { choiceAnswerSchema } from "../choice/choiceAnswerSchema.js"
import { noulAnswerSchema } from "../noul/noulAnswerSchema.js"
import { scoreAnswerSchema } from "../score/scoreAnswerSchema.js"

export const answerSchema = v.variant("type", [choiceAnswerSchema, scoreAnswerSchema, noulAnswerSchema])
