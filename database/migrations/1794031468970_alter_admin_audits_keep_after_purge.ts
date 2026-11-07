import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admin_audits'

  /**
   * Keep the audit trail when a purge deletes its attempt (#14, owner's decision):
   * `attempt_id` becomes null instead of the row being deleted. Who viewed, and when, stays.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('attempt_id')
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('attempt_id').unsigned().nullable().alter()
      table.foreign('attempt_id').references('id').inTable('attempts').onDelete('SET NULL')
    })
  }

  async down() {
    // Rows of purged attempts cannot go back to NOT NULL.
    this.defer(async (db) => {
      await db.from(this.tableName).whereNull('attempt_id').delete()
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('attempt_id')
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('attempt_id').unsigned().notNullable().alter()
      table.foreign('attempt_id').references('id').inTable('attempts').onDelete('CASCADE')
    })
  }
}
