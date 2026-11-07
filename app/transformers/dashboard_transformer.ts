import { type DashboardSummary } from '#services/dashboard_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** Funnel and contact counts only; no codes or contact data [DP-001]. */
export default class DashboardTransformer extends BaseTransformer<DashboardSummary> {
  toObject() {
    return this.pick(this.resource, [
      'steps',
      'contacts',
      'resultViews',
      'downloads',
      'generatedAt',
    ])
  }
}
