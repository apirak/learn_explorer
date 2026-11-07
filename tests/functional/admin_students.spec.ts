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
import ace from '@adonisjs/core/services/ace'
import BackfillScores from '../../commands/backfill_scores.js'

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

/** Parses the export into header → value records. Fields here hold no commas or quotes. */
const parseCsv = (text: string) => {
  const [header, ...rows] = text
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split('\r\n')
  const keys = header.split(',')
  return rows.map((row) => Object.fromEntries(row.split(',').map((v, i) => [keys[i], v])))
}

test.group('Admin student export', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('downloads matching attempts as CSV with full contact and counts', async ({
    client,
    assert,
  }) => {
    const done = await seed('mypath', {
      code: 'AB5434',
      scoreR: 20,
      scoreI: 1,
      scoreA: 2,
      scoreS: 3,
      scoreE: 4,
      scoreC: 5,
      interestCode: 'RCE',
      profileStatus: 'ok',
      desiredCareer: '=HYPERLINK("x")',
    })
    await Answer.createMany(
      content.forms.mini.ids.map((itemId) => ({ attemptId: done.id, itemId, value: 2 }))
    )
    await CareerView.create({ attemptId: done.id, occupationCode: content.occupations[0].code })
    await consent(done, '0812341234', 'student@example.com')
    await seed('test', { code: 'NC-7QX4M' })
    await seed('result', { code: 'ZZ0001' })

    const res = await client
      .get('/admin/students/export?step=mypath')
      .loginAs(await makeUser('admin'))
    res.assertStatus(200)
    assert.match(res.header('content-type') ?? '', /^text\/csv; charset=utf-8/)
    assert.match(
      res.header('content-disposition') ?? '',
      /^attachment; filename="students-\d{8}-\d{4}\.csv"$/
    )
    assert.isTrue(res.text().startsWith('\uFEFF'))

    const rows = parseCsv(res.text())
    assert.lengthOf(rows, 1)
    assert.deepInclude(rows[0], {
      attempt_uuid: done.uuid,
      code: 'AB5434',
      code_type: 'campaign',
      furthest_step: 'mypath',
      answer_count: '30',
      score_r: '20',
      interest_code: 'RCE',
      career_view_count: '1',
      has_consent: 'true',
      consent_version: 'v1',
      phone: '0812341234',
      email: 'student@example.com',
      result_at: '',
    })
    assert.match(rows[0].started_at, /\+07:00$/)
  })

  test('labels no-code and code-less attempts; formulas are defused', async ({
    client,
    assert,
  }) => {
    await seed('test', { code: 'NC-7QX4M', desiredCareer: '@SUM(1)' })
    await seed('test')

    const res = await client.get('/admin/students/export').loginAs(await makeUser('admin'))
    const rows = parseCsv(res.text())
    assert.sameDeepMembers(
      rows.map((r) => [r.code_type, r.has_consent, r.answer_count, r.desired_career]),
      [
        ['no_code', 'false', '0', "'@SUM(1)"],
        ['', 'false', '0', ''],
      ]
    )
  })

  test('members get 403 for the export and the column guide', async ({ client }) => {
    const member = await makeUser('member')
    const csv = await client.get('/admin/students/export').loginAs(member)
    csv.assertStatus(403)
    const guide = await client.get('/admin/students/export/dictionary').loginAs(member)
    guide.assertStatus(403)
  })

  test('the column guide downloads as markdown', async ({ client, assert }) => {
    const res = await client
      .get('/admin/students/export/dictionary')
      .loginAs(await makeUser('admin'))
    res.assertStatus(200)
    assert.match(res.header('content-disposition') ?? '', /students-export-dictionary\.md/)
    assert.include(res.text(), '# Learn Explorer student export')
  })
})

test.group('backfill:scores', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('scores finished attempts that have none, and leaves the rest', async ({ assert }) => {
    const finished = await seed('test')
    await Answer.createMany(
      content.forms.mini.ids.map((itemId) => ({ attemptId: finished.id, itemId, value: 3 }))
    )
    const unfinished = await seed('test')
    await Answer.create({ attemptId: unfinished.id, itemId: content.forms.mini.ids[0], value: 4 })

    const command = await ace.create(BackfillScores, [])
    await command.exec()
    command.assertSucceeded()

    await finished.refresh()
    await unfinished.refresh()
    assert.equal(finished.scoreR, 15)
    assert.equal(finished.profileStatus, 'flat')
    assert.isNull(unfinished.scoreR)
  })
})
