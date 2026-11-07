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
  'student.careers': {
    methods: ["GET","HEAD"],
    pattern: '/careers',
    tokens: [[0,"careers"]],
    types: placeholder as Registry['student.careers']['types'],
  },
  'student.career': {
    methods: ["GET","HEAD"],
    pattern: '/careers/:code',
    tokens: [[0,"careers"],[1,"code"]],
    types: placeholder as Registry['student.career']['types'],
  },
  'student.mypath': {
    methods: ["GET","HEAD"],
    pattern: '/mypath',
    tokens: [[0,"mypath"]],
    types: placeholder as Registry['student.mypath']['types'],
  },
  'student.mypath.download': {
    methods: ["POST"],
    pattern: '/mypath/download',
    tokens: [[0,"mypath"],[0,"download"]],
    types: placeholder as Registry['student.mypath.download']['types'],
  },
  'student.mypath.print': {
    methods: ["GET","HEAD"],
    pattern: '/mypath/print',
    tokens: [[0,"mypath"],[0,"print"]],
    types: placeholder as Registry['student.mypath.print']['types'],
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
