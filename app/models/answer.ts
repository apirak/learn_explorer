import { DateTime } from 'luxon'
import { AnswerSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

const INT_MAX = 2_147_483_647

export default class Answer extends AnswerSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>

  /**
   * ponytail: read-then-insert without a lock. The answer queue sends one at a time, so only
   * two tabs on one attempt can measure from the same previous answer; lock the attempt if
   * that ever matters.
   *
   * Answer gap (ADR 0001): ms since this attempt's last answer was first saved. Set on insert
   * only, so changing an answer keeps it. The attempt's first answer has none.
   */
  @beforeCreate()
  static async setGap(answer: Answer) {
    answer.createdAt ??= DateTime.now()
    const [row] = await Answer.query()
      .where('attemptId', answer.attemptId)
      .max('created_at as last')
    const last = row?.$extras.last as Date | null
    // Capped to fit the int column (~24.8 days); anything near that is far past MAX_GAP_MS.
    answer.gapMs = last ? Math.min(answer.createdAt.toMillis() - last.getTime(), INT_MAX) : null
  }
}
