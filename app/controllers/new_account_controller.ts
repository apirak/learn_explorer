import { AccountService } from '#services/account_service'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)
    const user = await AccountService.register({ fullName, email, password })

    await auth.use('web').login(user)
    response.redirect().toRoute('account.show')
  }
}
