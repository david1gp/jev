import type { ChoiceQuestion } from "../choice/choiceQuestion.js"
import type { NoulQuestion } from "../noul/noulQuestion.js"
import type { ScoreQuestion } from "../score/scoreQuestion.js"

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion
