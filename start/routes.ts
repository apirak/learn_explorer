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
    router.on('/').renderInertia('admin/dashboard', {}).as('dashboard')
  })
  .prefix('admin')
  .as('admin')
  .use([middleware.auth(), middleware.role({ min: 'admin' })])
