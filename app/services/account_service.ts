import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

export class AccountService {
  /**
   * The first account becomes Owner, later ones member. Two simultaneous first
   * signups can both become Owner; the author accepts that race.
   */
  static register(data: { fullName: string | null; email: string; password: string }) {
    return db.transaction(async (trx) => {
      const ownerExists = await User.query({ client: trx }).where('role', 'owner').first()
      return User.create({ ...data, role: ownerExists ? 'member' : 'owner' }, { client: trx })
    })
  }

  /** Refuses for the Owner. Users have no link to student tables, so those stay untouched. */
  static async deleteAccount(user: User) {
    if (user.isOwner) return false
    await user.delete()
    return true
  }
}
