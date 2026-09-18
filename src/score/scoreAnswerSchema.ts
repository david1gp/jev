import * as v from "valibot"
import { descriptionSchema } from "../shared/descriptionSchema.js"
import { probabilityDistributionSchema } from "../shared/probabilityDistributionSchema.js"
import { probabilitySchema } from "../shared/probabilitySchema.js"

export const scoreAnswerSchema = v.pipe(
  v.object({
    type: v.literal("score"),
    score: v.pipe(v.number(), v.finite(), v.minValue(0)),
    legend: v.pipe(v.record(v.string(), descriptionSchema), v.minEntries(2)),
    probabilities: probabilityDistributionSchema,
    confidence: probabilitySchema,
  }),
  v.check((answer) => {
    const legendKeys = Object.keys(answer.legend)
    const probabilityKeys = Object.keys(answer.probabilities)
    if (legendKeys.length !== probabilityKeys.length) return false
    if (!legendKeys.every((key) => Object.hasOwn(answer.probabilities, key))) return false

    const levels = legendKeys.map(Number)
    const maximumLevel = Math.max(...levels)
    return levels.every((level) => Number.isInteger(level) && level >= 0) && answer.score <= maximumLevel
  }, "Score answers must include matching levels and stay within the rubric."),
)
