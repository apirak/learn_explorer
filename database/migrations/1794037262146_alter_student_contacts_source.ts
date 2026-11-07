import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_contacts'

  /**
   * Which page the contact was left on: the `/contact` step before careers, or MyPath.
   * Rows before this migration all came from MyPath.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('source', 16).notNullable().defaultTo('mypath').checkIn(['contact', 'mypath'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('source')
    })
  }
}
