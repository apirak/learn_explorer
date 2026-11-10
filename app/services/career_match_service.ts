import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Answer, { MAX_GAP_MS } from '#models/answer'
import Attempt from '#models/attempt'
import CareerMatch from '#models/career_match'
import content from '#services/content_service'
import { matchOccupations } from '#services/scoring_service'

/**
 * Stores an attempt's career matches and test time from its latest scores (ADR 0005), so admin
 * pages and the export read them instead of recomputing.
 */
export class CareerMatchService {
  /** Attempts the backfill fills in per press, so one request never runs long (ADR 0005). */
  static readonly BACKFILL_BATCH = 500

  /** Complete attempts (every answer in), the only ones that can be scored. */
  static complete() {
    return Attempt.query().has('answers', '>=', content.forms.mini.ids.length)
  }

  /** Complete attempts never scored since matches were stored: any desired career or status. */
  static pending() {
    return this.complete().whereNull('matchedAt')
  }

  static async pendingCount() {
    const [row] = await this.pending().count('* as total')
    return Number(row.$extras.total)
  }

  /**
   * Scores and stores up to `BACKFILL_BATCH` pending attempts, oldest first, with the content
   * deployed now (`CONTENT_VERSION`), not the version each student took. Returns how many it
   * processed and how many are still pending. Done attempts, invalid profiles included, have
   * `matched_at` and are never picked again.
   */
  static async backfill() {
    const batch = await this.pending()
      .orderBy('createdAt', 'asc')
      .orderBy('id', 'asc')
      .limit(this.BACKFILL_BATCH)
    for (const attempt of batch) await this.record(attempt)
    return { processed: batch.length, remaining: await this.pendingCount() }
  }

  /**
   * Scores the attempt and replaces its stored matches, test time and `matched_at`; also saves
   * the scores. Returns the scores with the matches it stored, or null (nothing stored) until
   * every answer is in. An invalid profile stores no matches but is still marked computed.
   */
  static async record(attempt: Attempt) {
    return db.transaction(async (trx) => {
      // Locks the attempt first, then reads its answers, so two opens at once cannot both
      // insert rank 1 or store matches from answers older than the last commit.
      await Attempt.query({ client: trx }).where('id', attempt.id).forUpdate().firstOrFail()
      attempt.useTransaction(trx)
      const scored = await attempt.score()
      if (!scored) return null
      const matches =
        scored.status === 'ok' ? matchOccupations(scored.scores, content.occupations) : []

      await CareerMatch.query({ client: trx }).where('attemptId', attempt.id).delete()
      await CareerMatch.createMany(
        matches.map((m, i) => ({
          attemptId: attempt.id,
          rank: i + 1,
          occupationCode: m.occupation.code,
          r: m.r,
        })),
        { client: trx }
      )
      attempt.testTimeMs = await this.testTime(attempt.id, trx)
      attempt.matchedAt = DateTime.now()
      await attempt.save()
      return { ...scored, matches }
    })
  }

  /**
   * Test time: the attempt's answer gaps summed, leaving out the first answer (no gap) and gaps
   * over 5 minutes, as the Report does (ADR 0001). Null when no gap counts.
   */
  private static async testTime(attemptId: number, client: TransactionClientContract) {
    const [row] = await Answer.query({ client })
      .where('attemptId', attemptId)
      .where('gapMs', '<=', MAX_GAP_MS)
      .sum('gap_ms as total')
    const total = row?.$extras.total
    return total === null || total === undefined ? null : Number(total)
  }
}
