import CareerView from '#models/career_view'
import content from '#services/content_service'
import { matchOccupations } from '#services/scoring_service'
import OccupationTransformer from '#transformers/occupation_transformer'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

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
      attribution: content.attribution,
    })
  }
}
