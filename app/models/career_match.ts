import { CareerMatchSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/** One of an attempt's career matches, ranked 1–5 (ADR 0005). */
export default class CareerMatch extends CareerMatchSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>
}
