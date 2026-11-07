import { RetentionService } from '#services/retention_service'
import { retentionValidator } from '#validators/retention'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Admin and Owner: set how many days student data is kept, and purge by hand.
 * The app never deletes on its own; the banner on admin pages says when data is due.
 */
export default class RetentionController {
  async show({ inertia }: HttpContext) {
    // The count of attempts due comes from the `retentionDue` shared prop, like the banner.
    return inertia.render('admin/retention', { retentionDays: await RetentionService.days() })
  }

  async update({ request, session, response }: HttpContext) {
    const { retentionDays } = await request.validateUsing(retentionValidator)
    await RetentionService.setDays(retentionDays)
    session.flash('success', 'Retention period saved')
    return response.redirect().toRoute('admin.retention.show')
  }

  async purge({ auth, session, response, logger }: HttpContext) {
    const retentionDays = await RetentionService.days()
    const deleted = await RetentionService.purge(retentionDays)
    // Counts, the period and the admin's id only, never student data [DP-001].
    logger.info({ deleted, retentionDays, userId: auth.user!.id }, 'purge_completed')
    session.flash('success', `Deleted ${deleted} attempts`)
    return response.redirect().toRoute('admin.retention.show')
  }
}
