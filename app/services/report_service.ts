import type { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Attempt, { NO_CODE_PREFIX } from '#models/attempt'
import NpsResponse, { type NpsGroup } from '#models/nps_response'
import StudentContact from '#models/student_contact'
import content from '#services/content_service'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type AttemptQuery = ModelQueryBuilderContract<typeof Attempt>

export type ReportData = Awaited<ReturnType<typeof ReportService.build>>

export type FunnelStep = 'start' | 'testComplete' | 'result' | 'career' | 'mypath' | 'download'

export const REPORT_ZONE = 'Asia/Bangkok'

/** Answer gaps over this are "left and came back", not thinking (ADR 0001). */
export const MAX_GAP_MS = 5 * 60 * 1000
/** Lower edges (ms) of the answer-gap buckets after the first: <1s, 1–10s, …, 50–60s, ≥60s. */
const GAP_EDGES_MS = [1, 10, 20, 30, 40, 50, 60].map((s) => s * 1000)
const GAP_LABELS = ['<1', '1–10', '10–20', '20–30', '30–40', '40–50', '50–60', '≥60']

/** Rounds halves away from zero, so −12.5 → −13 like +12.5 → 13 (`Math.round` gives −12). */
const roundHalfAway = (n: number) => Math.sign(n) * Math.round(Math.abs(n))

/**
 * Report figures for a cohort: the attempts started between two Bangkok dates, inclusive.
 * Counts only, never codes or contact data [DP-001].
 */
export class ReportService {
  /** The attempts started between two Bangkok dates, inclusive. */
  static cohort(from: DateTime, to: DateTime) {
    const start = from.setZone(REPORT_ZONE).startOf('day')
    const end = to.setZone(REPORT_ZONE).plus({ days: 1 }).startOf('day')
    return () =>
      Attempt.query().where('createdAt', '>=', start.toSQL()!).where('createdAt', '<', end.toSQL()!)
  }

  static async build(from: DateTime, to: DateTime) {
    const cohort = this.cohort(from, to)

    const [totals, answered, gaps, contacts, nps] = await Promise.all([
      this.totals(cohort),
      this.answeredCounts(cohort().select('id')),
      this.gaps(cohort().select('id')),
      this.contacts(cohort().select('id')),
      this.npsScores(cohort().select('id')),
    ])

    const total = content.forms.mini.ids.length
    let testComplete = 0
    const incomplete = { total: 0, none: 0, buckets: Array<number>(10).fill(0) }
    for (const [count, attempts] of answered) {
      if (count >= total) testComplete += attempts
      else {
        incomplete.total += attempts
        if (count === 0) incomplete.none += attempts
        else incomplete.buckets[Math.floor((count * 10) / total)] += attempts
      }
    }

    return {
      itemTotal: total,
      totals: { students: totals.students, attempts: totals.attempts, campaign: totals.campaign },
      funnel: [
        { step: 'start', count: totals.attempts },
        { step: 'testComplete', count: testComplete },
        { step: 'result', count: totals.result },
        { step: 'career', count: totals.career },
        { step: 'mypath', count: totals.mypath },
        { step: 'download', count: totals.download },
      ] satisfies { step: FunnelStep; count: number }[],
      contacts,
      incomplete,
      gaps: GAP_LABELS.map((label, i) => ({ label, count: gaps.get(i) ?? 0 })),
      nps: this.npsSummary(nps, totals.careersViewed),
    }
  }

  /**
   * NPS = % Promoters − % Detractors, rounded; null with no responses. The response rate is over
   * the attempts that opened the careers list, where the form is (ADR 0004).
   */
  private static npsSummary(
    rows: { score: number; total: number; comments: number }[],
    careersViewed: number
  ) {
    const scores = Array<number>(11).fill(0)
    const groups: Record<NpsGroup, number> = { detractor: 0, passive: 0, promoter: 0 }
    let responses = 0
    let comments = 0
    for (const row of rows) {
      scores[row.score] = row.total
      groups[NpsResponse.group(row.score)] += row.total
      responses += row.total
      comments += row.comments
    }
    return {
      score: responses
        ? roundHalfAway(((groups.promoter - groups.detractor) / responses) * 100)
        : null,
      responses,
      careersViewed,
      comments,
      groups,
      scores,
    }
  }

  /** NPS responses per score, with how many carry a comment. */
  private static async npsScores(ids: AttemptQuery) {
    const rows = await NpsResponse.query()
      .whereIn('attemptId', ids)
      .select('score')
      .count('* as total')
      .count('comment as comments')
      .groupBy('score')
    return rows.map((r) => ({
      score: r.score,
      total: Number(r.$extras.total),
      comments: Number(r.$extras.comments),
    }))
  }

  private static async totals(cohort: () => AttemptQuery) {
    // count() takes raw column names, not model keys.
    const [steps] = await cohort()
      .count('* as attempts')
      .count('result_at as result')
      .count('career_at as career')
      .count('mypath_at as mypath')
      .count('downloaded_at as download')
      .count('careers_viewed_at as careers_viewed')
    const [coded] = await cohort().countDistinct('code as total')
    const [uncoded] = await cohort().whereNull('code').count('* as total')
    const [campaign] = await cohort()
      .whereNotNull('code')
      .whereNot('code', 'like', `${NO_CODE_PREFIX}%`)
      .countDistinct('code as total')

    const n = (row: Attempt, key: string) => Number(row.$extras[key])
    return {
      attempts: n(steps, 'attempts'),
      result: n(steps, 'result'),
      career: n(steps, 'career'),
      mypath: n(steps, 'mypath'),
      download: n(steps, 'download'),
      careersViewed: n(steps, 'careers_viewed'),
      // An attempt without a code is a student on its own (GLOSSARY: Student).
      students: n(coded, 'total') + n(uncoded, 'total'),
      campaign: n(campaign, 'total'),
    }
  }

  /** How many attempts answered each number of items: Map<answered, attempts>. */
  private static async answeredCounts(ids: AttemptQuery) {
    const perAttempt = db
      .from('attempts')
      .leftJoin('answers', 'answers.attempt_id', 'attempts.id')
      .whereIn('attempts.id', ids)
      .groupBy('attempts.id')
      .count('answers.id as answered')
      .as('per_attempt')
    const rows = await db
      .from(perAttempt)
      .select('answered')
      .count('* as attempts')
      .groupBy('answered')
    return new Map(rows.map((r) => [Number(r.answered), Number(r.attempts)]))
  }

  /** Answer gaps per bucket index, first answers and gaps over 5 minutes left out. */
  private static async gaps(ids: AttemptQuery) {
    const rows = await db
      .from('answers')
      .whereIn('attempt_id', ids)
      .whereNotNull('gap_ms')
      .where('gap_ms', '<=', MAX_GAP_MS)
      // width_bucket gives 0 below the first edge, i for [edge i-1, edge i), 7 for ≥60 s.
      .select(db.raw('width_bucket(gap_ms, ?::int[]) as bucket', [GAP_EDGES_MS]))
      .count('* as total')
      .groupBy('bucket')
    return new Map(rows.map((r) => [Number(r.bucket), Number(r.total)]))
  }

  private static async contacts(ids: AttemptQuery) {
    const rows = await StudentContact.query()
      .whereIn('attemptId', ids)
      .select('source')
      .groupBy('source')
      .count('* as total')
    const contacts = { contact: 0, mypath: 0 }
    for (const row of rows) contacts[row.source] = Number(row.$extras.total)
    return contacts
  }
}
