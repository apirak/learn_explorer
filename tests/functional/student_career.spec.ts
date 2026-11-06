import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import CareerView from '#models/career_view'
import content from '#services/content_service'
import testUtils from '@adonisjs/core/services/test_utils'

const MINI: string[] = content.forms.mini.ids

/** A finished attempt with a valid profile: R items 4, the rest 2 (top type R). */
async function scoredAttempt() {
  const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'result' })
  await Answer.createMany(
    MINI.map((itemId) => ({ attemptId: attempt.id, itemId, value: itemId[0] === 'R' ? 4 : 2 }))
  )
  return attempt
}

const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })

test.group('Student career detail', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /** The occupation codes on this attempt's careers list. */
  async function matchCodes(client: any, attempt: Attempt): Promise<string[]> {
    const list = await client
      .get('/careers')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()
    return list.inertiaProps.matches.map((m: { code: string }) => m.code)
  }

  test('needs an attempt', async ({ client }) => {
    const response = await client.get('/careers/15-1252.00').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('404s for an occupation outside the current matches', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const codes = await matchCodes(client, attempt)
    const other = content.occupations.find((o) => !codes.includes(o.code))!

    for (const code of [other.code, 'not-a-code']) {
      const response = await client
        .get(`/careers/${code}`)
        .withEncryptedCookie('le_attempt', cookie(attempt))
      response.assertStatus(404)
    }
    assert.lengthOf(await CareerView.query().where('attemptId', attempt.id), 0)
    await attempt.refresh()
    assert.isNull(attempt.careerAt)
    assert.equal(attempt.furthestStep, 'result')
  })

  test('404s when the profile has no matches', async ({ client }) => {
    const flat = await Attempt.create({ contentVersion: 'v1', furthestStep: 'result' })
    await Answer.createMany(MINI.map((itemId) => ({ attemptId: flat.id, itemId, value: 3 })))

    const response = await client
      .get(`/careers/${content.occupations[0].code}`)
      .withEncryptedCookie('le_attempt', cookie(flat))
    response.assertStatus(404)
  })

  test('sends titles, RIASEC profile, ranked fields with at most 20 programs', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    const [code] = await matchCodes(client, attempt)

    const response = await client
      .get(`/careers/${code}`)
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('student/career')
    const { occupation } = response.inertiaProps as Record<string, any>
    const source = content.occupations.find((o) => o.code === code)!
    assert.equal(occupation.code, code)
    assert.equal(occupation.titleEn, source.title)
    assert.equal(occupation.title, content.thaiTitles[code] ?? source.title)
    assert.deepEqual(
      occupation.profile.map((p: { type: 'R'; score: number }) => [p.type, p.score]),
      (['R', 'I', 'A', 'S', 'E', 'C'] as const).map((t) => [t, source[t]])
    )
    assert.equal(occupation.profile[0].name, 'นักลงมือทำ')
    assert.isAbove(occupation.fields.length, 0)
    for (const field of occupation.fields) {
      assert.isAtMost(field.programs.length, 20)
      assert.equal(field.programCount, (content.tcasPrograms.fields[field.key] ?? []).length)
      assert.isString(field.group)
    }
  })

  test('records one view per occupation and the career time once', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const [first, second] = await matchCodes(client, attempt)
    const open = (code: string) =>
      client.get(`/careers/${code}`).withEncryptedCookie('le_attempt', cookie(attempt))

    const firstOpen = await open(first)
    firstOpen.assertStatus(200)
    await attempt.refresh()
    assert.equal(attempt.furthestStep, 'career')
    const careerAt = attempt.careerAt
    assert.isNotNull(careerAt)

    await open(first)
    await open(second)
    await attempt.refresh()
    assert.equal(attempt.careerAt!.toMillis(), careerAt!.toMillis())

    const views = await CareerView.query().where('attemptId', attempt.id).orderBy('id')
    assert.deepEqual(
      views.map((v) => v.occupationCode),
      [first, second]
    )
  })
})
