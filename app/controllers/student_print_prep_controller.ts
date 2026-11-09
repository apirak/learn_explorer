import StudentContact from '#models/student_contact'
import consent from '#services/consent_service'
import content from '#services/content_service'
import ConsentTransformer from '#transformers/consent_transformer'
import { transformMatches } from '#transformers/occupation_match_transformer'
import ResultTransformer from '#transformers/result_transformer'
import { contactValidator } from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentPrintPrepController {
  /**
   * `GET /print-prep`: contact form, consent text (unticked) and Download. With a contact already
   * left there is nothing to ask, so it counts as a download and opens the printable page.
   * Needs a finished test.
   */
  async show({ response, inertia, attempt }: HttpContext) {
    if (!(await attempt!.score())) return response.redirect().toRoute('student.test.show')
    await attempt!.reachStep('print_prep') // saves the scores too

    if (await StudentContact.findBy('attemptId', attempt!.id)) {
      await attempt!.markDownloaded()
      return response.redirect().toRoute('student.print_prep.print')
    }
    return inertia.render('student/print_prep', { consent: ConsentTransformer.transform(consent) })
  }

  /**
   * `POST /print-prep/download`: a typed phone or email needs the consent box, else the form comes
   * back with a message. Records the first download time [N5], then opens the printable page.
   */
  async download({ request, response, logger, attempt }: HttpContext) {
    if (!(await attempt!.score())) return response.redirect().toRoute('student.test.show')

    const input = await contactValidator.validate(
      request.only(['name', 'phone', 'email', 'consent'])
    )
    await StudentContact.record(attempt!.id, input, 'print_prep')
    await attempt!.markDownloaded()
    logger.info({ attempt: attempt!.uuid, consented: !!input.consent }, 'download') // UUID only [DP-001]

    return response.redirect().toRoute('student.print_prep.print')
  }

  /** `GET /print-prep/print`: the result laid out for printing or a screenshot. */
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
