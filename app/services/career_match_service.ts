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
  /**
   * Scores the attempt and replaces its stored matches, test time and `matched_at`; also saves
   * the scores. Returns the scores, or null (nothing stored) until every answer is in. An
   * invalid profile stores no matches but is still marked computed.
   */
  static async record(attempt: Attempt) {
    const scored = await attempt.score()
    if (!scored) return null
    const matches =
      scored.status === 'ok' ? matchOccupations(scored.scores, content.occupations) : []

    await db.transaction(async (trx) => {
      // Locks the attempt so two opens at once cannot both insert rank 1.
      await Attempt.query({ client: trx }).where('id', attempt.id).forUpdate().firstOrFail()
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
      attempt.useTransaction(trx)
      await attempt.save()
    })
    return scored
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
