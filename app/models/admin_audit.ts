import { AdminAuditSchema } from '#database/schema'
import Attempt from '#models/attempt'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/** Who opened which student record, and when [DP-001]. */
export default class AdminAudit extends AdminAuditSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>
}
