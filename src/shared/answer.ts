import type { ChoiceAnswer } from "../choice/choiceAnswer.js"
import type { NoulAnswer } from "../noul/noulAnswer.js"
import type { ScoreAnswer } from "../score/scoreAnswer.js"

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer
