import type { DecisionsScoreQuestion } from "./decisionsScoreSchema.js"

export type DecisionsScoreLevels = readonly (
  | string
  | { readonly label: string; readonly description?: string | null }
)[]

export function decisionsScore<const T extends DecisionsScoreLevels>(
  name: string,
  instructions: string,
  levels: T,
): DecisionsScoreQuestion {
  return {
    type: "score",
    name,
    instructions,
    levels: levels.map((level) =>
      typeof level === "string"
        ? { label: level }
        : { label: level.label, ...(level.description === undefined ? {} : { description: level.description }) },
    ),
  }
}
