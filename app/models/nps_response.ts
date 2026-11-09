import { NpsResponseSchema } from '#database/schema'
import Attempt from '#models/attempt'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export type NpsGroup = 'detractor' | 'passive' | 'promoter'

/** NPS response: one per attempt, overwritten when the student changes the score. */
export default class NpsResponse extends NpsResponseSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>

  /** Standard NPS bands: 0–6 Detractor, 7–8 Passive, 9–10 Promoter. */
  static group(score: number): NpsGroup {
    return score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter'
  }
}
