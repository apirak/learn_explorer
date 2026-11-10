import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'career_matches'

  /**
   * An attempt's career matches: the top occupations its latest scores matched, ranked 1–5.
   * Replaced whenever the attempt is scored again (ADR 0005).
   */
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
      table.smallint('rank').notNullable().checkBetween([1, 5])
      table.string('occupation_code', 10).notNullable()
      table.double('r').notNullable()
      table.unique(['attempt_id', 'rank'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
