import { StudentContactSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/** Phone and email a student left with consent. Personal data of a minor [DP-001]. */
export default class StudentContact extends StudentContactSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>
}
