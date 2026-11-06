import Attempt from '#models/attempt'
import content, { CONTENT_VERSION } from '#services/content_service'
import { entryCodeValidator, startValidator } from '#validators/student'
import type { AttemptCookie, EntryCookie } from '#middleware/student_attempt_middleware'
import type { HttpContext } from '@adonisjs/core/http'

const COOKIE = { httpOnly: true, sameSite: 'lax' } as const

export default class StudentHomeController {
  /**
   * `GET /?code=…` stores the code in `le_entry`, then redirects so the code leaves the
   * address bar, history and Referer. Opening Home never creates an attempt.
   */
  async show({ request, response, inertia, attempt }: HttpContext) {
    if (request.qs().code !== undefined) {
      const [error, valid] = await entryCodeValidator.tryValidate(request.qs())
      const entry: EntryCookie = { code: error ? null : valid.code }
      response.encryptedCookie('le_entry', entry, { ...COOKIE, maxAge: '1d' })
      return response.redirect().toRoute('student.home')
    }

    const total = content.forms.mini.ids.length
    const answered = attempt ? await attempt.answerCount() : 0
    return inertia.render('student/home', {
      resume: attempt && answered < total ? { answered, total } : null,
      finished: answered === total, // CUJ 3: offer the previous result
      attribution: content.attribution,
    })
  }

  /** Start (and restart): `POST /attempts` creates a new attempt. An old one is never changed. */
  async start({ request, response, logger, attempt }: HttpContext) {
    const { desiredCareer } = await request.validateUsing(startValidator)
    const entry: EntryCookie | null = request.encryptedCookie('le_entry')

    const created = await Attempt.create({
      code: entry?.code ?? attempt?.code ?? null,
      desiredCareer: desiredCareer || null,
      contentVersion: CONTENT_VERSION,
      furthestStep: 'test',
    })

    const cookie: AttemptCookie = { uuid: created.uuid, code: created.code }
    response.encryptedCookie('le_attempt', cookie, { ...COOKIE, maxAge: '60d' })
    logger.info({ attempt: created.uuid }, 'attempt_created') // UUID only [DP-001]
    return response.redirect().toRoute('student.test.show')
  }
}
