import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Attempt from '#models/attempt'
import NpsResponse from '#models/nps_response'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

const makeUser = (role: 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

/** An attempt that opened the careers list, with an NPS response when `score` is given. */
async function seed(score?: number, comment?: string, createdAt = DateTime.now()) {
  const attempt = await Attempt.create({
    contentVersion: 'v1',
    furthestStep: 'result',
    code: 'AB5434',
    careersViewedAt: DateTime.now(),
    createdAt,
  })
  if (score !== undefined) {
    await NpsResponse.create({
      attemptId: attempt.id,
      score,
      comment: comment ?? null,
      sentAt: comment ? DateTime.now() : null,
    })
  }
  return attempt
}

test.group('Admin NPS', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the report counts NPS, bands, scores and the response rate for the cohort', async ({
    client,
    assert,
  }) => {
    // 2 Promoters, 1 Passive, 2 Detractors → (2 − 2) / 5 = 0; one more Promoter → 17.
    await seed(10, 'ชอบมาก')
    await seed(9)
    await seed(9)
    await seed(7, 'ดี')
    await seed(6)
    await seed(0, 'ไม่ชอบ')
    await seed() // opened the careers list, did not answer
    await seed(10, 'outside the cohort', DateTime.now().minus({ days: 3 }))

    const page = await client
      .get('/admin/report')
      .withInertia()
      .loginAs(await makeUser('admin'))
    page.assertStatus(200)
    const { nps } = page.inertiaProps.report
    assert.deepEqual(nps.groups, { detractor: 2, passive: 1, promoter: 3 })
    assert.equal(nps.score, 17)
    assert.equal(nps.responses, 6)
    assert.equal(nps.careersViewed, 7)
    assert.equal(nps.comments, 3)
    assert.deepEqual(nps.scores, [1, 0, 0, 0, 0, 0, 1, 1, 0, 2, 1])
    // Counts only on the report [DP-001].
    assert.notInclude(JSON.stringify(page.inertiaProps), 'ชอบมาก')
  })

  test('no responses gives a null NPS', async ({ client, assert }) => {
    await seed()
    const page = await client
      .get('/admin/report')
      .withInertia()
      .loginAs(await makeUser('admin'))
    assert.isNull(page.inertiaProps.report.nps.score)
    assert.equal(page.inertiaProps.report.nps.responses, 0)
  })

  test('the comments page lists the cohort’s comments by band, never the attempt', async ({
    client,
    assert,
  }) => {
    await seed(10, 'ชอบมาก')
    await seed(7, 'ดี')
    await seed(3, 'ไม่ชอบ')
    await seed(2) // a score with no comment is not listed
    await seed(9, 'outside the cohort', DateTime.now().minus({ days: 3 }))
    const admin = await makeUser('admin')

    const all = await client.get('/admin/report/nps').withInertia().loginAs(admin)
    all.assertStatus(200)
    all.assertInertiaComponent('admin/nps')
    const { comments } = all.inertiaProps
    assert.equal(comments.metadata.total, 3)
    assert.sameMembers(
      comments.data.map((c: { comment: string }) => c.comment),
      ['ชอบมาก', 'ดี', 'ไม่ชอบ']
    )
    assert.deepEqual(Object.keys(comments.data[0]).sort(), [
      'comment',
      'group',
      'id',
      'score',
      'sentAt',
    ])
    assert.notInclude(JSON.stringify(all.inertiaProps), 'AB5434')

    const promoters = await client
      .get('/admin/report/nps?group=promoter')
      .withInertia()
      .loginAs(admin)
    assert.deepEqual(
      promoters.inertiaProps.comments.data.map((c: { comment: string }) => c.comment),
      ['ชอบมาก']
    )
    const unknown = await client.get('/admin/report/nps?group=nope').withInertia().loginAs(admin)
    assert.isNull(unknown.inertiaProps.group)
    assert.equal(unknown.inertiaProps.comments.metadata.total, 3)
  })

  test('members get 403 on the comments page', async ({ client }) => {
    const page = await client
      .get('/admin/report/nps')
      .withInertia()
      .loginAs(await makeUser('member'))
    page.assertStatus(403)
  })
})
