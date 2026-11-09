import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import Attempt from '#models/attempt'
import StudentContact from '#models/student_contact'
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
    const career = await seed('career', { resultAt: now })
    const mypath = await seed('mypath', { resultAt: now, mypathAt: now, downloadedAt: now })
    // Older than 60 days: left out.
    const old = await seed('mypath', {
      resultAt: now,
      downloadedAt: now,
      createdAt: now.minus({ days: 61 }),
    })
    const contact = { consent: true, phone: '0812345678' }
    await StudentContact.record(career.id, contact, 'contact')
    await StudentContact.record(mypath.id, contact, 'mypath')
    await StudentContact.record(old.id, contact, 'contact')

    const page = await client
      .get('/admin?range=60')
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/dashboard')
    const { summary } = page.inertiaProps
    assert.deepEqual(summary.steps, { test: 2, result: 1, career: 1, mypath: 1 })
    assert.equal(summary.resultViews, 3)
    assert.equal(summary.downloads, 1)
    assert.deepEqual(summary.contacts, { contact: 1, mypath: 1 })
    // No codes or contact data in the dashboard props.
    assert.notInclude(JSON.stringify(page.inertiaProps), 'AB5434')
    assert.notInclude(JSON.stringify(page.inertiaProps), '0812345678')
  })

  test('steps with no attempts count as zero', async ({ client, assert }) => {
    const page = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('admin'))
    const { summary } = page.inertiaProps
    assert.deepEqual(summary.steps, { test: 0, result: 0, career: 0, mypath: 0 })
    assert.equal(summary.resultViews, 0)
    assert.equal(summary.downloads, 0)
    assert.deepEqual(summary.contacts, { contact: 0, mypath: 0 })
  })

  test('the range filter picks 7, 30, 60 days or all; anything else falls back to today', async ({
    client,
    assert,
  }) => {
    const now = DateTime.now()
    for (const days of [1, 10, 45, 100]) {
      await Attempt.create({
        contentVersion: 'v1',
        furthestStep: 'test',
        createdAt: now.minus({ days }),
      })
    }
    const admin = await makeUser('admin')
    const countFor = async (qs: string) => {
      const page = await client.get(`/admin${qs}`).withInertia().loginAs(admin)
      return [page.inertiaProps.range, page.inertiaProps.summary.steps.test]
    }

    assert.deepEqual(await countFor('?range=7'), ['7', 1])
    assert.deepEqual(await countFor('?range=30'), ['30', 2])
    assert.deepEqual(await countFor('?range=60'), ['60', 3])
    assert.deepEqual(await countFor('?range=all'), ['all', 4])
    assert.deepEqual(await countFor(''), ['today', 0])
    assert.deepEqual(await countFor('?range=999'), ['today', 0])
  })

  test('today counts attempts started since midnight Bangkok time, and is the default', async ({
    client,
    assert,
  }) => {
    const midnight = DateTime.now().setZone('Asia/Bangkok').startOf('day')
    for (const createdAt of [midnight.plus({ minutes: 1 }), midnight.minus({ minutes: 1 })]) {
      await Attempt.create({ contentVersion: 'v1', furthestStep: 'test', createdAt })
    }
    const admin = await makeUser('admin')

    for (const url of ['/admin?range=today', '/admin']) {
      const page = await client.get(url).withInertia().loginAs(admin)
      assert.equal(page.inertiaProps.range, 'today')
      assert.equal(page.inertiaProps.summary.steps.test, 1)
    }
  })

  test('members get 403', async ({ client }) => {
    const page = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('member'))
    page.assertStatus(403)
  })
})
