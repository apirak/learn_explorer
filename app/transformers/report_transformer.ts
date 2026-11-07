import { type ReportData } from '#services/report_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** Counts only; no codes or contact data [DP-001]. */
export default class ReportTransformer extends BaseTransformer<ReportData> {
  toObject() {
    return this.pick(this.resource, ['totals', 'funnel', 'contacts', 'incomplete', 'gaps'])
  }
}
