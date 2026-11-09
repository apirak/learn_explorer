import AdminAudit from '#models/admin_audit'
import Attempt, { STEPS, type Step } from '#models/attempt'
import { REPORT_ZONE } from '#services/report_service'
import { DICTIONARY_PATH, toCsv } from '#services/student_export_service'
import AttemptTransformer from '#transformers/attempt_transformer'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const PER_PAGE = 25

/** The list's code and step filters from the query string. */
function readFilters({ code, step }: Record<string, unknown>) {
  return {
    code: typeof code === 'string' && code.trim() ? code.trim() : null,
    // An unknown step is ignored instead of an error page, like the dashboard range.
    step: STEPS.includes(step as Step) ? (step as Step) : null,
  }
}

function filteredAttempts(filters: ReturnType<typeof readFilters>) {
  return Attempt.query()
    .if(filters.code, (q) => q.where('code', filters.code!))
    .if(filters.step, (q) => q.where('furthestStep', filters.step!))
    .preload('contact')
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
}

/**
 * Admin student records: a masked list, an audited detail page, and a CSV export with full
 * contact details for internal use (ADR 0003) [DP-001].
 */
export default class StudentsController {
  async index({ inertia, request }: HttpContext) {
    const filters = readFilters(request.qs())
    const attempts = await filteredAttempts(filters).paginate(
      Math.max(1, Number(request.qs().page) || 1),
      PER_PAGE
    )

    return inertia.render('admin/students/index', {
      filters,
      attempts: AttemptTransformer.paginate(attempts.all(), attempts.getMeta()),
    })
  }

  /**
   * `GET /admin/students/export`: every attempt the list's filters match, as CSV.
   * ponytail: builds the file in memory; stream it if exports reach hundreds of thousands of rows.
   */
  async export({ request, response, auth, logger }: HttpContext) {
    const attempts = await filteredAttempts(readFilters(request.qs()))
      .withCount('answers', (q) => q.as('answer_count'))
      .withCount('careerViews', (q) => q.as('career_view_count'))
      .withCount('careerViews', (q) => q.whereNotNull('savedAt').as('career_save_count'))
      .preload('npsResponse')
    // Ids and counts only, never student data [DP-001].
    logger.info({ userId: auth.user!.id, rows: attempts.length }, 'students_exported')

    const stamp = DateTime.now().setZone(REPORT_ZONE).toFormat('yyyyMMdd-HHmm')
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="students-${stamp}.csv"`)
    return toCsv(attempts)
  }

  /** `GET /admin/students/export/dictionary`: what each export column means, for people and AI. */
  async dictionary({ response }: HttpContext) {
    response.attachment(app.makePath(DICTIONARY_PATH), 'students-export-dictionary.md')
  }

  async show({ inertia, params, auth }: HttpContext) {
    const attempt = await Attempt.query()
      .where('id', params.id)
      .preload('answers')
      .preload('careerViews', (q) => q.orderBy('createdAt'))
      .preload('contact')
      .firstOrFail()
    await attempt.score()

    await AdminAudit.create({ userId: auth.user!.id, attemptId: attempt.id, action: 'view' })

    return inertia.render('admin/students/show', {
      attempt: AttemptTransformer.transform(attempt).useVariant('forDetail'),
    })
  }

  /** Deletes one attempt; answers, career views and contact cascade, audit rows keep a null id. */
  async destroy({ params, auth, session, response, logger }: HttpContext) {
    const attempt = await Attempt.findOrFail(params.id)
    await attempt.delete()
    // Ids only, never student data [DP-001].
    logger.info({ attemptId: attempt.id, userId: auth.user!.id }, 'attempt_deleted')
    session.flash('success', 'Student deleted')
    return response.redirect().back()
  }
}
