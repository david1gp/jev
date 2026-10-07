import type { Questions } from "../shared/questions.js"
import type { SystemOneImage } from "../system/systemOneImageSchema.js"
import type { SystemOneRequest } from "../system/systemOneRequest.js"

export type ClefRequest<Q extends Questions = Questions> = SystemOneRequest<Q> & {
  readonly images?: readonly SystemOneImage[]
}
