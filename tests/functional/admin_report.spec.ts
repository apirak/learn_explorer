import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import User from '#models/user'
import Attempt from '#models/attempt'
import Answer from '#models/answer'
import StudentContact from '#models/student_contact'
import content from '#services/content_service'
import { REPORT_ZONE } from '#services/report_service'
import testUtils from '@adonisjs/core/services/test_utils'

const makeUser = (role: 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

const ids = content.forms.mini.ids

/** Saves the first `n` answers, each `gapMs` after the last, through the model hook. */
async function answer(attempt: Attempt, n: number, gapMs = 5000) {
  let at = DateTime.now().minus({ hours: 1 })
  for (const itemId of ids.slice(0, n)) {
    await Answer.create({ attemptId: attempt.id, itemId, value: 2, createdAt: at })
    at = at.plus({ milliseconds: gapMs })
  }
}

test.group('Admin report', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an answer stores the gap since the attempt’s last answer; changing it keeps the gap', async ({
    assert,
  }) => {
    const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    await answer(attempt, 3, 2500)
    const gaps = await Answer.query().where('attemptId', attempt.id).orderBy('id')
    assert.deepEqual(
      gaps.map((a) => a.gapMs),
      [null, 2500, 2500]
    )
    // A gap past the int column's range is capped instead of failing the save.
    const late = await Answer.create({
      attemptId: attempt.id,
      itemId: ids[3],
      value: 1,
      createdAt: DateTime.now().plus({ days: 40 }),
    })
    assert.equal(late.gapMs, 2_147_483_647)

    await Answer.updateOrCreate({ attemptId: attempt.id, itemId: ids[1] }, { value: 4 })
    const changed = await Answer.findByOrFail({ attemptId: attempt.id, itemId: ids[1] })
    assert.equal(changed.gapMs, 2500)
  })

  test('totals, funnel, incomplete and gap buckets count today’s cohort only', async ({
    client,
    assert,
  }) => {
    const now = DateTime.now()
    const seed = (extra: Partial<Attempt> = {}) =>
      Attempt.create({ contentVersion: 'v1', furthestStep: 'test', ...extra })

    // Two attempts by one campaign student, one no-code student, one attempt with no code.
    const done = await seed({
      code: 'AB5434',
      furthestStep: 'mypath',
      resultAt: now,
      careerAt: now,
      mypathAt: now,
      downloadedAt: now,
    })
    await answer(done, ids.length, 500) // 29 gaps under 1 s
    const half = await seed({ code: 'AB5434' })
    await answer(half, 15, 12_000) // 14 gaps in 10–20 s
    const one = await seed({ code: 'NC-ABCDE' })
    await answer(one, 2, 6 * 60_000) // gap over 5 min: left out
    await seed() // pressed Start, answered nothing
    await StudentContact.record(done.id, { consent: true, phone: '0812345678' }, 'mypath')
    // Yesterday: outside the default range.
    await seed({ code: 'ZZ9999', createdAt: now.minus({ days: 1 }) })

    const page = await client
      .get('/admin/report')
      .withInertia()
      .loginAs(await makeUser('admin'))

    page.assertInertiaComponent('admin/report')
    const { report, from, to } = page.inertiaProps
    assert.equal(from, to)
    assert.deepEqual(report.totals, { students: 3, attempts: 4, campaign: 1 })
    assert.deepEqual(
      report.funnel.map((s: { count: number }) => s.count),
      [4, 1, 1, 1, 1, 1]
    )
    assert.deepEqual(report.contacts, { contact: 0, mypath: 1 })
    assert.equal(report.incomplete.total, 3)
    assert.equal(report.incomplete.none, 1)
    assert.equal(report.incomplete.buckets[0], 1) // 2 of 30
    assert.equal(report.incomplete.buckets[5], 1) // 15 of 30
    assert.deepEqual(
      report.gaps.map((g: { count: number }) => g.count),
      [29, 0, 14, 0, 0, 0, 0, 0]
    )
    // Counts only, never codes or contact data [DP-001].
    assert.notInclude(JSON.stringify(page.inertiaProps), 'AB5434')
    assert.notInclude(JSON.stringify(page.inertiaProps), '0812345678')
  })

  test('a date range includes both ends; bad dates fall back to today', async ({
    client,
    assert,
  }) => {
    const now = DateTime.now().setZone(REPORT_ZONE)
    for (const days of [0, 2, 5]) {
      await Attempt.create({
        contentVersion: 'v1',
        furthestStep: 'test',
        createdAt: now.minus({ days }),
      })
    }
    const admin = await makeUser('admin')
    const attemptsFor = async (qs: string) => {
      const page = await client.get(`/admin/report${qs}`).withInertia().loginAs(admin)
      return page.inertiaProps.report.totals.attempts
    }
    const day = (n: number) => now.minus({ days: n }).toISODate()

    assert.equal(await attemptsFor(`?from=${day(2)}&to=${day(0)}`), 2)
    assert.equal(await attemptsFor(`?from=${day(5)}&to=${day(5)}`), 1)
    assert.equal(await attemptsFor('?from=nope&to=bad'), 1)
    // Clamped to the retention period (60 days by default) and to today.
    await Attempt.create({
      contentVersion: 'v1',
      furthestStep: 'test',
      createdAt: now.minus({ days: 90 }),
    })
    assert.equal(await attemptsFor(`?from=${day(100)}&to=${day(-5)}`), 3)
  })

  test('members get 403', async ({ client }) => {
    const page = await client
      .get('/admin/report')
      .withInertia()
      .loginAs(await makeUser('member'))
    page.assertStatus(403)
  })
})
