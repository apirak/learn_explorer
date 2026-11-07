import AdminAudit from '#models/admin_audit'
import Attempt, { STEPS, type Step } from '#models/attempt'
import AttemptTransformer from '#transformers/attempt_transformer'
import type { HttpContext } from '@adonisjs/core/http'

const PER_PAGE = 25

/** Admin student records: a masked list and an audited detail page [DP-001]. No bulk export. */
export default class StudentsController {
  async index({ inertia, request }: HttpContext) {
    const { page, code, step } = request.qs()
    const filters = {
      code: typeof code === 'string' && code.trim() ? code.trim() : null,
      // An unknown step is ignored instead of an error page, like the dashboard range.
      step: STEPS.includes(step) ? (step as Step) : null,
    }
    const attempts = await Attempt.query()
      .if(filters.code, (q) => q.where('code', filters.code!))
      .if(filters.step, (q) => q.where('furthestStep', filters.step!))
      .preload('contact')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .paginate(Math.max(1, Number(page) || 1), PER_PAGE)

    return inertia.render('admin/students/index', {
      filters,
      attempts: AttemptTransformer.paginate(attempts.all(), attempts.getMeta()),
    })
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
}
