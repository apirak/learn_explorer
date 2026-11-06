import { DateTime } from 'luxon'
import StudentContact from '#models/student_contact'
import consent from '#services/consent_service'
import content from '#services/content_service'
import { transformMatches } from '#transformers/occupation_match_transformer'
import ResultTransformer from '#transformers/result_transformer'
import { downloadValidator } from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentMypathController {
  /** `GET /mypath`: contact form, consent text (unticked) and Download. Needs a finished test. */
  async show({ response, inertia, attempt }: HttpContext) {
    if (!(await attempt!.score())) return response.redirect().toRoute('student.test.show')
    await attempt!.reachStep('mypath') // saves the scores too

    return inertia.render('student/mypath', { consent: consent.blocks })
  }

  /**
   * `POST /mypath/download`: stores phone and email only when consent is ticked, otherwise
   * discards them. Records the first download time [N5], then opens the printable page.
   */
  async download({ request, response, logger, attempt }: HttpContext) {
    const { phone, email, consent: consented } = await request.validateUsing(downloadValidator)

    if (consented && (phone || email)) {
      await StudentContact.updateOrCreate(
        { attemptId: attempt!.id },
        {
          phone: phone ?? null,
          email: email ?? null,
          consentAt: DateTime.now(),
          consentVersion: consent.version,
        }
      )
    }
    attempt!.downloadedAt ??= DateTime.now()
    await attempt!.save()
    logger.info({ attempt: attempt!.uuid, consented: !!consented }, 'download') // UUID only [DP-001]

    return response.redirect().toRoute('student.mypath.print')
  }

  /** `GET /mypath/print`: the result laid out for printing or a screenshot. */
  async print({ response, inertia, attempt }: HttpContext) {
    const scored = await attempt!.score()
    if (!scored) return response.redirect().toRoute('student.test.show')

    return inertia.render('student/print', {
      result: ResultTransformer.transform(attempt!),
      matches: scored.status === 'ok' ? transformMatches(scored.scores, scored.code) : [],
      attribution: content.attribution,
    })
  }
}
