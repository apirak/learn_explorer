import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Truncate, not a global transaction: the race test needs real concurrent inserts, and a
 * unique violation inside one shared transaction would abort it.
 */
test.group('Student flow: start and answers', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  const newAttempt = (code: string | null = 'AB5434') =>
    Attempt.create({ code, contentVersion: 'v1', furthestStep: 'test' })

  test('GET /?code= stores the code in le_entry and redirects without it', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/?code=AB5434').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
    assert.deepEqual(response.cookie('le_entry')?.value, { code: 'AB5434' })
    assert.isTrue(response.cookie('le_entry')?.httpOnly)
    assert.equal(response.cookie('le_entry')?.sameSite, 'Lax')
    assert.equal(response.cookie('le_entry')?.maxAge, 24 * 60 * 60)
  })

  test('an invalid code is stored as no code', async ({ client, assert }) => {
    for (const code of ['bad code', 'a'.repeat(65), '', 'x<y', `NC-${'a'.repeat(60)}`]) {
      const response = await client.get('/').qs({ code }).redirects(0)
      response.assertStatus(302)
      assert.deepEqual(response.cookie('le_entry')?.value, { code: null }, code)
    }
  })

  test('a sent NC- code is stored as a manual M-NC- code', async ({ client, assert }) => {
    for (const [sent, stored] of [
      ['NC-AB3CD', 'M-NC-AB3CD'],
      [`NC-${'a'.repeat(59)}`, `M-NC-${'a'.repeat(59)}`],
      ['M-NC-AB3CD', 'M-NC-AB3CD'],
    ]) {
      const response = await client.get('/').qs({ code: sent }).redirects(0)
      assert.deepEqual(response.cookie('le_entry')?.value, { code: stored }, sent)
    }
  })

  test('opening Home creates nothing and shows the O*NET credit', async ({ client, assert }) => {
    const response = await client.get('/').withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('student/home')
    response.assertInertiaPropsContains({ resume: null })
    assert.include((response.inertiaProps as Record<string, any>).attribution, 'O*NET')
    assert.lengthOf(await Attempt.all(), 0)
  })

  test('Start creates the attempt with the entry code and a 60-day attempt cookie', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/attempts')
      .withEncryptedCookie('le_entry', { code: 'AB5434' })
      .withCsrfToken()
      .form({ desiredCareer: '  นักพัฒนาเกม  ' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/test')
    const attempt = await Attempt.firstOrFail()
    assert.equal(attempt.code, 'AB5434')
    assert.equal(attempt.desiredCareer, 'นักพัฒนาเกม')
    assert.equal(attempt.contentVersion, 'v2')
    assert.equal(attempt.furthestStep, 'test')

    const cookie = response.cookie('le_attempt')!
    assert.deepEqual(cookie.value, { uuid: attempt.uuid, code: 'AB5434' })
    assert.isTrue(cookie.httpOnly)
    assert.equal(cookie.sameSite, 'Lax')
    assert.equal(cookie.maxAge, 60 * 24 * 60 * 60)
  })

  test('Start without a code gives an NC- code and no career', async ({ client, assert }) => {
    const response = await client.post('/attempts').withCsrfToken().redirects(0)
    const attempt = await Attempt.firstOrFail()
    assert.match(attempt.code!, /^NC-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{5}$/)
    assert.isFalse(attempt.hasEntryCode)
    assert.isNull(attempt.desiredCareer)
    assert.deepEqual(response.cookie('le_attempt')?.value, {
      uuid: attempt.uuid,
      code: attempt.code,
    })
  })

  test('restart without a code keeps the NC- code so repeats share it', async ({
    client,
    assert,
  }) => {
    await client.post('/attempts').withCsrfToken().redirects(0)
    const old = await Attempt.firstOrFail()

    await client
      .post('/attempts')
      .withEncryptedCookie('le_attempt', { uuid: old.uuid, code: old.code })
      .withCsrfToken()
      .redirects(0)

    const fresh = await Attempt.query().whereNot('id', old.id).firstOrFail()
    assert.equal(fresh.code, old.code)
  })

  test('two students without a code get different NC- codes', async ({ client, assert }) => {
    await client.post('/attempts').withCsrfToken().redirects(0)
    await client.post('/attempts').withCsrfToken().redirects(0)
    const [a, b] = await Attempt.all()
    assert.notEqual(a.code, b.code)
  })

  test('the test pages need an attempt', async ({ client }) => {
    const page = await client.get('/test').redirects(0)
    page.assertStatus(302)
    page.assertHeader('location', '/')

    const save = await client
      .post('/test/answers')
      .withCsrfToken()
      .json({ itemId: 'R1', value: 3 })
      .redirects(0)
    save.assertStatus(302)
  })

  test('an answer is saved once; a second tap updates it', async ({ client, assert }) => {
    const attempt = await newAttempt()
    const save = (itemId: string, value: number) =>
      client
        .post('/test/answers')
        .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
        .withCsrfToken()
        .json({ itemId, value })
        .accept('json')

    const first = await save('R1', 3)
    first.assertStatus(200)
    first.assertBody({ answered: 1, total: 30 })

    const again = await save('R1', 0)
    again.assertBody({ answered: 1, total: 30 })
    const other = await save('I1', 4)
    other.assertBody({ answered: 2, total: 30 })

    const rows = await Answer.query().where('attemptId', attempt.id).orderBy('itemId')
    assert.deepEqual(
      rows.map((a) => [a.itemId, a.value]),
      [
        ['I1', 4],
        ['R1', 0],
      ]
    )
  })

  test('racing first saves of one answer leave one row', async ({ client, assert }) => {
    const attempt = await newAttempt()
    const responses = await Promise.all(
      [1, 2, 3, 4, 5].map(() =>
        client
          .post('/test/answers')
          .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
          .withCsrfToken()
          .json({ itemId: 'R1', value: 2 })
          .accept('json')
      )
    )

    responses.forEach((r) => r.assertStatus(200))
    assert.lengthOf(await Answer.query().where('attemptId', attempt.id), 1)
  })

  test('values outside 0–4 and items outside the form are rejected', async ({ client, assert }) => {
    const attempt = await newAttempt()
    const bad = [
      { itemId: 'R1', value: 5 },
      { itemId: 'R1', value: -1 },
      { itemId: 'R1', value: 1.5 },
      { itemId: 'R2', value: 3 }, // Short Form only, not in the Mini-IP
      { itemId: 'X1', value: 3 },
      { itemId: 'R1' },
    ]
    for (const body of bad) {
      const response = await client
        .post('/test/answers')
        .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
        .withCsrfToken()
        .json(body as { itemId: string; value: number }) // deliberately wrong shapes
        .accept('json')
      assert.equal(response.status(), 422, JSON.stringify(body))
    }
    assert.lengthOf(await Answer.all(), 0)
  })

  test('GET /test gives the 30 Mini-IP items in order and the saved answers', async ({
    client,
    assert,
  }) => {
    const attempt = await newAttempt()
    await Answer.createMany([
      { attemptId: attempt.id, itemId: 'R1', value: 4 },
      { attemptId: attempt.id, itemId: 'I1', value: 1 },
    ])

    const response = await client
      .get('/test')
      .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
      .withInertia()

    response.assertInertiaComponent('student/test')
    const props = response.inertiaProps as {
      attemptUuid: string
      items: { id: string; text: string; type: string }[]
      answers: Record<string, number>
      total: number
    }
    assert.lengthOf(props.items, 30)
    assert.deepEqual(
      props.items.slice(0, 6).map((it) => it.id),
      ['R1', 'I1', 'A1', 'S2', 'E4', 'C3']
    )
    assert.isString(props.items[0].text)
    assert.equal(props.items[0].type, 'Realistic')
    assert.deepEqual(props.answers, { R1: 4, I1: 1 })
    assert.equal(props.total, 30)
    assert.equal(props.attemptUuid, attempt.uuid) // keys the unsent-answers queue
  })

  test('Home offers to continue an unfinished attempt', async ({ client }) => {
    const attempt = await newAttempt()
    await Answer.create({ attemptId: attempt.id, itemId: 'R1', value: 4 })

    const response = await client
      .get('/')
      .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
      .withInertia()

    response.assertInertiaPropsContains({ resume: { answered: 1, total: 30 } })
  })

  test('with no le_entry the attempt is still resumed', async ({ client }) => {
    const attempt = await newAttempt()
    const response = await client
      .get('/test')
      .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
      .withInertia()
    response.assertInertiaComponent('student/test')
  })

  test('a different entry code ignores the attempt (shared phone)', async ({ client }) => {
    const attempt = await newAttempt('AB5434')
    const response = await client
      .get('/')
      .withEncryptedCookie('le_attempt', { uuid: attempt.uuid, code: attempt.code })
      .withEncryptedCookie('le_entry', { code: 'ZZ0001' })
      .withInertia()
    response.assertInertiaPropsContains({ resume: null })
  })

  test('a cookie for a missing attempt is cleared', async ({ client, assert }) => {
    const response = await client
      .get('/')
      .withEncryptedCookie('le_attempt', { uuid: crypto.randomUUID(), code: null })
      .withInertia()

    response.assertInertiaPropsContains({ resume: null })
    assert.equal(response.cookie('le_attempt')?.maxAge, 0)
  })

  test('restart creates a new attempt with the same code and leaves the old one', async ({
    client,
    assert,
  }) => {
    const old = await newAttempt('AB5434')
    await Answer.create({ attemptId: old.id, itemId: 'R1', value: 4 })

    const response = await client
      .post('/attempts')
      .withEncryptedCookie('le_attempt', { uuid: old.uuid, code: old.code })
      .withCsrfToken()
      .redirects(0)

    const fresh = await Attempt.query().whereNot('id', old.id).firstOrFail()
    assert.equal(fresh.code, 'AB5434')
    assert.deepEqual(response.cookie('le_attempt')?.value, { uuid: fresh.uuid, code: 'AB5434' })
    assert.lengthOf(await Answer.query().where('attemptId', old.id), 1)
  })
})
