import Attempt from '#models/attempt'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export type EntryCookie = { code: string | null }
export type AttemptCookie = { uuid: string; code: string | null }

/**
 * Finds the student's attempt from the `le_attempt` cookie and puts it on `ctx.attempt`.
 * Controllers read the attempt only from here, so a student can never reach another row.
 * With `required`, a request without an attempt is sent to Home.
 */
export default class StudentAttemptMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { required?: boolean } = {}) {
    const { request, response } = ctx
    const cookie: AttemptCookie | null = request.encryptedCookie('le_attempt')
    const entry: EntryCookie | null = request.encryptedCookie('le_entry')

    let attempt = cookie?.uuid ? await Attempt.findBy('uuid', cookie.uuid) : null
    if (cookie && !attempt) response.clearCookie('le_attempt') // purged or forged
    // Shared phone (CUJ 4): a different campaign code means a different student.
    if (attempt && entry?.code && entry.code !== attempt.code) attempt = null

    ctx.attempt = attempt
    if (options.required && !attempt) return response.redirect().toRoute('student.home')
    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    attempt: Attempt | null
  }
}
