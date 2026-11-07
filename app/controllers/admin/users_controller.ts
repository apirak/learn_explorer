import User from '#models/user'
import { AccountService } from '#services/account_service'
import UserTransformer from '#transformers/user_transformer'
import { roleValidator } from '#validators/account'
import type { HttpContext } from '@adonisjs/core/http'

/** Owner-only (`role:owner`): lists staff, grants or removes Admin, hands over ownership. */
export default class UsersController {
  async index({ inertia }: HttpContext) {
    const users = await User.query().orderBy('id')
    return inertia.render('admin/users', { users: UserTransformer.transform(users) })
  }

  async updateRole({ request, params, session, response }: HttpContext) {
    const { role } = await request.validateUsing(roleValidator)
    if (await AccountService.setRole(params.id, role)) {
      session.flash('success', 'Role updated')
    } else {
      session.flash('error', 'That role cannot be changed here')
    }
    return response.redirect().toRoute('admin.users.index')
  }

  async transfer({ auth, params, session, response }: HttpContext) {
    if (!(await AccountService.transferOwnership(auth.user!, params.id))) {
      session.flash('error', 'Ownership was not transferred')
      return response.redirect().toRoute('admin.users.index')
    }
    // The old Owner is now an Admin and can no longer open the users page.
    session.flash('success', 'Ownership transferred. You are now an Admin.')
    return response.redirect().toRoute('account.show')
  }
}
