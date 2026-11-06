import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import content from '#services/content_service'
import testUtils from '@adonisjs/core/services/test_utils'

const MINI: string[] = content.forms.mini.ids

/** Every Mini-IP answer set to `value`, with `overrides` on top. */
const answerAll = (attempt: Attempt, value: number, overrides: Record<string, number> = {}) =>
  Answer.createMany(
    MINI.map((itemId) => ({ attemptId: attempt.id, itemId, value: overrides[itemId] ?? value }))
  )

test.group('Student result', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const newAttempt = () =>
    Attempt.create({ code: null, contentVersion: 'v1', furthestStep: 'test' })
  const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })

  test('needs an attempt, then all 30 answers', async ({ client }) => {
    const none = await client.get('/result').redirects(0)
    none.assertStatus(302)
    none.assertHeader('location', '/')

    const attempt = await newAttempt()
    await Answer.createMany(
      MINI.slice(0, 29).map((itemId) => ({ attemptId: attempt.id, itemId, value: 3 }))
    )
    const partial = await client
      .get('/result')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .redirects(0)
    partial.assertStatus(302)
    partial.assertHeader('location', '/test')
  })

  test('scores the saved answers, stores them and records the result time', async ({
    client,
    assert,
  }) => {
    const attempt = await newAttempt()
    // R items 4, I items 3, the rest 2 → R 20, I 15, others 10 (5 items per type).
    const boost = Object.fromEntries(
      MINI.filter((id) => 'RI'.includes(id[0])).map((id) => [id, id[0] === 'R' ? 4 : 3])
    )
    await answerAll(attempt, 2, boost)

    const response = await client
      .get('/result')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('student/result')
    await attempt.refresh()
    assert.deepEqual(
      [
        attempt.scoreR,
        attempt.scoreI,
        attempt.scoreA,
        attempt.scoreS,
        attempt.scoreE,
        attempt.scoreC,
      ],
      [20, 15, 10, 10, 10, 10]
    )
    assert.equal(attempt.interestCode, 'RIA')
    assert.equal(attempt.profileStatus, 'ok')
    assert.equal(attempt.furthestStep, 'result')
    assert.isNotNull(attempt.resultAt)
  })

  test('reopening after an answer change rescores the attempt', async ({ client, assert }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 2, { R1: 4 })
    const open = () =>
      client.get('/result').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()

    await open()
    await attempt.refresh()
    assert.equal(attempt.scoreR, 12)

    await Answer.query().where({ attemptId: attempt.id, itemId: 'R1' }).update({ value: 0 })
    await Answer.query().where({ attemptId: attempt.id, itemId: 'C3' }).update({ value: 4 })
    await open()
    await attempt.refresh()
    assert.equal(attempt.scoreR, 8)
    assert.equal(attempt.scoreC, 12)
    assert.equal(attempt.interestCode?.[0], 'C')
  })

  test('the result sends the code with Thai names and the attribution, no matches', async ({
    client,
    assert,
  }) => {
    const attempt = await newAttempt()
    const boost = Object.fromEntries(MINI.filter((id) => id[0] === 'R').map((id) => [id, 4]))
    await answerAll(attempt, 2, boost)

    const response = await client
      .get('/result')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    const props = response.inertiaProps as Record<string, any>
    assert.equal(props.result.status, 'ok')
    assert.deepEqual(props.result.code, ['R', 'I', 'A'])
    assert.equal(props.result.scores.R, 20)
    assert.equal(props.result.max, 20)
    assert.equal(props.result.types[0].name, 'นักลงมือทำ')
    assert.include(props.attribution, 'O*NET')
    assert.notProperty(props, 'matches') // they live on /careers
  })

  test('an invalid profile gets its status on the result', async ({ client, assert }) => {
    for (const [value, status] of [
      [0, 'all-dislike'],
      [3, 'flat'],
    ] as const) {
      const attempt = await newAttempt()
      await answerAll(attempt, value)
      const response = await client
        .get('/result')
        .withEncryptedCookie('le_attempt', cookie(attempt))
        .withInertia()

      assert.equal((response.inertiaProps as Record<string, any>).result.status, status)
      await attempt.refresh()
      assert.equal(attempt.profileStatus, status)
    }
  })
})

test.group('Student careers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })

  test('needs an attempt, all 30 answers and a valid profile', async ({ client }) => {
    const none = await client.get('/careers').redirects(0)
    none.assertHeader('location', '/')

    const partial = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    await Answer.create({ attemptId: partial.id, itemId: 'R1', value: 4 })
    const early = await client
      .get('/careers')
      .withEncryptedCookie('le_attempt', cookie(partial))
      .redirects(0)
    early.assertHeader('location', '/test')

    const flat = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    await answerAll(flat, 3)
    const invalid = await client
      .get('/careers')
      .withEncryptedCookie('le_attempt', cookie(flat))
      .redirects(0)
    invalid.assertHeader('location', '/result')
  })

  test('sends the top 5 matches with fit and fields, the guess and the attribution only', async ({
    client,
    assert,
  }) => {
    const attempt = await Attempt.create({
      contentVersion: 'v1',
      furthestStep: 'test',
      desiredCareer: 'นักพัฒนาเกม',
    })
    const boost = Object.fromEntries(MINI.filter((id) => id[0] === 'R').map((id) => [id, 4]))
    await answerAll(attempt, 2, boost)

    const response = await client
      .get('/careers')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    response.assertInertiaComponent('student/careers')
    const props = response.inertiaProps as Record<string, any>
    assert.equal(props.guess, 'นักพัฒนาเกม')
    assert.include(props.attribution, 'O*NET')
    assert.lengthOf(props.matches, 5)
    for (const match of props.matches) {
      assert.match(match.code, /^\d\d-\d{4}\.\d\d$/)
      assert.oneOf(match.fit, ['best', 'great', 'good'])
      assert.isString(match.title)
      assert.isAtMost(match.fields.length, 3)
    }
    assert.include(props.matches[0].shared, 'นักลงมือทำ') // R is the student's top type
    // Never the full data files: no program lists, and the whole page stays small.
    assert.notInclude(JSON.stringify(props), 'university')
    assert.isBelow(JSON.stringify(props).length, 10_000)
  })
})
