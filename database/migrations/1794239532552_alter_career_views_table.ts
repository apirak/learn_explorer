import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'career_views'

  /** Career save: when the student first pressed save on this career's page. Null until then. */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('saved_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('saved_at')
    })
  }
}
