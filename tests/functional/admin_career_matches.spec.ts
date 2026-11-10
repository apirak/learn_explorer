import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import CareerMatch from '#models/career_match'
import StudentContact from '#models/student_contact'
import User from '#models/user'
import content from '#services/content_service'
import { CareerMatchService } from '#services/career_match_service'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'

const MINI: string[] = content.forms.mini.ids

const makeUser = (role: 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

/** R items 4, I items 3, the rest 2: a valid profile with matches. */
const realistic = Object.fromEntries(
  MINI.filter((id) => 'RI'.includes(id[0])).map((id) => [id, id[0] === 'R' ? 4 : 3])
)

/** An attempt with every answer in (`flat` gives an invalid profile), not yet scored. */
const finished = async (extra: Partial<Attempt> = {}, profile: 'ok' | 'flat' = 'ok') => {
  const attempt = await Attempt.create({
    contentVersion: 'v1',
    furthestStep: 'result',
    desiredCareer: 'หมอ',
    ...extra,
  })
  await Answer.createMany(
    MINI.map((itemId) => ({
      attemptId: attempt.id,
      itemId,
      value: profile === 'flat' ? 3 : (realistic[itemId] ?? 2),
    }))
  )
  return attempt
}

const consent = (attempt: Attempt) =>
  StudentContact.create({
    attemptId: attempt.id,
    name: 'สมชาย',
    phone: '0812341234',
    email: 'student@example.com',
    consentAt: DateTime.now(),
    consentVersion: 'v1',
  })

test.group('Admin career matches page', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists finished attempts with a desired career, newest first', async ({
    client,
    assert,
  }) => {
    const older = await finished({ createdAt: DateTime.now().minus({ days: 1 }) })
    const newer = await finished({ code: 'AB5434' })
    await finished({ desiredCareer: null })
    await finished({ desiredCareer: '' })
    // Unfinished: one answer only.
    const unfinished = await Attempt.create({
      contentVersion: 'v1',
      furthestStep: 'test',
      desiredCareer: 'หมอ',
    })
    await Answer.create({ attemptId: unfinished.id, itemId: MINI[0], value: 3 })

    const page = await client
      .get('/admin/career-matches')
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/career_matches')
    const { attempts } = page.inertiaProps
    assert.deepEqual(
      attempts.data.map((a: { id: number }) => a.id),
      [newer.id, older.id]
    )
    assert.equal(attempts.metadata.total, 2)
  })

  test('shows stored matches in rank order, the status, or not computed', async ({
    client,
    assert,
  }) => {
    const scored = await finished({ createdAt: DateTime.now().minus({ minutes: 3 }) })
    await CareerMatchService.record(scored)
    const flat = await finished({ createdAt: DateTime.now().minus({ minutes: 2 }) }, 'flat')
    await CareerMatchService.record(flat)
    const pending = await finished()

    const page = await client
      .get('/admin/career-matches')
      .withInertia()
      .loginAs(await makeUser('admin'))

    const byId = new Map(
      page.inertiaProps.attempts.data.map((a: { id: number }) => [a.id, a] as const)
    )
    const stored = await CareerMatch.query().where('attemptId', scored.id).orderBy('rank')
    const row = byId.get(scored.id) as Record<string, unknown>
    assert.deepEqual(
      row.careerMatches,
      stored.map((m) => content.thaiTitles[m.occupationCode] ?? m.occupationCode)
    )
    assert.lengthOf(row.careerMatches as string[], 5)
    assert.isNotNull(row.matchedAt)

    const flatRow = byId.get(flat.id) as Record<string, unknown>
    assert.equal(flatRow.profileStatus, 'flat')
    assert.deepEqual(flatRow.careerMatches, [])
    assert.isNotNull(flatRow.matchedAt)

    const pendingRow = byId.get(pending.id) as Record<string, unknown>
    assert.isNull(pendingRow.matchedAt)
  })

  test('says only whether a contact exists, never its details', async ({ client, assert }) => {
    const withContact = await finished()
    await consent(withContact)
    await finished()

    const page = await client
      .get('/admin/career-matches')
      .withInertia()
      .loginAs(await makeUser('admin'))

    const rows = page.inertiaProps.attempts.data as Record<string, unknown>[]
    assert.deepEqual(
      rows.map((r) => r.consented),
      [false, true]
    )
    for (const r of rows) {
      assert.notProperty(r, 'name')
      assert.notProperty(r, 'phone')
      assert.notProperty(r, 'email')
    }
    const json = JSON.stringify(page.inertiaProps)
    assert.notInclude(json, '0812341234')
    assert.notInclude(json, 'สมชาย')
    assert.notInclude(json, 'student@example.com')
    assert.notInclude(json, '08x-xxx')
  })

  test('filters by cohort date range in Bangkok time', async ({ client, assert }) => {
    // 23:30 Bangkok on 1 Nov is 16:30 UTC; it belongs to 1 Nov, not 2 Nov.
    const lateNight = await finished({
      createdAt: DateTime.fromISO('2026-11-01T23:30', { zone: 'Asia/Bangkok' }),
    })
    const nextDay = await finished({
      createdAt: DateTime.fromISO('2026-11-02T00:30', { zone: 'Asia/Bangkok' }),
    })
    const admin = await makeUser('admin')
    const ids = async (qs: string) => {
      const page = await client.get(`/admin/career-matches${qs}`).withInertia().loginAs(admin)
      return page.inertiaProps.attempts.data.map((a: { id: number }) => a.id)
    }

    assert.deepEqual(await ids('?from=2026-11-01&to=2026-11-01'), [lateNight.id])
    assert.deepEqual(await ids('?from=2026-11-02'), [nextDay.id])
    assert.deepEqual(await ids('?to=2026-11-01'), [lateNight.id])
    assert.deepEqual(await ids('?from=nope'), [nextDay.id, lateNight.id])
  })

  test('filters by code, time over a minute, consent, and desired career; ANDed', async ({
    client,
    assert,
  }) => {
    const fast = await finished({ code: 'AB5434', testTimeMs: 45_000 })
    const slow = await finished({ code: 'AB5434', testTimeMs: 90_000, desiredCareer: 'นักบิน' })
    const exactMinute = await finished({ testTimeMs: 60_000 })
    const noTime = await finished({ code: 'ZZ0001', testTimeMs: null })
    await consent(slow)
    await consent(noTime)
    const admin = await makeUser('admin')
    const ids = async (qs: string) => {
      const page = await client.get(`/admin/career-matches${qs}`).withInertia().loginAs(admin)
      return (page.inertiaProps.attempts.data as { id: number }[]).map((a) => a.id).sort()
    }
    const sorted = (...xs: Attempt[]) => xs.map((a) => a.id).sort()

    assert.deepEqual(await ids('?code=AB5434'), sorted(fast, slow))
    assert.deepEqual(await ids('?overMinute=1'), sorted(slow))
    assert.deepEqual(await ids('?consented=1'), sorted(slow, noTime))
    assert.deepEqual(await ids('?q=บิน'), sorted(slow))
    assert.deepEqual(await ids('?code=AB5434&consented=1&overMinute=1&q=นัก'), sorted(slow))
    assert.deepEqual(await ids('?code=ZZ0001&overMinute=1'), [])
    // Unknown flag values are ignored.
    assert.deepEqual(await ids('?overMinute=yes'), sorted(fast, slow, exactMinute, noTime))
  })

  test('the desired-career search treats % and _ literally', async ({ client, assert }) => {
    const percent = await finished({ desiredCareer: '100% นักวาด' })
    await finished({ desiredCareer: '100 นักวาด' })
    const underscore = await finished({ desiredCareer: 'dev_ops' })
    await finished({ desiredCareer: 'devXops' })
    const backslash = await finished({ desiredCareer: 'a\\b' })
    await finished({ desiredCareer: 'ab' })
    const admin = await makeUser('admin')
    const ids = async (q: string) => {
      const page = await client.get('/admin/career-matches').qs({ q }).withInertia().loginAs(admin)
      return page.inertiaProps.attempts.data.map((a: { id: number }) => a.id)
    }

    assert.deepEqual(await ids('0%'), [percent.id])
    assert.deepEqual(await ids('v_o'), [underscore.id])
    assert.deepEqual(await ids('a\\b'), [backslash.id])
    // ILIKE: case-insensitive.
    assert.deepEqual(await ids('DEV_OPS'), [underscore.id])
  })

  test('pages 25 rows and keeps filters in the query string', async ({ client, assert }) => {
    for (let i = 0; i < 26; i++) await finished({ code: 'AB5434' })
    const admin = await makeUser('admin')

    const first = await client.get('/admin/career-matches?code=AB5434').withInertia().loginAs(admin)
    assert.lengthOf(first.inertiaProps.attempts.data, 25)
    assert.equal(first.inertiaProps.attempts.metadata.lastPage, 2)
    assert.equal(first.inertiaProps.filters.code, 'AB5434')

    const second = await client
      .get('/admin/career-matches?code=AB5434&page=2')
      .withInertia()
      .loginAs(admin)
    assert.lengthOf(second.inertiaProps.attempts.data, 1)
  })

  test('members get 403', async ({ client }) => {
    const member = await makeUser('member')

    const page = await client.get('/admin/career-matches').withInertia().loginAs(member)
    page.assertStatus(403)
    const press = await client
      .post('/admin/career-matches/backfill')
      .withCsrfToken()
      .loginAs(member)
    press.assertStatus(403)
  })
})

test.group('Admin career matches backfill', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  const press = (client: ApiClient, admin: User) =>
    client
      .post('/admin/career-matches/backfill')
      .qs({ code: 'AB5434' })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

  test('counts finished attempts without matches, any desired career or status', async ({
    client,
    assert,
  }) => {
    await finished()
    await finished({ desiredCareer: null })
    await finished({}, 'flat')
    const done = await finished()
    await CareerMatchService.record(done)
    const unfinished = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    await Answer.create({ attemptId: unfinished.id, itemId: MINI[0], value: 3 })

    const page = await client
      .get('/admin/career-matches')
      .withInertia()
      .loginAs(await makeUser('admin'))

    assert.equal(page.inertiaProps.pending, 3)
  })

  test('scores pending attempts, flashes the counts and redirects back with filters', async ({
    client,
    assert,
  }) => {
    const ok = await finished()
    const flat = await finished({ desiredCareer: null }, 'flat')
    const admin = await makeUser('admin')

    const response = await press(client, admin)

    response.assertStatus(302)
    response.assertHeader('location', '/admin/career-matches?code=AB5434')
    response.assertFlashMessage('success', 'คำนวณแล้ว 2 · เหลือ 0')
    await ok.refresh()
    await flat.refresh()
    assert.isNotNull(ok.matchedAt)
    assert.isNotNull(flat.matchedAt)
    assert.equal(flat.profileStatus, 'flat')
    assert.lengthOf(await CareerMatch.query().where('attemptId', ok.id), 5)
    assert.equal(await CareerMatchService.pendingCount(), 0)
  })

  test('a second press does nothing for done attempts, invalid ones included', async ({
    client,
    assert,
  }) => {
    const ok = await finished()
    await finished({}, 'flat')
    const admin = await makeUser('admin')
    await press(client, admin)
    await ok.refresh()
    const firstMatchedAt = ok.matchedAt!.toMillis()

    const again = await press(client, admin)

    again.assertFlashMessage('success', 'คำนวณแล้ว 0 · เหลือ 0')
    await ok.refresh()
    assert.equal(ok.matchedAt!.toMillis(), firstMatchedAt)
  })

  test('one press processes at most one batch, oldest first', async ({ client, assert }) => {
    const total = CareerMatchService.BACKFILL_BATCH + 2
    const start = DateTime.now().minus({ days: 1 })
    // Bulk insert keeps this fast; answers make each attempt finished.
    const attempts = await Attempt.createMany(
      Array.from({ length: total }, (_, i) => ({
        contentVersion: 'v1',
        furthestStep: 'result' as const,
        createdAt: start.plus({ seconds: i }),
      }))
    )
    await Answer.createMany(
      attempts.flatMap((a) =>
        MINI.map((itemId) => ({ attemptId: a.id, itemId, value: realistic[itemId] ?? 2 }))
      )
    )

    const response = await press(client, await makeUser('admin'))

    response.assertFlashMessage(
      'success',
      `คำนวณแล้ว ${CareerMatchService.BACKFILL_BATCH} · เหลือ 2`
    )
    const left = await CareerMatchService.pending().orderBy('createdAt')
    assert.deepEqual(
      left.map((a) => a.id),
      attempts.slice(-2).map((a) => a.id)
    )
  }).timeout(120_000)
})
