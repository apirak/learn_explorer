import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import StudentContact from '#models/student_contact'
import { CONSENT_VERSION } from '#services/consent_service'
import content from '#services/content_service'
import testUtils from '@adonisjs/core/services/test_utils'

const MINI: string[] = content.forms.mini.ids

/** A finished attempt with a valid profile: R items 4, the rest 2 (top type R). */
async function scoredAttempt() {
  const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'career' })
  await Answer.createMany(
    MINI.map((itemId) => ({ attemptId: attempt.id, itemId, value: itemId[0] === 'R' ? 4 : 2 }))
  )
  return attempt
}

/**
 * Field errors flashed on a failed form post. The session plugin's `assertValidationError`
 * reads the old `errors` key; this session version flashes `inputErrorsBag`.
 */
const fieldErrors = (response: any, field: string): string[] =>
  response.flashMessage('inputErrorsBag')?.[field] ?? []

const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })

test.group('Student MyPath', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /** `POST /mypath/download` from the MyPath form. */
  const download = (client: any, attempt: Attempt, form: Record<string, string>) =>
    client
      .post('/mypath/download')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withCsrfToken()
      .header('referer', '/mypath')
      .form(form)
      .redirects(0)

  test('needs an attempt', async ({ client }) => {
    for (const url of ['/mypath', '/mypath/print']) {
      const response = await client.get(url).redirects(0)
      response.assertStatus(302)
      response.assertHeader('location', '/')
    }
  })

  test('shows the consent text and records the MyPath time once', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const open = () =>
      client.get('/mypath').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()

    const response = await open()
    response.assertStatus(200)
    response.assertInertiaComponent('student/mypath')
    assert.deepInclude(response.inertiaProps.consent.blocks, {
      type: 'heading',
      text: 'ยินยอมให้ติดต่อกลับ',
    })
    await attempt.refresh()
    assert.equal(attempt.furthestStep, 'mypath')
    const mypathAt = attempt.mypathAt
    assert.isNotNull(mypathAt)

    await open()
    await attempt.refresh()
    assert.equal(attempt.mypathAt!.toMillis(), mypathAt!.toMillis())
  })

  test('sends an unfinished test back to the test', async ({ client, assert }) => {
    const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    for (const url of ['/mypath', '/mypath/print']) {
      const response = await client
        .get(url)
        .withEncryptedCookie('le_attempt', cookie(attempt))
        .redirects(0)
      response.assertStatus(302)
      response.assertHeader('location', '/test')
    }
    const post = await download(client, attempt, {})
    post.assertHeader('location', '/test')
    await attempt.refresh()
    assert.isNull(attempt.downloadedAt)
    assert.equal(attempt.furthestStep, 'test')
  })

  test('with consent: stores the contact, consent time and version', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await download(client, attempt, {
      phone: '+66 81-234-5678',
      email: 'student@example.com',
      consent: 'on',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/mypath/print')
    const contact = await StudentContact.findByOrFail('attemptId', attempt.id)
    assert.equal(contact.phone, '0812345678')
    assert.equal(contact.email, 'student@example.com')
    assert.equal(contact.consentVersion, CONSENT_VERSION)
    assert.isNotNull(contact.consentAt)
  })

  test('without consent: discards phone and email, still downloads', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await download(client, attempt, {
      phone: '0812345678',
      email: 'student@example.com',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/mypath/print')
    assert.lengthOf(await StudentContact.all(), 0)
    await attempt.refresh()
    assert.isNotNull(attempt.downloadedAt)
  })

  test('consent with no phone or email stores nothing', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await download(client, attempt, { consent: 'on' })
    response.assertHeader('location', '/mypath/print')
    assert.lengthOf(await StudentContact.all(), 0)
  })

  test('records only the first download time', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    await download(client, attempt, {})
    await attempt.refresh()
    const first = attempt.downloadedAt!

    await download(client, attempt, { phone: '021234567', consent: 'on' })
    await attempt.refresh()
    assert.equal(attempt.downloadedAt!.toMillis(), first.toMillis())
    const contact = await StudentContact.findByOrFail('attemptId', attempt.id)
    assert.equal(contact.phone, '021234567')
  })

  test('rejects a bad phone or email with Thai messages', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    for (const phone of ['12345', '08123456789', '1812345678', 'abc0812345']) {
      const response = await download(client, attempt, { phone, consent: 'on' })
      response.assertStatus(302)
      response.assertHeader('location', '/mypath')
      assert.deepEqual(fieldErrors(response, 'phone'), [
        'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก เช่น 0812345678',
      ])
    }
    const email = await download(client, attempt, {
      email: `${'a'.repeat(250)}@example.com`,
      consent: 'on',
    })
    assert.deepEqual(fieldErrors(email, 'email'), ['อีเมลไม่ถูกต้อง ลองตรวจอีกครั้ง'])
    const bad = await download(client, attempt, { email: 'not-an-email', consent: 'on' })
    assert.deepEqual(fieldErrors(bad, 'email'), ['อีเมลไม่ถูกต้อง ลองตรวจอีกครั้ง'])

    assert.lengthOf(await StudentContact.all(), 0)
    await attempt.refresh()
    assert.isNull(attempt.downloadedAt)
  })

  test('print shows the result, the top careers and the O*NET credit', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    const response = await client
      .get('/mypath/print')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('student/print')
    const { result, matches, attribution } = response.inertiaProps as Record<string, any>
    assert.equal(result.code[0], 'R')
    assert.equal(result.status, 'ok')
    assert.lengthOf(matches, 5)
    assert.equal(attribution, content.attribution)
  })

  test('without consent: a bad phone or email is discarded, not an error', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    const response = await download(client, attempt, { phone: '12345', email: 'nope' })
    response.assertHeader('location', '/mypath/print')
    assert.lengthOf(await StudentContact.all(), 0)
    await attempt.refresh()
    assert.isNotNull(attempt.downloadedAt)
  })

  test('the blank form downloads', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await download(client, attempt, { phone: '', email: '' })
    response.assertHeader('location', '/mypath/print')
    assert.lengthOf(await StudentContact.all(), 0)
  })
})
