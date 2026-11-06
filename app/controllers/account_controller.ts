import User from '#models/user'
import { AccountService } from '#services/account_service'
import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { passwordValidator, profileValidator } from '#validators/account'

export default class AccountController {
  async show({ inertia }: HttpContext) {
    return inertia.render('account', {})
  }

  async updateProfile({ request, auth, session, response }: HttpContext) {
    const data = await request.validateUsing(profileValidator)
    await auth.user!.merge(data).save()
    session.flash('success', 'Profile saved')
    return response.redirect().toRoute('account.show')
  }

  async updatePassword({ request, auth, session, response }: HttpContext) {
    const { currentPassword, password } = await request.validateUsing(passwordValidator)
    const user = auth.user!
    try {
      await User.verifyCredentials(user.email, currentPassword)
    } catch {
      // Report it on the field, like any other validation error.
      throw new errors.E_VALIDATION_ERROR([
        { field: 'currentPassword', message: 'Current password is incorrect', rule: 'password' },
      ])
    }
    await user.merge({ password }).save()
    session.flash('success', 'Password changed')
    return response.redirect().toRoute('account.show')
  }

  async destroy({ auth, session, response }: HttpContext) {
    const user = auth.user!
    if (!(await AccountService.deleteAccount(user))) {
      session.flash('error', 'The Owner cannot delete their own account')
      return response.redirect().toRoute('account.show')
    }
    await auth.use('web').logout()
    return response.redirect().toRoute('session.create')
  }
}
