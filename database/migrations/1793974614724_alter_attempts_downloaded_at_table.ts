import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attempts'

  /** The first time the student tapped Download. No counter [N5]. */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('downloaded_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('downloaded_at')
    })
  }
}
