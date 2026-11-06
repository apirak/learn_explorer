import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'answers'

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
      table.string('item_id', 4).notNullable()
      table.smallint('value').notNullable().checkBetween([0, 4])
      table.unique(['attempt_id', 'item_id'])

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
