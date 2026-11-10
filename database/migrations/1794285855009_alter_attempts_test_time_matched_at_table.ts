import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attempts'

  /**
   * `test_time_ms`: the attempt's test time, its answer gaps summed without those over 5 minutes.
   * `matched_at`: when career matches and test time were last stored; null means never, which
   * tells "not computed" apart from an invalid profile that has no matches (ADR 0005).
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('test_time_ms').nullable()
      table.timestamp('matched_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('test_time_ms', 'matched_at')
    })
  }
}
