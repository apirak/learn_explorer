import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Attempt from '#models/attempt'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'

const makeUser = (role: 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

/** An attempt started `days` ago. */
const seed = (days: number) =>
  Attempt.create({
    contentVersion: 'v1',
    furthestStep: 'test',
    createdAt: DateTime.now().minus({ days }),
  })

test.group('Retention warning', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('admin pages count attempts older than the retention period', async ({ client, assert }) => {
    await Promise.all([seed(1), seed(59), seed(61), seed(90)])
    const admin = await makeUser('admin')

    for (const url of ['/admin', '/admin/students', '/admin/retention']) {
      const page = await client.get(url).withInertia().loginAs(admin)
      assert.equal(page.inertiaProps.retentionDue, 2, url)
    }
  })

  test('no warning when nothing is due', async ({ client, assert }) => {
    await seed(59)
    const page = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('admin'))
    assert.equal(page.inertiaProps.retentionDue, 0)
  })
})

test.group('Retention setting and purge', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the purge screen shows the period and how many attempts would go', async ({
    client,
    assert,
  }) => {
    await Promise.all([seed(30), seed(61)])
    const page = await client
      .get('/admin/retention')
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/retention')
    assert.equal(page.inertiaProps.retentionDays, 60)
    assert.equal(page.inertiaProps.retentionDue, 1)
    // Showing the count deletes nothing (the old --dry-run).
    assert.lengthOf(await Attempt.all(), 2)
  })

  test('purge deletes attempts past the period with their child rows', async ({
    client,
    assert,
  }) => {
    const kept = await Promise.all([seed(1), seed(59)])
    const old = await Promise.all([seed(61), seed(90)])
    for (const attempt of [...kept, ...old]) {
      await attempt.related('answers').create({ itemId: 'R1', value: 3 })
      await attempt.related('careerViews').create({ occupationCode: '11-1011.00' })
      await attempt.related('contact').create({
        phone: '0812341234',
        consentAt: DateTime.now(),
        consentVersion: 'v1',
      })
    }

    const response = await client
      .post('/admin/retention/purge')
      .withCsrfToken()
      .loginAs(await makeUser('admin'))
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/admin/retention')
    const left = await Attempt.all()
    assert.sameMembers(
      left.map((a) => a.id),
      kept.map((a) => a.id)
    )
    for (const table of ['answers', 'career_views', 'student_contacts']) {
      const rows = await db.from(table).whereIn(
        'attempt_id',
        old.map((a) => a.id)
      )
      assert.lengthOf(rows, 0, table)
      assert.lengthOf(await db.from(table), 2, table)
    }
  })

  test('purge uses the retention period the admin set', async ({ client, assert }) => {
    const admin = await makeUser('admin')
    await Promise.all([seed(5), seed(20)])

    const update = await client
      .put('/admin/retention')
      .form({ retentionDays: 10 })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)
    update.assertStatus(302)

    await client.post('/admin/retention/purge').withCsrfToken().loginAs(admin).redirects(0)
    assert.lengthOf(await Attempt.all(), 1)

    const page = await client.get('/admin/retention').withInertia().loginAs(admin)
    assert.equal(page.inertiaProps.retentionDays, 10)
  })

  test('the period must be a whole number from 1 to 3650', async ({ client, assert }) => {
    const admin = await makeUser('admin')
    for (const retentionDays of [0, 3651, 1.5, 'abc']) {
      await client
        .put('/admin/retention')
        .form({ retentionDays })
        .withCsrfToken()
        .loginAs(admin)
        .redirects(0)
    }
    const page = await client.get('/admin/retention').withInertia().loginAs(admin)
    assert.equal(page.inertiaProps.retentionDays, 60)
  })

  test('members get 403 and delete nothing', async ({ client, assert }) => {
    const member = await makeUser('member')
    await seed(90)

    const show = await client.get('/admin/retention').withInertia().loginAs(member)
    show.assertStatus(403)
    const update = await client
      .put('/admin/retention')
      .form({ retentionDays: 1 })
      .withCsrfToken()
      .loginAs(member)
    update.assertStatus(403)
    const purge = await client.post('/admin/retention/purge').withCsrfToken().loginAs(member)
    purge.assertStatus(403)

    assert.lengthOf(await Attempt.all(), 1)
    const admin = await makeUser('admin')
    const page = await client.get('/admin/retention').withInertia().loginAs(admin)
    assert.equal(page.inertiaProps.retentionDays, 60)
  })
})
