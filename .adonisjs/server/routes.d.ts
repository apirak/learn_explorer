import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'student.home': { paramsTuple?: []; params?: {} }
    'student.start': { paramsTuple?: []; params?: {} }
    'student.test.show': { paramsTuple?: []; params?: {} }
    'student.test.answer': { paramsTuple?: []; params?: {} }
    'student.result': { paramsTuple?: []; params?: {} }
    'student.careers': { paramsTuple?: []; params?: {} }
    'student.career': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'student.mypath': { paramsTuple?: []; params?: {} }
    'student.mypath.download': { paramsTuple?: []; params?: {} }
    'student.mypath.print': { paramsTuple?: []; params?: {} }
    'health': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'account.profile': { paramsTuple?: []; params?: {} }
    'account.password': { paramsTuple?: []; params?: {} }
    'account.destroy': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'admin.dashboard': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'student.home': { paramsTuple?: []; params?: {} }
    'student.test.show': { paramsTuple?: []; params?: {} }
    'student.result': { paramsTuple?: []; params?: {} }
    'student.careers': { paramsTuple?: []; params?: {} }
    'student.career': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'student.mypath': { paramsTuple?: []; params?: {} }
    'student.mypath.print': { paramsTuple?: []; params?: {} }
    'health': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'admin.dashboard': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'student.home': { paramsTuple?: []; params?: {} }
    'student.test.show': { paramsTuple?: []; params?: {} }
    'student.result': { paramsTuple?: []; params?: {} }
    'student.careers': { paramsTuple?: []; params?: {} }
    'student.career': { paramsTuple: [ParamValue]; params: {'code': ParamValue} }
    'student.mypath': { paramsTuple?: []; params?: {} }
    'student.mypath.print': { paramsTuple?: []; params?: {} }
    'health': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'admin.dashboard': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'student.start': { paramsTuple?: []; params?: {} }
    'student.test.answer': { paramsTuple?: []; params?: {} }
    'student.mypath.download': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'account.profile': { paramsTuple?: []; params?: {} }
    'account.password': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'account.destroy': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}