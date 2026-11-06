import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    attempts: {
      columns: {
        furthest_step: {
          tsType: `'test' | 'result' | 'career' | 'mypath'`,
          decorators: [{ name: '@column' }],
        },
      },
    },
  },
} satisfies SchemaRules
