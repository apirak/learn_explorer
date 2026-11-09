import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'attempts'

  /**
   * When the student first opened the five-careers list (`/careers`). Not a step: the Career
   * step is opening one career's page. The denominator of the NPS response rate (ADR 0004).
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('careers_viewed_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('careers_viewed_at')
    })
  }
}
