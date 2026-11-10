import type Attempt from '#models/attempt'
import content from '#services/content_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * One row of the Career matches page. Needs `careerMatches` (by rank) and `contact` preloaded.
 * Says only whether a contact exists, never its details [DP-001].
 */
export default class CareerMatchRowTransformer extends BaseTransformer<Attempt> {
  toObject() {
    const a = this.resource
    return {
      ...this.pick(a, [
        'id',
        'code',
        'testTimeMs',
        'interestCode',
        'profileStatus',
        'matchedAt',
        'desiredCareer',
      ]),
      careerMatches: a.careerMatches.map(
        ({ occupationCode: code }) =>
          content.thaiTitles[code] ??
          content.occupations.find((o) => o.code === code)?.title ??
          code
      ),
      consented: !!a.contact,
    }
  }
}
