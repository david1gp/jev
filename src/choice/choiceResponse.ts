import type { ChoiceAnswer } from "./choiceAnswer.js"
import type { ChoiceCriteria } from "./choiceCriteriaSchema.js"

export type ChoiceResponse<T extends ChoiceCriteria = ChoiceCriteria> = ChoiceAnswer<T>
