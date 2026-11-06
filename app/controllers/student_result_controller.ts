import type Attempt from '#models/attempt'
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

/**
 * Scores from the saved answers, recomputed on every open [M1] so a changed answer
 * always shows up. Stored on the attempt (unsaved). Null until all 30 are answered.
 */
async function score(attempt: Attempt) {
  const answers = await attempt.related('answers').query().select('itemId', 'value')
  if (answers.length < content.forms.mini.ids.length) return null

  const scores = scoreAnswers(Object.fromEntries(answers.map((a) => [a.itemId, a.value])))
  const code = interestCode(scores)
  const status = profileStatus(scores)
  attempt.merge({
    scoreR: scores.R,
    scoreI: scores.I,
    scoreA: scores.A,
    scoreS: scores.S,
    scoreE: scores.E,
    scoreC: scores.C,
    interestCode: code.join(''),
    profileStatus: status,
  })
  return { scores, code, status }
}

export default class StudentResultController {
  /** `GET /result`: the interest code and hexagon. Needs all 30 answers, else back to the test. */
  async show({ response, inertia, logger, attempt }: HttpContext) {
    if (!(await score(attempt!))) return response.redirect().toRoute('student.test.show')
    await attempt!.reachStep('result') // saves the scores too
    logger.info({ attempt: attempt!.uuid }, 'attempt_scored') // UUID only [DP-001]

    return inertia.render('student/result', {
      result: ResultTransformer.transform(attempt!),
      attribution: content.attribution,
    })
  }

  /** `GET /careers`: the top 5 matching occupations. An invalid profile has none: back to the result. */
  async careers({ response, inertia, attempt }: HttpContext) {
    const scored = await score(attempt!)
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
      attribution: content.attribution,
    })
  }
}
