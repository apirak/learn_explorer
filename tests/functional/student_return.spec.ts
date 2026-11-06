import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import content from '#services/content_service'
import testUtils from '@adonisjs/core/services/test_utils'

const MINI: string[] = content.forms.mini.ids

/** CUJ 3 (returning student) and CUJ 4 (shared phone). */
test.group('Student return', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /** An attempt with all 30 answers saved. */
  const finishedAttempt = async (code: string | null = 'AB5434') => {
    const attempt = await Attempt.create({ code, contentVersion: 'v1', furthestStep: 'test' })
    await Answer.createMany(MINI.map((itemId) => ({ attemptId: attempt.id, itemId, value: 3 })))
    return attempt
  }
  const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })

  test('Home offers the previous result to a student who finished', async ({ client }) => {
    const attempt = await finishedAttempt()
    const response = await client
      .get('/')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withEncryptedCookie('le_entry', { code: 'AB5434' })
      .withInertia()

    response.assertInertiaPropsContains({ resume: null, finished: true })
  })

  test('Home offers nothing to return to without a finished attempt', async ({ client }) => {
    const response = await client.get('/').withInertia()
    response.assertInertiaPropsContains({ resume: null, finished: false })
  })

  test('viewing the previous result creates no attempt', async ({ client, assert }) => {
    const attempt = await finishedAttempt()
    const response = await client
      .get('/result')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    response.assertInertiaComponent('student/result')
    assert.lengthOf(await Attempt.all(), 1)
  })

  test('start again creates a new attempt with the same code and leaves the old one', async ({
    client,
    assert,
  }) => {
    const old = await finishedAttempt('AB5434')
    await client.get('/result').withEncryptedCookie('le_attempt', cookie(old)) // scores it
    await old.refresh()
    const before = old.serialize()

    const response = await client
      .post('/attempts')
      .withEncryptedCookie('le_attempt', cookie(old))
      .withEncryptedCookie('le_entry', { code: 'AB5434' })
      .withCsrfToken()
      .redirects(0)

    response.assertHeader('location', '/test')
    const fresh = await Attempt.query().whereNot('id', old.id).firstOrFail()
    assert.equal(fresh.code, 'AB5434')
    assert.deepEqual(response.cookie('le_attempt')?.value, cookie(fresh))
    await old.refresh()
    assert.deepEqual(old.serialize(), before)
    assert.lengthOf(await Answer.query().where('attemptId', old.id), 30)
    assert.lengthOf(await Answer.query().where('attemptId', fresh.id), 0)
  })

  test('a different code never shows the previous student', async ({ client, assert }) => {
    const old = await finishedAttempt('AB5434')
    const entry = { code: 'CD7788' }

    const home = await client
      .get('/')
      .withEncryptedCookie('le_attempt', cookie(old))
      .withEncryptedCookie('le_entry', entry)
      .withInertia()
    home.assertInertiaPropsContains({ resume: null, finished: false })

    const result = await client
      .get('/result')
      .withEncryptedCookie('le_attempt', cookie(old))
      .withEncryptedCookie('le_entry', entry)
      .redirects(0)
    result.assertStatus(302)
    result.assertHeader('location', '/')

    await client
      .post('/attempts')
      .withEncryptedCookie('le_attempt', cookie(old))
      .withEncryptedCookie('le_entry', entry)
      .withCsrfToken()
      .redirects(0)
    const fresh = await Attempt.query().whereNot('id', old.id).firstOrFail()
    assert.equal(fresh.code, 'CD7788')
  })

  test('with no code in the link the attempt is still resumed', async ({ client }) => {
    const attempt = await finishedAttempt('AB5434')
    for (const entry of [null, { code: null }]) {
      const request = client.get('/').withEncryptedCookie('le_attempt', cookie(attempt))
      if (entry) request.withEncryptedCookie('le_entry', entry)
      const response = await request.withInertia()
      response.assertInertiaPropsContains({ finished: true })
    }
  })

  test('a cookie for a deleted attempt is cleared silently', async ({ client, assert }) => {
    const attempt = await finishedAttempt()
    await attempt.delete()

    const response = await client
      .get('/')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({ resume: null, finished: false })
    assert.equal(response.cookie('le_attempt')?.maxAge, 0)
  })
})
