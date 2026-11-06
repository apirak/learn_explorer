import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_contacts'

  /** Phone and email a student left on MyPath. A row exists only with consent [DP-001]. */
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
      table.string('phone', 10).nullable()
      table.string('email', 254).nullable()
      table.timestamp('consent_at', { useTz: true }).notNullable()
      table.string('consent_version', 64).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
