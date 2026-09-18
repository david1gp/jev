import * as v from "valibot"

export const probabilitySchema = v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(1))
