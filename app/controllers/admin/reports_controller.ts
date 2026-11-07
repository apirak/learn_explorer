import { DateTime } from 'luxon'
import { REPORT_ZONE, ReportService } from '#services/report_service'
import { RetentionService } from '#services/retention_service'
import ReportTransformer from '#transformers/report_transformer'
import type { HttpContext } from '@adonisjs/core/http'

/** Admin report over a cohort of Bangkok dates. Kept apart from the live dashboard (ADR 0002). */
export default class ReportsController {
  async show({ inertia, request }: HttpContext) {
    // A missing or bad date falls back instead of an error page, like the dashboard range.
    const date = (input: unknown) => {
      const parsed = DateTime.fromISO(String(input ?? ''), { zone: REPORT_ZONE })
      return parsed.isValid ? parsed : null
    }
    // Kept within [oldest, today]: nothing past retention, nothing in the future.
    const today = DateTime.now().setZone(REPORT_ZONE).startOf('day')
    const retentionDays = await RetentionService.days()
    const oldest = today.minus({ days: retentionDays })
    const clamp = (d: DateTime) => DateTime.max(oldest, DateTime.min(today, d))
    const qs = request.qs()
    const to = clamp(date(qs.to) ?? today)
    const from = clamp(date(qs.from) ?? to)
    const start = from > to ? to : from

    return inertia.render('admin/report', {
      from: start.toISODate()!,
      to: to.toISODate()!,
      today: today.toISODate()!,
      retentionDays,
      report: ReportTransformer.transform(await ReportService.build(start, to)),
    })
  }
}
