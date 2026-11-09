import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nps_responses'

  /**
   * NPS response: one 0–10 score per attempt, saved on tap, and an optional comment typed by
   * the student (never logged [DP-001]). `sent_at` is set when they press ส่ง, with or without a
   * comment; the careers page then shows thanks. Deleted with its attempt by the retention purge.
   */
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('attempt_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('attempts')
        .onDelete('CASCADE')
      table.smallint('score').notNullable().checkBetween([0, 10])
      table.string('comment', 500).nullable()
      table.timestamp('sent_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
