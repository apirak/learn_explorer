import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import AdminAudit from '#models/admin_audit'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import CareerView from '#models/career_view'
import StudentContact from '#models/student_contact'
import User from '#models/user'
import content from '#services/content_service'
import testUtils from '@adonisjs/core/services/test_utils'

const makeUser = (role: 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

const seed = (furthestStep: Attempt['furthestStep'], extra: Partial<Attempt> = {}) =>
  Attempt.create({ contentVersion: 'v1', furthestStep, ...extra })

const consent = (attempt: Attempt, phone: string | null, email: string | null) =>
  StudentContact.create({
    attemptId: attempt.id,
    phone,
    email,
    consentAt: DateTime.now(),
    consentVersion: 'v1',
  })

test.group('Admin students list', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists attempts newest first with contact details masked', async ({ client, assert }) => {
    const old = await seed('test', { code: 'AB5434', createdAt: DateTime.now().minus({ days: 2 }) })
    const withContact = await seed('mypath', { code: 'AB5434' })
    await consent(withContact, '0812341234', 'student@example.com')

    const page = await client
      .get('/admin/students')
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/students/index')
    const { attempts } = page.inertiaProps
    assert.deepEqual(
      attempts.data.map((a: { id: number }) => a.id),
      [withContact.id, old.id]
    )
    assert.equal(attempts.metadata.total, 2)
    assert.equal(attempts.data[0].phone, '08x-xxx-1234')
    assert.equal(attempts.data[0].email, 's***@example.com')
    assert.isNull(attempts.data[1].phone)
    // The full contact never reaches the list page.
    const json = JSON.stringify(page.inertiaProps)
    assert.notInclude(json, '0812341234')
    assert.notInclude(json, 'student@example.com')
  })

  test('filters by code and by step; an unknown step is ignored', async ({ client, assert }) => {
    await seed('test', { code: 'AB5434' })
    await seed('result', { code: 'AB5434' })
    await seed('result', { code: 'ZZ0001' })
    const admin = await makeUser('admin')
    const totalFor = async (qs: string) => {
      const page = await client.get(`/admin/students${qs}`).withInertia().loginAs(admin)
      return page.inertiaProps.attempts.metadata.total
    }

    assert.equal(await totalFor('?code=AB5434'), 2)
    assert.equal(await totalFor('?step=result'), 2)
    assert.equal(await totalFor('?code=AB5434&step=result'), 1)
    assert.equal(await totalFor('?step=nope'), 3)
  })

  test('members get 403 and are not audited', async ({ client, assert }) => {
    const member = await makeUser('member')
    const attempt = await seed('test')
    const list = await client.get('/admin/students').withInertia().loginAs(member)
    list.assertStatus(403)
    const detail = await client.get(`/admin/students/${attempt.id}`).withInertia().loginAs(member)
    detail.assertStatus(403)
    assert.lengthOf(await AdminAudit.all(), 0)
  })
})

test.group('Admin student detail', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('shows timeline, answers, scores, careers, download and consented contact', async ({
    client,
    assert,
  }) => {
    const now = DateTime.now()
    const attempt = await seed('mypath', {
      code: 'AB5434',
      resultAt: now,
      careerAt: now,
      mypathAt: now,
      downloadedAt: now,
    })
    const ids = content.forms.mini.ids
    // Every item "like" (4) except the first, so scores are not flat.
    await Answer.createMany(
      ids.map((itemId, i) => ({ attemptId: attempt.id, itemId, value: i === 0 ? 0 : 4 }))
    )
    const occupation = content.occupations[0]
    await CareerView.create({ attemptId: attempt.id, occupationCode: occupation.code })
    await consent(attempt, '0812341234', 'student@example.com')

    const page = await client
      .get(`/admin/students/${attempt.id}`)
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/students/show')
    const { attempt: a } = page.inertiaProps
    assert.equal(a.furthestStep, 'mypath')
    assert.isNotNull(a.resultAt)
    assert.isNotNull(a.downloadedAt)
    assert.lengthOf(a.answers, ids.length)
    const first = content.items.find((item) => item.id === ids[0])!
    assert.deepInclude(a.answers[0], { itemId: ids[0], text: first.text_th, value: 0 })
    assert.sameMembers(Object.keys(a.scores), ['R', 'I', 'A', 'S', 'E', 'C'])
    assert.lengthOf(a.interestCode, 3)
    assert.deepEqual(a.careersViewed, [
      { code: occupation.code, title: content.thaiTitles[occupation.code] ?? occupation.title },
    ])
    assert.equal(a.contact.phone, '0812341234')
    assert.equal(a.contact.email, 'student@example.com')
  })

  test('an unfinished attempt without consent has no scores and no contact', async ({
    client,
    assert,
  }) => {
    const attempt = await seed('test')
    const page = await client
      .get(`/admin/students/${attempt.id}`)
      .withInertia()
      .loginAs(await makeUser('admin'))

    const { attempt: a } = page.inertiaProps
    assert.isNull(a.scores)
    assert.isNull(a.interestCode)
    assert.isNull(a.contact)
    assert.deepEqual(a.answers, [])
  })

  test('opening a detail page writes one audit row', async ({ client, assert }) => {
    const admin = await makeUser('admin')
    const attempt = await seed('test')

    await client.get(`/admin/students/${attempt.id}`).withInertia().loginAs(admin)

    const audits = await AdminAudit.all()
    assert.lengthOf(audits, 1)
    assert.equal(audits[0].userId, admin.id)
    assert.equal(audits[0].attemptId, attempt.id)
    assert.equal(audits[0].action, 'view')
    assert.isNotNull(audits[0].createdAt)
  })

  test('an unknown attempt is a 404 and writes no audit', async ({ client, assert }) => {
    const page = await client
      .get('/admin/students/999999')
      .withInertia()
      .loginAs(await makeUser('admin'))
    page.assertStatus(404)
    assert.lengthOf(await AdminAudit.all(), 0)
  })
})

test.group('Admin student delete', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('deletes one attempt and its child rows; audit stays with a null id', async ({
    client,
    assert,
  }) => {
    const admin = await makeUser('admin')
    const gone = await seed('mypath')
    const kept = await seed('test')
    await consent(gone, '0812341234', null)
    await AdminAudit.create({ userId: admin.id, attemptId: gone.id, action: 'view' })

    const res = await client
      .delete(`/admin/students/${gone.id}`)
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    res.assertStatus(302)
    assert.isNull(await Attempt.find(gone.id))
    assert.isNotNull(await Attempt.find(kept.id))
    assert.isNull(await StudentContact.findBy('attemptId', gone.id))
    const audit = await AdminAudit.findByOrFail('userId', admin.id)
    assert.isNull(audit.attemptId)
  })

  test('members get 403 and delete nothing', async ({ client, assert }) => {
    const attempt = await seed('test')
    const res = await client
      .delete(`/admin/students/${attempt.id}`)
      .withCsrfToken()
      .loginAs(await makeUser('member'))
    res.assertStatus(403)
    assert.isNotNull(await Attempt.find(attempt.id))
  })
})
