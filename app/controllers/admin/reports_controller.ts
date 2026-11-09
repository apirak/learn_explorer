import NpsResponse, { type NpsGroup } from '#models/nps_response'
import { REPORT_ZONE, ReportService } from '#services/report_service'
import { RetentionService } from '#services/retention_service'
import NpsCommentTransformer from '#transformers/nps_comment_transformer'
import ReportTransformer from '#transformers/report_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const COMMENTS_PER_PAGE = 50
const NPS_GROUPS: NpsGroup[] = ['detractor', 'passive', 'promoter']
/** Score bounds of each band, inclusive. */
const GROUP_SCORES: Record<NpsGroup, [number, number]> = {
  detractor: [0, 6],
  passive: [7, 8],
  promoter: [9, 10],
}

/**
 * The report's date range from `?from=&to=`. A missing or bad date falls back instead of an
 * error page, like the dashboard range, and is kept within [oldest, today]: nothing past
 * retention, nothing in the future.
 */
async function readRange(qs: Record<string, unknown>) {
  const date = (input: unknown) => {
    const parsed = DateTime.fromISO(String(input ?? ''), { zone: REPORT_ZONE })
    return parsed.isValid ? parsed : null
  }
  const today = DateTime.now().setZone(REPORT_ZONE).startOf('day')
  const retentionDays = await RetentionService.days()
  const oldest = today.minus({ days: retentionDays })
  const clamp = (d: DateTime) => DateTime.max(oldest, DateTime.min(today, d))
  const to = clamp(date(qs.to) ?? today)
  const from = clamp(date(qs.from) ?? to)
  return { from: from > to ? to : from, to, today, retentionDays }
}

/** Admin report over a cohort of Bangkok dates. Kept apart from the live dashboard (ADR 0002). */
export default class ReportsController {
  async show({ inertia, request }: HttpContext) {
    const { from, to, today, retentionDays } = await readRange(request.qs())

    return inertia.render('admin/report', {
      from: from.toISODate()!,
      to: to.toISODate()!,
      today: today.toISODate()!,
      retentionDays,
      report: ReportTransformer.transform(await ReportService.build(from, to)),
    })
  }

  /**
   * `GET /admin/report/nps`: NPS comments of the same cohort as the report, newest first,
   * optionally one band. An unknown band is ignored. Never linked to a student [DP-001].
   */
  async nps({ inertia, request }: HttpContext) {
    const qs = request.qs()
    const { from, to } = await readRange(qs)
    const group = NPS_GROUPS.includes(qs.group) ? (qs.group as NpsGroup) : null

    const comments = await NpsResponse.query()
      .whereIn('attemptId', ReportService.cohort(from, to)().select('id'))
      .whereNotNull('comment')
      .if(group, (q) => q.whereBetween('score', GROUP_SCORES[group!]))
      .orderBy('sentAt', 'desc')
      .orderBy('id', 'desc')
      .paginate(Math.max(1, Number(qs.page) || 1), COMMENTS_PER_PAGE)

    return inertia.render('admin/nps', {
      from: from.toISODate()!,
      to: to.toISODate()!,
      group,
      comments: NpsCommentTransformer.paginate(comments.all(), comments.getMeta()),
    })
  }
}
