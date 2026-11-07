import StudentContact from '#models/student_contact'
import consent from '#services/consent_service'
import content from '#services/content_service'
import ConsentTransformer from '#transformers/consent_transformer'
import { transformMatches } from '#transformers/occupation_match_transformer'
import ResultTransformer from '#transformers/result_transformer'
import { contactValidator } from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentMypathController {
  /**
   * `GET /mypath`: contact form, consent text (unticked) and Download. The form is hidden once
   * a contact exists. Needs a finished test.
   */
  async show({ response, inertia, attempt }: HttpContext) {
    if (!(await attempt!.score())) return response.redirect().toRoute('student.test.show')
    await attempt!.reachStep('mypath') // saves the scores too

    return inertia.render('student/mypath', {
      consent: ConsentTransformer.transform(consent),
      hasContact: !!(await StudentContact.findBy('attemptId', attempt!.id)),
    })
  }

  /**
   * `POST /mypath/download`: a typed phone or email needs the consent box, else the form comes
   * back with a message. Records the first download time [N5], then opens the printable page.
   */
  async download({ request, response, logger, attempt }: HttpContext) {
    if (!(await attempt!.score())) return response.redirect().toRoute('student.test.show')

    const input = await contactValidator.validate(request.only(['phone', 'email', 'consent']))
    await StudentContact.record(attempt!.id, input, 'mypath')
    await attempt!.markDownloaded()
    logger.info({ attempt: attempt!.uuid, consented: !!input.consent }, 'download') // UUID only [DP-001]

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
