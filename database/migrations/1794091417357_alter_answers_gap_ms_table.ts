import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'answers'

  /**
   * Answer gap: ms since the attempt's previous answer was first saved, set once on insert
   * (ADR 0001). Null for an attempt's first answer and for rows saved before this column.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('gap_ms').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('gap_ms')
    })
  }
}
