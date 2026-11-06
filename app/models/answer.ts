import { AnswerSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Answer extends AnswerSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>
}
