import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    admin_audits: {
      columns: {
        action: {
          tsType: `'view'`,
          decorators: [{ name: '@column' }],
        },
      },
    },
    users: {
      columns: {
        role: {
          tsType: `'owner' | 'admin' | 'member'`,
          decorators: [{ name: '@column' }],
        },
      },
    },
    student_contacts: {
      columns: {
        source: {
          tsType: `'contact' | 'print_prep'`,
          decorators: [{ name: '@column' }],
        },
      },
    },
    attempts: {
      columns: {
        furthest_step: {
          tsType: `'test' | 'result' | 'career' | 'print_prep'`,
          decorators: [{ name: '@column' }],
        },
        profile_status: {
          tsType: `'ok' | 'all-dislike' | 'flat'`,
          decorators: [{ name: '@column' }],
        },
      },
    },
  },
} satisfies SchemaRules
