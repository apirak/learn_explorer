import { CONTENT_VERSION } from '#services/content_service'
import { CareerMatchService } from '#services/career_match_service'
import { REPORT_ZONE, ReportService } from '#services/report_service'
import CareerMatchRowTransformer from '#transformers/career_match_row_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

const PER_PAGE = 25
/** "Time over 1 minute": test time above this, in ms. */
const ONE_MINUTE_MS = 60 * 1000

/** `%`, `_` and `\` match themselves in an ILIKE pattern (Postgres's default escape is `\`). */
const escapeLike = (term: string) => term.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * The page's filters from the query string. A bad date or flag is ignored instead of an error
 * page, like the Students filters.
 */
function readFilters(qs: Record<string, unknown>) {
  const text = (input: unknown) => (typeof input === 'string' && input.trim() ? input.trim() : null)
  const date = (input: unknown) => {
    const parsed = DateTime.fromISO(String(input ?? ''), { zone: REPORT_ZONE })
    return parsed.isValid ? parsed.toISODate() : null
  }
  return {
    from: date(qs.from),
    to: date(qs.to),
    code: text(qs.code),
    overMinute: qs.overMinute === '1',
    consented: qs.consented === '1',
    q: text(qs.q),
  }
}

type CareerMatchFilters = ReturnType<typeof readFilters>

/** Finished attempts with a desired career, narrowed by the filters (all ANDed). */
function rows(filters: CareerMatchFilters) {
  const day = (iso: string | null) => (iso ? DateTime.fromISO(iso, { zone: REPORT_ZONE }) : null)
  return (
    ReportService.whereCohort(CareerMatchService.finished(), day(filters.from), day(filters.to))
      .whereNotNull('desiredCareer')
      .whereNot('desiredCareer', '')
      .if(filters.code, (q) => q.where('code', filters.code!))
      .if(filters.overMinute, (q) => q.where('testTimeMs', '>', ONE_MINUTE_MS))
      .if(filters.consented, (q) => q.has('contact'))
      .if(filters.q, (q) => q.whereILike('desiredCareer', `%${escapeLike(filters.q!)}%`))
      .preload('careerMatches', (q) => q.orderBy('rank'))
      // Only whether a contact exists; its details never reach this page [DP-001].
      .preload('contact', (q) => q.select('id', 'attemptId'))
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
  )
}

/**
 * Admin and above: each attempt's desired career beside its stored career matches (ADR 0005),
 * and a button that fills in matches for attempts scored before they were stored.
 */
export default class CareerMatchesController {
  async index({ inertia, request }: HttpContext) {
    const filters = readFilters(request.qs())
    const page = Math.max(1, Math.floor(Number(request.qs().page)) || 1)
    const attempts = await rows(filters).paginate(page, PER_PAGE)

    return inertia.render('admin/career_matches', {
      filters,
      pending: await CareerMatchService.pendingCount(),
      contentVersion: CONTENT_VERSION,
      attempts: CareerMatchRowTransformer.paginate(attempts.all(), attempts.getMeta()),
    })
  }

  /** `POST /admin/career-matches/backfill`: one batch, then back to the page with its filters. */
  async backfill({ auth, session, response, logger }: HttpContext) {
    const { processed, remaining } = await CareerMatchService.backfill()
    // The admin's id and counts only, never student data [DP-001].
    logger.info({ userId: auth.user!.id, processed, remaining }, 'career_matches_backfilled')
    session.flash('success', `คำนวณแล้ว ${processed} · เหลือ ${remaining}`)
    // `withQs()` carries the page's query string over, so its filters stay.
    return response.redirect().withQs().back()
  }
}
