import { DateTime } from 'luxon'
import Attempt, { STEPS, type Step } from '#models/attempt'
import StudentContact from '#models/student_contact'
import { REPORT_ZONE } from '#services/report_service'

export type DashboardSummary = Awaited<ReturnType<typeof DashboardService.summary>>

/** Dashboard date filters: today (Bangkok), the last N days, or every attempt still stored. */
export const RANGES = ['today', '7', '30', '60', 'all'] as const
export type Range = (typeof RANGES)[number]

/** Funnel counts for the admin dashboard. Counts only, never codes or contact data [DP-001]. */
export class DashboardService {
  /** Attempts started since midnight Bangkok time, within `range` days of now, or all of them. */
  static async summary(range: Range) {
    const recentAttempts = Attempt.query()
    if (range === 'today') {
      recentAttempts.where(
        'createdAt',
        '>=',
        DateTime.now().setZone(REPORT_ZONE).startOf('day').toSQL()!
      )
    } else if (range !== 'all') {
      recentAttempts.where(
        'createdAt',
        '>=',
        DateTime.now()
          .minus({ days: Number(range) })
          .toSQL()!
      )
    }

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

    const contactRows = await StudentContact.query()
      .whereIn('attemptId', recentAttempts.clone().select('id'))
      .select('source')
      .groupBy('source')
      .count('* as total')
    const contacts = { contact: 0, print_prep: 0 }
    for (const row of contactRows) contacts[row.source] = Number(row.$extras.total)

    return {
      steps,
      contacts,
      resultViews: Number(totals.$extras.resultViews),
      downloads: Number(totals.$extras.downloads),
      generatedAt: DateTime.now().toISO()!,
    }
  }
}
