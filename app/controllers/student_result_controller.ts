import { DateTime } from 'luxon'
import { CareerMatchService } from '#services/career_match_service'
import NpsResponseTransformer from '#transformers/nps_response_transformer'
import { transformMatches } from '#transformers/occupation_match_transformer'
import ResultTransformer from '#transformers/result_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentResultController {
  /** `GET /result`: the interest code and hexagon. Needs all 30 answers, else back to the test. */
  async show({ response, inertia, logger, attempt }: HttpContext) {
    // Scores and stores the career matches and test time (ADR 0005).
    if (!(await CareerMatchService.record(attempt!)))
      return response.redirect().toRoute('student.test.show')
    const firstView = !attempt!.resultAt // the reveal plays once; a reload or a return shows the result at rest
    await attempt!.reachStep('result')
    logger.info({ attempt: attempt!.uuid }, 'attempt_scored') // UUID only [DP-001]

    return inertia.render('student/result', {
      result: ResultTransformer.transform(attempt!),
      reveal: firstView,
    })
  }

  /**
   * `GET /careers`: the top 5 matching occupations and this attempt's NPS response. Records the
   * first open. An invalid profile has none: back to the result.
   */
  async careers({ response, inertia, attempt }: HttpContext) {
    const scored = await CareerMatchService.record(attempt!) // stores matches and test time (ADR 0005)
    if (!scored) return response.redirect().toRoute('student.test.show')
    if (scored.status !== 'ok') return response.redirect().toRoute('student.result')
    attempt!.careersViewedAt ??= DateTime.now() // the NPS response-rate denominator, not a step
    await attempt!.save()

    const nps = await attempt!.related('npsResponse').query().first()
    return inertia.render('student/careers', {
      guess: attempt!.desiredCareer,
      matches: transformMatches(scored.scores, scored.code, scored.matches),
      nps: nps ? NpsResponseTransformer.transform(nps) : null,
    })
  }
}
