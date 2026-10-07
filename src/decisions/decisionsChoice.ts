import type { DecisionsChoiceQuestion } from "./decisionsChoiceSchema.js"

export type DecisionsChoiceCriteria = Record<string, string | null>

export function decisionsChoice<const T extends DecisionsChoiceCriteria>(
  name: string,
  instructions: string,
  criteria: T,
): DecisionsChoiceQuestion {
  return {
    type: "choice",
    name,
    instructions,
    choices: Object.entries(criteria).map(([value, description]) => ({
      value,
      ...(description === null ? {} : { description }),
    })),
  }
}
