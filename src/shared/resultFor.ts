import type { ChoiceAnswer } from "../choice/choiceAnswer.js"
import type { ChoiceQuestion } from "../choice/choiceQuestion.js"
import type { NoulAnswer } from "../noul/noulAnswer.js"
import type { NoulQuestion } from "../noul/noulQuestion.js"
import type { ScoreAnswer } from "../score/scoreAnswer.js"
import type { ScoreQuestion } from "../score/scoreQuestion.js"
import type { Question } from "./question.js"

export type ResultFor<T extends Question> = T extends NoulQuestion
  ? NoulAnswer
  : T extends ScoreQuestion<infer S>
    ? ScoreAnswer<S>
    : T extends ChoiceQuestion<infer C>
      ? ChoiceAnswer<C>
      : never
