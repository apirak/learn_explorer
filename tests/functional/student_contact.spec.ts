import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import StudentContact from '#models/student_contact'
import content from '#services/content_service'
import testUtils from '@adonisjs/core/services/test_utils'

const MINI: string[] = content.forms.mini.ids

/** A finished attempt with a valid profile, optionally from a campaign code. */
async function scoredAttempt(code: string | null = null) {
  const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'result', code })
  await Answer.createMany(
    MINI.map((itemId) => ({ attemptId: attempt.id, itemId, value: itemId[0] === 'R' ? 4 : 2 }))
  )
  return attempt
}

const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })
const fieldErrors = (response: any, field: string): string[] =>
  response.flashMessage('inputErrorsBag')?.[field] ?? []

test.group('Student contact step', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const open = (client: any, attempt: Attempt) =>
    client.get('/contact').withEncryptedCookie('le_attempt', cookie(attempt)).redirects(0)

  const post = (client: any, attempt: Attempt, form: Record<string, string>) =>
    client
      .post('/contact')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withCsrfToken()
      .header('referer', '/contact')
      .form(form)
      .redirects(0)

  test('shows the form to a student with no code and no contact', async ({ client }) => {
    const attempt = await scoredAttempt()
    const response = await client
      .get('/contact')
      .withEncryptedCookie('le_attempt', cookie(attempt))
      .withInertia()
    response.assertStatus(200)
    response.assertInertiaComponent('student/contact')
  })

  test('shows the form to a student with an NC- code', async ({ client }) => {
    const response = await open(client, await scoredAttempt('NC-AB3CD'))
    response.assertStatus(200)
  })

  test('skips to careers with a manual M-NC- code', async ({ client }) => {
    const response = await open(client, await scoredAttempt('M-NC-AB3CD'))
    response.assertHeader('location', '/careers')
  })

  test('skips to careers with a campaign code or a contact', async ({ client }) => {
    const coded = await scoredAttempt('AB5434')
    const codedRes = await open(client, coded)
    codedRes.assertHeader('location', '/careers')

    const contacted = await scoredAttempt()
    await StudentContact.record(contacted.id, { email: 'a@example.com', consent: true }, 'print_prep')
    const contactedRes = await open(client, contacted)
    contactedRes.assertHeader('location', '/careers')
  })

  test('sends an unfinished test back to the test', async ({ client }) => {
    const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    const response = await open(client, attempt)
    response.assertHeader('location', '/test')
  })

  test('with consent: stores the contact from this page, then careers', async ({
    client,
    assert,
  }) => {
    const attempt = await scoredAttempt()
    const response = await post(client, attempt, {
      name: '  ต้นกล้า ',
      phone: '081-234-5678',
      consent: 'on',
    })
    response.assertHeader('location', '/careers')
    const contact = await StudentContact.findByOrFail('attemptId', attempt.id)
    assert.equal(contact.name, 'ต้นกล้า')
    assert.equal(contact.phone, '0812345678')
    assert.equal(contact.source, 'contact')
  })

  test('an empty form goes on to careers and stores nothing', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await post(client, attempt, { phone: '', email: '' })
    response.assertHeader('location', '/careers')
    assert.lengthOf(await StudentContact.all(), 0)
  })

  test('a phone without consent comes back with a message', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await post(client, attempt, { phone: '0812345678' })
    response.assertHeader('location', '/contact')
    assert.deepEqual(fieldErrors(response, 'consent'), [
      'ติ๊กยินยอมก่อน หรือลบชื่อ เบอร์ และอีเมลออกแล้วไปต่อ',
    ])
    assert.lengthOf(await StudentContact.all(), 0)
  })

  test('a name alone comes back asking for a phone or email', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await post(client, attempt, { name: 'ต้นกล้า', consent: 'on' })
    response.assertHeader('location', '/contact')
    assert.deepEqual(fieldErrors(response, 'name'), [
      'ใส่เบอร์หรืออีเมลด้วย หรือลบชื่อออกแล้วไปต่อ',
    ])
    assert.lengthOf(await StudentContact.all(), 0)
  })

  test('a name without consent comes back with a message', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await post(client, attempt, { name: 'ต้นกล้า', phone: '0812345678' })
    response.assertHeader('location', '/contact')
    assert.lengthOf(fieldErrors(response, 'consent'), 1)
  })

  test('rejects a name over 100 characters', async ({ client, assert }) => {
    const attempt = await scoredAttempt()
    const response = await post(client, attempt, {
      name: 'ก'.repeat(101),
      phone: '0812345678',
      consent: 'on',
    })
    assert.deepEqual(fieldErrors(response, 'name'), ['ชื่อยาวได้ไม่เกิน 100 ตัวอักษร'])
    assert.lengthOf(await StudentContact.all(), 0)
  })

  test('a later save keeps the first source', async ({ assert }) => {
    const attempt = await scoredAttempt()
    await StudentContact.record(attempt.id, { phone: '0812345678', consent: true }, 'contact')
    await StudentContact.record(attempt.id, { phone: '021234567', consent: true }, 'print_prep')
    const contact = await StudentContact.findByOrFail('attemptId', attempt.id)
    assert.equal(contact.phone, '021234567')
    assert.equal(contact.source, 'contact')
  })
})
