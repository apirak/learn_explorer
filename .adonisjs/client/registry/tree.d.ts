/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  student: {
    home: typeof routes['student.home']
    start: typeof routes['student.start']
    test: {
      show: typeof routes['student.test.show']
      answer: typeof routes['student.test.answer']
    }
  }
  health: typeof routes['health']
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  dashboard: typeof routes['dashboard']
}
