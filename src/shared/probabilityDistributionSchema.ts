import * as v from "valibot"
import { probabilitySchema } from "./probabilitySchema.js"

export const probabilityDistributionSchema = v.pipe(
  v.record(v.string(), probabilitySchema),
  v.minEntries(1),
  v.check(
    (distribution) =>
      Math.abs(Object.values(distribution).reduce((total, probability) => total + probability, 0) - 1) <= 1e-6,
    "Probabilities must sum to 1.",
  ),
)
