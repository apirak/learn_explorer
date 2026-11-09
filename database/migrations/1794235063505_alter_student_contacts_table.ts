import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'student_contacts'

  /** The name or nickname the student gives for themself. Optional; personal data [DP-001]. */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name', 100).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('name')
    })
  }
}
