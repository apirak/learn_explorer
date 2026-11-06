import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import User from '#models/user'
import Attempt from '#models/attempt'
import testUtils from '@adonisjs/core/services/test_utils'

const signup = (client: ApiClient, email: string) =>
  client
    .post('/signup')
    .withCsrfToken()
    .form({ fullName: 'Staff', email, password: 'secret1234', passwordConfirmation: 'secret1234' })
    .redirects(0)

const makeUser = (role: 'owner' | 'admin' | 'member') =>
  User.create({ email: `${role}@ondemand.test`, password: 'secret1234', role })

test.group('Accounts', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('first signup becomes Owner, later signups are members', async ({ client, assert }) => {
    const first = await signup(client, 'a@ondemand.test')
    first.assertStatus(302)
    first.assertHeader('location', '/account')

    await signup(client, 'b@ondemand.test')

    const roles = await User.query().orderBy('id').select('role')
    assert.deepEqual(
      roles.map((u) => u.role),
      ['owner', 'member']
    )
  })

  test('a member sees their role and edits their name and affiliation', async ({
    client,
    assert,
  }) => {
    const member = await makeUser('member')

    const page = await client.get('/account').withInertia().loginAs(member)
    page.assertInertiaComponent('account')
    assert.equal(page.inertiaProps.user.role, 'member')

    const response = await client
      .put('/account/profile')
      .withCsrfToken()
      .form({ fullName: 'Krit S.', affiliation: 'Academics' })
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)
    await member.refresh()
    assert.equal(member.fullName, 'Krit S.')
    assert.equal(member.affiliation, 'Academics')
  })

  test('password change needs the current password', async ({ client, assert }) => {
    const member = await makeUser('member')
    const change = (currentPassword: string) =>
      client
        .put('/account/password')
        .withCsrfToken()
        .form({ currentPassword, password: 'newpass1234', passwordConfirmation: 'newpass1234' })
        .loginAs(member)
        .redirects(0)

    const wrong = await change('wrong-password')
    wrong.assertStatus(302)
    wrong.assertFlashMessage('inputErrorsBag', {
      currentPassword: ['Current password is incorrect'],
    })
    await assert.rejects(() => User.verifyCredentials(member.email, 'newpass1234'))

    const right = await change('secret1234')
    right.assertStatus(302)
    await User.verifyCredentials(member.email, 'newpass1234')
  })

  test('the Owner cannot delete their own account', async ({ client, assert }) => {
    const owner = await makeUser('owner')

    const response = await client.delete('/account').withCsrfToken().loginAs(owner).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/account')
    assert.isNotNull(await User.find(owner.id))
  })

  test('a member deletes their account; student rows stay', async ({ client, assert }) => {
    const member = await makeUser('member')
    await Attempt.create({ code: 'AB5434', contentVersion: 'v1', furthestStep: 'test' })

    const response = await client.delete('/account').withCsrfToken().loginAs(member).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    assert.isNull(await User.find(member.id))
    assert.lengthOf(await Attempt.all(), 1)
  })

  test('members get 403 on admin routes; admins get in', async ({ client }) => {
    const member = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('member'))
    member.assertStatus(403)
    member.assertInertiaComponent('errors/forbidden')

    const admin = await client
      .get('/admin')
      .withInertia()
      .loginAs(await makeUser('admin'))
    admin.assertStatus(200)
  })

  test('guests are sent to login from admin routes', async ({ client }) => {
    const response = await client.get('/admin').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
