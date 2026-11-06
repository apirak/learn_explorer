import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'career_views'

  /** One row per occupation a student opens, recorded once per attempt. */
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('attempt_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('attempts')
        .onDelete('CASCADE')
      table.string('occupation_code', 10).notNullable()
      table.unique(['attempt_id', 'occupation_code'])

      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
