import { DashboardService } from '#services/dashboard_service'
import type { HttpContext } from '@adonisjs/core/http'

/** Admin funnel counts; the page re-fetches `summary` every 5 s. */
export default class DashboardController {
  async show({ inertia }: HttpContext) {
    return inertia.render('admin/dashboard', { summary: () => DashboardService.summary() })
  }
}
