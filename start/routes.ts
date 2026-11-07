/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('/', [controllers.StudentHome, 'show']).as('home')
    router.post('attempts', [controllers.StudentHome, 'start']).as('start')
  })
  .as('student')
  .use(middleware.studentAttempt())

router
  .group(() => {
    router.get('test', [controllers.StudentTest, 'show']).as('test.show')
    router.post('test/answers', [controllers.StudentTest, 'answer']).as('test.answer')
    router.get('result', [controllers.StudentResult, 'show']).as('result')
    router.get('contact', [controllers.StudentContacts, 'show']).as('contact')
    router.post('contact', [controllers.StudentContacts, 'store']).as('contact.store')
    router.get('careers', [controllers.StudentResult, 'careers']).as('careers')
    router.get('careers/:code', [controllers.StudentCareers, 'show']).as('career')
    router.get('mypath', [controllers.StudentMypath, 'show']).as('mypath')
    router.post('mypath/download', [controllers.StudentMypath, 'download']).as('mypath.download')
    router.get('mypath/print', [controllers.StudentMypath, 'print']).as('mypath.print')
  })
  .as('student')
  .use(middleware.studentAttempt({ required: true }))
router.get('/health', [controllers.HealthChecks]).as('health')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.get('account', [controllers.Account, 'show']).as('account.show')
    router.put('account/profile', [controllers.Account, 'updateProfile']).as('account.profile')
    router.put('account/password', [controllers.Account, 'updatePassword']).as('account.password')
    router.delete('account', [controllers.Account, 'destroy']).as('account.destroy')
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [controllers.admin.Dashboard, 'show']).as('dashboard')
    router.get('report', [controllers.admin.Reports, 'show']).as('report')
    router.get('students', [controllers.admin.Students, 'index']).as('students.index')
    router.get('students/export', [controllers.admin.Students, 'export']).as('students.export')
    router
      .get('students/export/dictionary', [controllers.admin.Students, 'dictionary'])
      .as('students.dictionary')
    router
      .get('students/:id', [controllers.admin.Students, 'show'])
      .where('id', router.matchers.number())
      .as('students.show')
    router
      .delete('students/:id', [controllers.admin.Students, 'destroy'])
      .where('id', router.matchers.number())
      .as('students.destroy')
    router.get('retention', [controllers.admin.Retention, 'show']).as('retention.show')
    router.put('retention', [controllers.admin.Retention, 'update']).as('retention.update')
    router.post('retention/purge', [controllers.admin.Retention, 'purge']).as('retention.purge')

    router
      .group(() => {
        router.get('users', [controllers.admin.Users, 'index']).as('users.index')
        router
          .put('users/:id/role', [controllers.admin.Users, 'updateRole'])
          .where('id', router.matchers.number())
          .as('users.role')
        router
          .post('users/:id/transfer', [controllers.admin.Users, 'transfer'])
          .where('id', router.matchers.number())
          .as('users.transfer')
      })
      .use(middleware.role({ min: 'owner' }))
  })
  .prefix('admin')
  .as('admin')
  .use([middleware.auth(), middleware.role({ min: 'admin' })])
