import type { DecisionsPredicateQuestion } from "./decisionsPredicateSchema.js"

export type DecisionsPredicateCriteria = {
  readonly true?: string | null
  readonly false?: string | null
}

export function decisionsPredicate(
  name: string,
  instructions: string,
  criteria?: DecisionsPredicateCriteria | null,
): DecisionsPredicateQuestion {
  return {
    type: "predicate",
    name,
    instructions,
    ...(criteria === undefined ? {} : { criteria }),
  }
}
