import { BaseSchema } from '@adonisjs/lucid/schema'

const SCORES = ['score_r', 'score_i', 'score_a', 'score_s', 'score_e', 'score_c']

export default class extends BaseSchema {
  protected tableName = 'attempts'

  /** Written on every `GET /result` from the current answers [M1]. Null until then. */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      for (const column of SCORES) table.smallint(column).nullable().checkBetween([0, 40])
      table.string('interest_code', 3).nullable()
      table.string('profile_status', 12).nullable().checkIn(['ok', 'all-dislike', 'flat'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns(...SCORES, 'interest_code', 'profile_status')
    })
  }
}
