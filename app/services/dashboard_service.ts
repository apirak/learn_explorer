import { DateTime } from 'luxon'
import Attempt, { STEPS, type Step } from '#models/attempt'

export type DashboardSummary = Awaited<ReturnType<typeof DashboardService.summary>>

/** Funnel counts for the admin dashboard. Counts only, never codes or contact data [DP-001]. */
export class DashboardService {
  /** Attempts started in the last 60 days, so the "60 วันล่าสุด" label holds with or without a purge. */
  static async summary() {
    const recentAttempts = Attempt.query().where(
      'createdAt',
      '>=',
      DateTime.now().minus({ days: 60 }).toSQL()!
    )

    const rows = await recentAttempts
      .clone()
      .select('furthestStep')
      .groupBy('furthestStep')
      .count('* as total')
    const steps = Object.fromEntries(STEPS.map((s) => [s, 0])) as Record<Step, number>
    for (const row of rows) steps[row.furthestStep] = Number(row.$extras.total)

    // count() takes raw column names, not model keys.
    const [totals] = await recentAttempts
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
