import { DateTime } from 'luxon'
import { AnswerSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Answer extends AnswerSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>

  /**
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
    answer.gapMs = last ? answer.createdAt.toMillis() - last.getTime() : null
  }
}
