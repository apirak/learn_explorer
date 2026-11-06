import type Attempt from '#models/attempt'
import content, { type RiasecType } from '#services/content_service'
import { scoreMax } from '#services/scoring_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A scored attempt: its six scores, interest code with Thai type names, and validity.
 * Only for an attempt the result controller has just scored; the `!`s rely on that.
 */
export default class ResultTransformer extends BaseTransformer<Attempt> {
  toObject() {
    const a = this.resource
    const code = [...(a.interestCode ?? '')] as RiasecType[]
    return {
      scores: {
        R: a.scoreR!,
        I: a.scoreI!,
        A: a.scoreA!,
        S: a.scoreS!,
        E: a.scoreE!,
        C: a.scoreC!,
      },
      max: scoreMax(content.forms.mini.ids.length),
      code,
      status: a.profileStatus!,
      types: code.map((type) => ({ type, ...content.riasecTypes[type] })),
    }
  }
}
