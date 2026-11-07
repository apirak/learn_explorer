import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  /** App-wide settings. One row only: `id` is always 1. The service creates it on first read. */
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('id').primary().checkBetween([1, 1])
      table.integer('retention_days').notNullable().defaultTo(60).checkBetween([1, 3650])

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
