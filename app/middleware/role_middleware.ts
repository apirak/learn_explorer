import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Lets the request through when the logged-in user's role is at least `min`,
 * otherwise renders a 403 page. Runs after `auth`.
 */
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { min: 'admin' | 'owner' }) {
    const user = ctx.auth.getUserOrFail()
    if (!(options.min === 'owner' ? user.isOwner : user.isAdmin)) {
      // Middleware return values are not sent, unlike a route handler's.
      return ctx.response.status(403).send(await ctx.inertia.render('errors/forbidden', {}))
    }
    return next()
  }
}
