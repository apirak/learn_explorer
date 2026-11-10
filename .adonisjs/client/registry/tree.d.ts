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
    nps: {
      store: typeof routes['student.nps.store']
    }
    career: typeof routes['student.career'] & {
      save: typeof routes['student.career.save']
    }
    printPrep: typeof routes['student.print_prep'] & {
      download: typeof routes['student.print_prep.download']
      print: typeof routes['student.print_prep.print']
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
    report: typeof routes['admin.report'] & {
      nps: typeof routes['admin.report.nps']
    }
    students: {
      index: typeof routes['admin.students.index']
      export: typeof routes['admin.students.export']
      dictionary: typeof routes['admin.students.dictionary']
      show: typeof routes['admin.students.show']
      destroy: typeof routes['admin.students.destroy']
    }
    careerMatches: {
      index: typeof routes['admin.career_matches.index']
      backfill: typeof routes['admin.career_matches.backfill']
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
