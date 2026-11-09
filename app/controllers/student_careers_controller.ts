import CareerView from '#models/career_view'
import content from '#services/content_service'
import { matchOccupations } from '#services/scoring_service'
import OccupationTransformer from '#transformers/occupation_transformer'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const UNIQUE_VIOLATION = '23505'

export default class StudentCareersController {
  /**
   * `GET /careers/:code`: one occupation from the attempt's current matches, else 404.
   * Records the view once per (attempt, occupation) and the career step time once.
   */
  async show({ params, inertia, attempt }: HttpContext) {
    const scored = await attempt!.score()
    const match =
      scored?.status === 'ok'
        ? matchOccupations(scored.scores, content.occupations).find(
            (m) => m.occupation.code === params.code
          )
        : undefined
    if (!match) throw new Exception("Not one of this attempt's matches", { status: 404 })

    try {
      await CareerView.firstOrCreate({
        attemptId: attempt!.id,
        occupationCode: match.occupation.code,
      })
    } catch (error) {
      // A double tap: the other request already inserted the row.
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error
    }
    await attempt!.reachStep('career') // saves the scores too

    return inertia.render('student/career', {
      occupation: OccupationTransformer.transform(match),
      attribution: content.attribution, // the license credit, printed with a Career save
    })
  }

  /**
   * `POST /careers/:code/save`: a Career save, sent as the print dialog opens. Keeps the first
   * press only, on a career this attempt has opened, else 404. Not a step, not a Download.
   */
  async save({ params, response, logger, attempt }: HttpContext) {
    const view = await CareerView.findByOrFail({
      attemptId: attempt!.id,
      occupationCode: params.code,
    })
    // One conditional update, so a double tap cannot replace the first time.
    const [saved] = await CareerView.query()
      .where('id', view.id)
      .whereNull('savedAt')
      .update({ savedAt: DateTime.now() })
    if (Number(saved)) logger.info({ attempt: attempt!.uuid }, 'career_saved') // UUID only [DP-001]
    return response.noContent()
  }
}
