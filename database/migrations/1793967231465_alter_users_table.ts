import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('role', 10)
        .notNullable()
        .defaultTo('member')
        .checkIn(['owner', 'admin', 'member'])
      table.string('affiliation', 120).nullable()
    })

    // Accounts made before roles existed: the oldest becomes Owner, so the next
    // stranger to sign up does not.
    this.defer(async (db) => {
      const first = await db.from('users').orderBy('id').select('id').first()
      if (first) await db.from('users').where('id', first.id).update({ role: 'owner' })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role')
      table.dropColumn('affiliation')
    })
  }
}
