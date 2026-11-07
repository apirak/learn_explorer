import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import Attempt from '#models/attempt'
import testUtils from '@adonisjs/core/services/test_utils'

const makeUser = (role: 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

test.group('Admin dashboard', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('admins see step counts and Result/Download totals for the last 60 days', async ({
    client,
    assert,
  }) => {
    const now = DateTime.now()
    const seed = (furthestStep: Attempt['furthestStep'], extra: Partial<Attempt> = {}) =>
      Attempt.create({ contentVersion: 'v1', furthestStep, code: 'AB5434', ...extra })

    await seed('test')
    await seed('test')
    await seed('result', { resultAt: now })
    await seed('career', { resultAt: now })
    await seed('mypath', { resultAt: now, mypathAt: now, downloadedAt: now })
    // Older than 60 days: left out.
    await seed('mypath', { resultAt: now, downloadedAt: now, createdAt: now.minus({ days: 61 }) })

    const page = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/dashboard')
    const { summary } = page.inertiaProps
    assert.deepEqual(summary.steps, { test: 2, result: 1, career: 1, mypath: 1 })
    assert.equal(summary.resultViews, 3)
    assert.equal(summary.downloads, 1)
    // No codes or contact data in the dashboard props.
    assert.notInclude(JSON.stringify(page.inertiaProps), 'AB5434')
  })

  test('steps with no attempts count as zero', async ({ client, assert }) => {
    const page = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('admin'))
    assert.deepEqual(page.inertiaProps.summary, {
      steps: { test: 0, result: 0, career: 0, mypath: 0 },
      resultViews: 0,
      downloads: 0,
      generatedAt: page.inertiaProps.summary.generatedAt,
    })
  })

  test('members get 403', async ({ client }) => {
    const page = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('member'))
    page.assertStatus(403)
  })
})
