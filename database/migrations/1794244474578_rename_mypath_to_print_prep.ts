import { BaseSchema } from '@adonisjs/lucid/schema'

const OLD = 'mypath'
const NEW = 'print_prep'

/**
 * The page before the printable result is "Print prep", not MyPath: MyPath is the future
 * study-plan feature, which will not live on this page. Renames the step, its `*_at` column
 * and the contact source, moving existing rows across.
 */
export default class extends BaseSchema {
  async up() {
    this.rename(OLD, NEW)
  }

  async down() {
    this.rename(NEW, OLD)
  }

  private rename(from: string, to: string) {
    this.schema.alterTable('attempts', (table) => {
      table.dropChecks(['attempts_furthest_step_check'])
      table.renameColumn(`${from}_at`, `${to}_at`)
    })
    this.schema.alterTable('student_contacts', (table) => {
      table.dropChecks(['student_contacts_source_check'])
    })

    this.defer(async (db) => {
      await db.from('attempts').where('furthest_step', from).update({ furthest_step: to })
      await db.from('student_contacts').where('source', from).update({ source: to })
    })

    // `table.check` sends DDL without bindings, so the constant values are written inline.
    this.schema.alterTable('attempts', (table) => {
      table.check(
        `furthest_step in ('test', 'result', 'career', '${to}')`,
        [],
        'attempts_furthest_step_check'
      )
    })
    this.schema.alterTable('student_contacts', (table) => {
      table.string('source', 16).notNullable().defaultTo(to).alter()
      table.check(`source in ('contact', '${to}')`, [], 'student_contacts_source_check')
    })
  }
}
