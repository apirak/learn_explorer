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
    result: typeof routes['student.result']
    contact: typeof routes['student.contact'] & {
      store: typeof routes['student.contact.store']
    }
    careers: typeof routes['student.careers']
    career: typeof routes['student.career']
    mypath: typeof routes['student.mypath'] & {
      download: typeof routes['student.mypath.download']
      print: typeof routes['student.mypath.print']
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
  account: {
    show: typeof routes['account.show']
    profile: typeof routes['account.profile']
    password: typeof routes['account.password']
    destroy: typeof routes['account.destroy']
  }
  admin: {
    dashboard: typeof routes['admin.dashboard']
    report: typeof routes['admin.report']
    students: {
      index: typeof routes['admin.students.index']
      show: typeof routes['admin.students.show']
      destroy: typeof routes['admin.students.destroy']
    }
    retention: {
      show: typeof routes['admin.retention.show']
      update: typeof routes['admin.retention.update']
      purge: typeof routes['admin.retention.purge']
    }
    users: {
      index: typeof routes['admin.users.index']
      role: typeof routes['admin.users.role']
      transfer: typeof routes['admin.users.transfer']
    }
  }
}
