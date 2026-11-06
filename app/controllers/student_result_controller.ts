import content from '#services/content_service'
import {
  interestCode,
  matchOccupations,
  profileStatus,
  scoreAnswers,
  sharedHighTypes,
} from '#services/scoring_service'
import OccupationMatchTransformer from '#transformers/occupation_match_transformer'
import ResultTransformer from '#transformers/result_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentResultController {
  /**
   * `GET /result`: needs all 30 answers, else back to the test.
   * Scores are recomputed from the saved answers on every open [M1], so a changed
   * answer always shows up here. No lock: the same answers give the same row.
   */
  async show({ response, inertia, logger, attempt }: HttpContext) {
    const answers = await attempt!.related('answers').query().select('itemId', 'value')
    if (answers.length < content.forms.mini.ids.length) {
      return response.redirect().toRoute('student.test.show')
    }

    const scores = scoreAnswers(Object.fromEntries(answers.map((a) => [a.itemId, a.value])))
    const code = interestCode(scores)
    const status = profileStatus(scores)
    attempt!.merge({
      scoreR: scores.R,
      scoreI: scores.I,
      scoreA: scores.A,
      scoreS: scores.S,
      scoreE: scores.E,
      scoreC: scores.C,
      interestCode: code.join(''),
      profileStatus: status,
    })
    await attempt!.reachStep('result') // saves the scores too
    logger.info({ attempt: attempt!.uuid }, 'attempt_scored') // UUID only [DP-001]

    const matches = status === 'ok' ? matchOccupations(scores, content.occupations) : []
    return inertia.render('student/result', {
      result: ResultTransformer.transform(attempt!),
      matches: OccupationMatchTransformer.transform(
        matches.map((m) => ({ ...m, shared: sharedHighTypes(m.occupation, code) }))
      ),
      attribution: content.attribution,
    })
  }
}
