import NpsResponse from '#models/nps_response'
import { npsValidator } from '#validators/student'
import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const UNIQUE_VIOLATION = '23505'

export default class StudentNpsController {
  /**
   * `POST /careers/nps`: the NPS response of this attempt, only once the careers list was opened,
   * else 404. A tap sends the score and overwrites the previous one; ส่ง also sends the comment
   * and marks the response sent. Logs the attempt UUID only, never the comment [DP-001].
   */
  async store({ request, response, logger, attempt }: HttpContext) {
    if (!attempt!.careersViewedAt) throw new Exception('Careers list not opened', { status: 404 })
    const { score, comment, send } = await request.validateUsing(npsValidator)

    const changes: Partial<NpsResponse> = { score }
    if (send) {
      changes.comment = comment || null
      changes.sentAt = DateTime.now()
    }
    try {
      await NpsResponse.updateOrCreate({ attemptId: attempt!.id }, changes)
    } catch (error) {
      // Two taps at once: the other request inserted the row, so this one updates it.
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error
      await NpsResponse.updateOrCreate({ attemptId: attempt!.id }, changes)
    }
    logger.info({ attempt: attempt!.uuid, sent: !!send }, 'nps_saved')
    return response.noContent()
  }
}
