import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import NpsResponse from '#models/nps_response'
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

test.group('Student NPS', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const careers = (client: any, attempt: Attempt) =>
    client.get('/careers').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()
  const nps = (client: any, attempt: Attempt, body: Record<string, unknown>) =>
    client
      .post('/careers/nps')
      .json(body)
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withCsrfToken()
      .accept('json')
  /** Posts and asserts the status in one step. */
  async function post(
    client: any,
    attempt: Attempt,
    body: Record<string, unknown>,
    status: number
  ) {
    const response = await nps(client, attempt, body)
    response.assertStatus(status)
  }
  /** The `nps` prop the careers page receives. */
  async function npsProp(client: any, attempt: Attempt) {
    const page = await careers(client, attempt)
    return page.inertiaProps.nps
  }

  test('opening the careers list records its first view only, not a step', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    const page = await careers(client, attempt)
    page.assertStatus(200)
    assert.isNull(page.inertiaProps.nps)

    await attempt.refresh()
    const first = attempt.careersViewedAt!
    assert.isNotNull(first)
    assert.equal(attempt.furthestStep, 'result')
    assert.isNull(attempt.careerAt)

    await careers(client, attempt)
    await attempt.refresh()
    assert.equal(attempt.careersViewedAt!.toMillis(), first.toMillis())
  })

  test('404s before the careers list was opened', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await nps(client, attempt, { score: 9 })
    response.assertStatus(404)
    assert.isNull(await NpsResponse.findBy('attemptId', attempt.id))
  })

  test('a tap saves the score, a new tap replaces it; ส่ง stores the comment', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    await careers(client, attempt)

    await post(client, attempt, { score: 3 }, 204)
    await post(client, attempt, { score: 8, comment: 'ignored until sent' }, 204)
    let row = await NpsResponse.findByOrFail('attemptId', attempt.id)
    assert.equal(row.score, 8)
    assert.isNull(row.comment)
    assert.isNull(row.sentAt)
    assert.deepEqual(await npsProp(client, attempt), { score: 8, sent: false })

    await post(client, attempt, { score: 8, comment: '  อยากได้อาชีพเยอะขึ้น  ', send: true }, 204)
    row = await NpsResponse.findByOrFail('attemptId', attempt.id)
    assert.equal(row.comment, 'อยากได้อาชีพเยอะขึ้น')
    assert.isNotNull(row.sentAt)
    assert.lengthOf(await NpsResponse.query().where('attemptId', attempt.id), 1)

    // The comment never comes back to the page.
    assert.deepEqual(await npsProp(client, attempt), { score: 8, sent: true })
  })

  test('ส่ง with an empty comment is sent with no comment', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    await careers(client, attempt)
    await post(client, attempt, { score: 10, comment: '   ', send: true }, 204)
    const row = await NpsResponse.findByOrFail('attemptId', attempt.id)
    assert.isNull(row.comment)
    assert.isNotNull(row.sentAt)
  })

  test('rejects scores outside 0–10 and comments over 500 characters', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    await careers(client, attempt)
    for (const body of [
      { score: 11 },
      { score: -1 },
      { score: 5.5 },
      { score: 5, comment: 'ก'.repeat(501), send: true },
    ]) {
      await post(client, attempt, body, 422)
    }
    assert.isNull(await NpsResponse.findBy('attemptId', attempt.id))
  })

  test('is deleted with its attempt', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    await careers(client, attempt)
    await nps(client, attempt, { score: 9, comment: 'สนุก', send: true })
    await attempt.delete()
    assert.isNull(await NpsResponse.findBy('attemptId', attempt.id))
  })
})
