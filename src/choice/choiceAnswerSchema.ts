import * as v from "valibot"
import { probabilityDistributionSchema } from "../shared/probabilityDistributionSchema.js"
import { probabilitySchema } from "../shared/probabilitySchema.js"

export const choiceAnswerSchema = v.pipe(
  v.object({
    type: v.literal("choice"),
    choice: v.string(),
    probabilities: probabilityDistributionSchema,
    confidence: probabilitySchema,
  }),
  v.check(
    (answer) => Object.hasOwn(answer.probabilities, answer.choice),
    "The selected choice must have a probability.",
  ),
)
