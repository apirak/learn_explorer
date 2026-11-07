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

  /** Grants or removes Admin. Refuses a missing account or the Owner: ownership moves only by transfer. */
  static setRole(targetId: number, role: 'admin' | 'member') {
    return db.transaction(async (trx) => {
      const target = await User.query({ client: trx }).where('id', targetId).forUpdate().first()
      if (!target || target.isOwner) return false
      await target.merge({ role }).save()
      return true
    })
  }

  /**
   * Locks both rows, then the target becomes Owner and the old Owner becomes Admin, so
   * there is exactly one Owner afterwards. Refuses when the actor is no longer the Owner,
   * or the target is missing or the actor themself.
   */
  static transferOwnership(owner: User, targetId: number) {
    if (owner.id === targetId) return Promise.resolve(false)
    return db.transaction(async (trx) => {
      // Lock in id order so two concurrent transfers cannot deadlock.
      const rows = await User.query({ client: trx })
        .whereIn('id', [owner.id, targetId])
        .orderBy('id')
        .forUpdate()
      const current = rows.find((u) => u.id === owner.id)
      const target = rows.find((u) => u.id === targetId)
      if (!current?.isOwner || !target) return false
      await current.merge({ role: 'admin' }).save()
      await target.merge({ role: 'owner' }).save()
      return true
    })
  }

  /** Refuses for the Owner. Users have no link to student tables, so those stay untouched. */
  static async deleteAccount(user: User) {
    if (user.isOwner) return false
    await user.delete()
    return true
  }
}
