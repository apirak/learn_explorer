import { DashboardService, RANGES, type Range } from '#services/dashboard_service'
import DashboardTransformer from '#transformers/dashboard_transformer'
import type { HttpContext } from '@adonisjs/core/http'

/** Admin funnel counts; the page re-fetches `summary` every 5 s. */
export default class DashboardController {
  async show({ inertia, request }: HttpContext) {
    // Opens on today; an unknown range falls back to today instead of an error page.
    const input = request.qs().range
    const range: Range = RANGES.includes(input) ? input : 'today'
    return inertia.render('admin/dashboard', {
      range,
      summary: async () => DashboardTransformer.transform(await DashboardService.summary(range)),
    })
  }
}
