import { DateTime } from 'luxon'
import Attempt, { type Step } from '#models/attempt'

/** Funnel counts for the admin dashboard. Counts only, never codes or contact data [DP-001]. */
export class DashboardService {
  /** Attempts started in the last 60 days, so the "60 วันล่าสุด" label holds with or without a purge. */
  static async summary() {
    const since = Attempt.query().where(
      'createdAt',
      '>=',
      DateTime.now().minus({ days: 60 }).toSQL()!
    )

    const rows = await since
      .clone()
      .select('furthestStep')
      .groupBy('furthestStep')
      .count('* as total')
    const steps: Record<Step, number> = { test: 0, result: 0, career: 0, mypath: 0 }
    for (const row of rows) steps[row.furthestStep] = Number(row.$extras.total)

    const [totals] = await since
      .clone()
      .count('result_at as resultViews')
      .count('downloaded_at as downloads')

    return {
      steps,
      resultViews: Number(totals.$extras.resultViews),
      downloads: Number(totals.$extras.downloads),
      generatedAt: DateTime.now().toISO()!,
    }
  }
}
