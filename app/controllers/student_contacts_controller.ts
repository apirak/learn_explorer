import StudentContact from '#models/student_contact'
import consent from '#services/consent_service'
import ConsentTransformer from '#transformers/consent_transformer'
import { contactValidator } from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'

export default class StudentContactsController {
  /**
   * `GET /contact`: the step between the result and the careers. Skipped for a campaign code
   * or a contact already left; careers then opens straight away. An `NC-` code still asks.
   */
  async show({ response, inertia, attempt }: HttpContext) {
    const scored = await attempt!.score()
    if (!scored) return response.redirect().toRoute('student.test.show')
    if (scored.status !== 'ok') return response.redirect().toRoute('student.result')
    if (attempt!.hasEntryCode ||(await StudentContact.findBy('attemptId', attempt!.id))) {
      return response.redirect().toRoute('student.careers')
    }

    return inertia.render('student/contact', { consent: ConsentTransformer.transform(consent) })
  }

  /** `POST /contact`: saves the contact when consented, then opens the careers. */
  async store({ request, response, logger, attempt }: HttpContext) {
    const input = await contactValidator.validate(request.only(['phone', 'email', 'consent']))
    const saved = await StudentContact.record(attempt!.id, input, 'contact')
    logger.info({ attempt: attempt!.uuid, saved: !!saved }, 'contact') // UUID only [DP-001]

    return response.redirect().toRoute('student.careers')
  }
}
