import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admin_audits'

  /** One row each time staff open a student's record. Survives the staff account's deletion. */
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('attempt_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('attempts')
        .onDelete('CASCADE')
        .index()
      table.string('action', 32).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
