import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attempts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.uuid('uuid').notNullable().unique()
      table.string('code', 64).nullable().index()
      table.string('desired_career', 100).nullable()
      table.string('content_version', 10).notNullable()
      table
        .string('furthest_step', 10)
        .notNullable()
        .defaultTo('test')
        .checkIn(['test', 'result', 'career', 'mypath'])
        .index()
      // Test entry time is created_at [M5]
      table.timestamp('result_at', { useTz: true }).nullable()
      table.timestamp('career_at', { useTz: true }).nullable()
      table.timestamp('mypath_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().index()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
