import { DateTime } from 'luxon'
import Attempt from '#models/attempt'
import Setting from '#models/setting'

const BATCH = 500

/**
 * How long student data is kept, and the manual purge. The banner, the purge screen and the
 * delete all use `cutoff()`, so they always agree on which attempts are due. Nothing here
 * runs on its own: an admin presses Purge.
 */
export class RetentionService {
  static async days() {
    const setting = await Setting.firstOrCreate({ id: 1 })
    if (setting.$isLocal) await setting.refresh() // just inserted: read the column default (60)
    return setting.retentionDays
  }

  static async setDays(retentionDays: number) {
    await Setting.updateOrCreate({ id: 1 }, { retentionDays })
  }

  /** Attempts created before this are due for deletion. */
  private static cutoff(days: number) {
    return DateTime.now().minus({ days }).toSQL()!
  }

  static async dueCount() {
    const cutoff = this.cutoff(await this.days())
    const [row] = await Attempt.query().where('createdAt', '<', cutoff).count('* as total')
    return Number(row.$extras.total)
  }

  /**
   * Deletes attempts older than the retention period, 500 ids at a time. `ON DELETE CASCADE`
   * removes their answers, career views, contact details and audit rows. Returns the count.
   */
  static async purge(days: number) {
    const cutoff = this.cutoff(days)
    let deleted = 0
    while (true) {
      const ids = await Attempt.query()
        .where('createdAt', '<', cutoff)
        .orderBy('id')
        .limit(BATCH)
        .select('id')
      if (!ids.length) return deleted
      await Attempt.query()
        .whereIn(
          'id',
          ids.map((a) => a.id)
        )
        .delete()
      deleted += ids.length
    }
  }
}
