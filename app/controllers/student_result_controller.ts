import content from '#services/content_service'
import { matchOccupations, sharedHighTypes } from '#services/scoring_service'
import OccupationMatchTransformer from '#transformers/occupation_match_transformer'
import ResultTransformer from '#transformers/result_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentResultController {
  /** `GET /result`: the interest code and hexagon. Needs all 30 answers, else back to the test. */
  async show({ response, inertia, logger, attempt }: HttpContext) {
    if (!(await attempt!.score())) return response.redirect().toRoute('student.test.show')
    await attempt!.reachStep('result') // saves the scores too
    logger.info({ attempt: attempt!.uuid }, 'attempt_scored') // UUID only [DP-001]

    return inertia.render('student/result', {
      result: ResultTransformer.transform(attempt!),
    })
  }

  /** `GET /careers`: the top 5 matching occupations. An invalid profile has none: back to the result. */
  async careers({ response, inertia, attempt }: HttpContext) {
    const scored = await attempt!.score()
    if (!scored) return response.redirect().toRoute('student.test.show')
    if (scored.status !== 'ok') return response.redirect().toRoute('student.result')
    await attempt!.save()

    const name = (t: keyof typeof content.riasecTypes) => content.riasecTypes[t].name
    return inertia.render('student/careers', {
      guess: attempt!.desiredCareer,
      matches: OccupationMatchTransformer.transform(
        matchOccupations(scored.scores, content.occupations).map((m) => ({
          ...m,
          shared: sharedHighTypes(m.occupation, scored.code).map(name),
        }))
      ),
    })
  }
}
