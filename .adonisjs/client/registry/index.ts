/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'student.home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [[0,"/"]],
    types: placeholder as Registry['student.home']['types'],
  },
  'student.start': {
    methods: ["POST"],
    pattern: '/attempts',
    tokens: [[0,"attempts"]],
    types: placeholder as Registry['student.start']['types'],
  },
  'student.test.show': {
    methods: ["GET","HEAD"],
    pattern: '/test',
    tokens: [[0,"test"]],
    types: placeholder as Registry['student.test.show']['types'],
  },
  'student.test.answer': {
    methods: ["POST"],
    pattern: '/test/answers',
    tokens: [[0,"test"],[0,"answers"]],
    types: placeholder as Registry['student.test.answer']['types'],
  },
  'student.result': {
    methods: ["GET","HEAD"],
    pattern: '/result',
    tokens: [[0,"result"]],
    types: placeholder as Registry['student.result']['types'],
  },
  'student.contact': {
    methods: ["GET","HEAD"],
    pattern: '/contact',
    tokens: [[0,"contact"]],
    types: placeholder as Registry['student.contact']['types'],
  },
  'student.contact.store': {
    methods: ["POST"],
    pattern: '/contact',
    tokens: [[0,"contact"]],
    types: placeholder as Registry['student.contact.store']['types'],
  },
  'student.careers': {
    methods: ["GET","HEAD"],
    pattern: '/careers',
    tokens: [[0,"careers"]],
    types: placeholder as Registry['student.careers']['types'],
  },
  'student.nps.store': {
    methods: ["POST"],
    pattern: '/careers/nps',
    tokens: [[0,"careers"],[0,"nps"]],
    types: placeholder as Registry['student.nps.store']['types'],
  },
  'student.career': {
    methods: ["GET","HEAD"],
    pattern: '/careers/:code',
    tokens: [[0,"careers"],[1,"code"]],
    types: placeholder as Registry['student.career']['types'],
  },
  'student.career.save': {
    methods: ["POST"],
    pattern: '/careers/:code/save',
    tokens: [[0,"careers"],[1,"code"],[0,"save"]],
    types: placeholder as Registry['student.career.save']['types'],
  },
  'student.print_prep': {
    methods: ["GET","HEAD"],
    pattern: '/print-prep',
    tokens: [[0,"print-prep"]],
    types: placeholder as Registry['student.print_prep']['types'],
  },
  'student.print_prep.download': {
    methods: ["POST"],
    pattern: '/print-prep/download',
    tokens: [[0,"print-prep"],[0,"download"]],
    types: placeholder as Registry['student.print_prep.download']['types'],
  },
  'student.print_prep.print': {
    methods: ["GET","HEAD"],
    pattern: '/print-prep/print',
    tokens: [[0,"print-prep"],[0,"print"]],
    types: placeholder as Registry['student.print_prep.print']['types'],
  },
  'health': {
    methods: ["GET","HEAD"],
    pattern: '/health',
    tokens: [[0,"health"]],
    types: placeholder as Registry['health']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [[0,"signup"]],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [[0,"signup"]],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['session.store']['types'],
  },
  'account.show': {
    methods: ["GET","HEAD"],
    pattern: '/account',
    tokens: [[0,"account"]],
    types: placeholder as Registry['account.show']['types'],
  },
  'account.profile': {
    methods: ["PUT"],
    pattern: '/account/profile',
    tokens: [[0,"account"],[0,"profile"]],
    types: placeholder as Registry['account.profile']['types'],
  },
  'account.password': {
    methods: ["PUT"],
    pattern: '/account/password',
    tokens: [[0,"account"],[0,"password"]],
    types: placeholder as Registry['account.password']['types'],
  },
  'account.destroy': {
    methods: ["DELETE"],
    pattern: '/account',
    tokens: [[0,"account"]],
    types: placeholder as Registry['account.destroy']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [[0,"logout"]],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'admin.dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/admin',
    tokens: [[0,"admin"]],
    types: placeholder as Registry['admin.dashboard']['types'],
  },
  'admin.report': {
    methods: ["GET","HEAD"],
    pattern: '/admin/report',
    tokens: [[0,"admin"],[0,"report"]],
    types: placeholder as Registry['admin.report']['types'],
  },
  'admin.report.nps': {
    methods: ["GET","HEAD"],
    pattern: '/admin/report/nps',
    tokens: [[0,"admin"],[0,"report"],[0,"nps"]],
    types: placeholder as Registry['admin.report.nps']['types'],
  },
  'admin.students.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/students',
    tokens: [[0,"admin"],[0,"students"]],
    types: placeholder as Registry['admin.students.index']['types'],
  },
  'admin.students.export': {
    methods: ["GET","HEAD"],
    pattern: '/admin/students/export',
    tokens: [[0,"admin"],[0,"students"],[0,"export"]],
    types: placeholder as Registry['admin.students.export']['types'],
  },
  'admin.students.dictionary': {
    methods: ["GET","HEAD"],
    pattern: '/admin/students/export/dictionary',
    tokens: [[0,"admin"],[0,"students"],[0,"export"],[0,"dictionary"]],
    types: placeholder as Registry['admin.students.dictionary']['types'],
  },
  'admin.students.show': {
    methods: ["GET","HEAD"],
    pattern: '/admin/students/:id',
    tokens: [[0,"admin"],[0,"students"],[1,"id"]],
    types: placeholder as Registry['admin.students.show']['types'],
  },
  'admin.students.destroy': {
    methods: ["DELETE"],
    pattern: '/admin/students/:id',
    tokens: [[0,"admin"],[0,"students"],[1,"id"]],
    types: placeholder as Registry['admin.students.destroy']['types'],
  },
  'admin.career_matches.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/career-matches',
    tokens: [[0,"admin"],[0,"career-matches"]],
    types: placeholder as Registry['admin.career_matches.index']['types'],
  },
  'admin.career_matches.backfill': {
    methods: ["POST"],
    pattern: '/admin/career-matches/backfill',
    tokens: [[0,"admin"],[0,"career-matches"],[0,"backfill"]],
    types: placeholder as Registry['admin.career_matches.backfill']['types'],
  },
  'admin.retention.show': {
    methods: ["GET","HEAD"],
    pattern: '/admin/retention',
    tokens: [[0,"admin"],[0,"retention"]],
    types: placeholder as Registry['admin.retention.show']['types'],
  },
  'admin.retention.update': {
    methods: ["PUT"],
    pattern: '/admin/retention',
    tokens: [[0,"admin"],[0,"retention"]],
    types: placeholder as Registry['admin.retention.update']['types'],
  },
  'admin.retention.purge': {
    methods: ["POST"],
    pattern: '/admin/retention/purge',
    tokens: [[0,"admin"],[0,"retention"],[0,"purge"]],
    types: placeholder as Registry['admin.retention.purge']['types'],
  },
  'admin.users.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/users',
    tokens: [[0,"admin"],[0,"users"]],
    types: placeholder as Registry['admin.users.index']['types'],
  },
  'admin.users.role': {
    methods: ["PUT"],
    pattern: '/admin/users/:id/role',
    tokens: [[0,"admin"],[0,"users"],[1,"id"],[0,"role"]],
    types: placeholder as Registry['admin.users.role']['types'],
  },
  'admin.users.transfer': {
    methods: ["POST"],
    pattern: '/admin/users/:id/transfer',
    tokens: [[0,"admin"],[0,"users"],[1,"id"],[0,"transfer"]],
    types: placeholder as Registry['admin.users.transfer']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
