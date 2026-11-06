import { CareerViewSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CareerView extends CareerViewSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>
}
