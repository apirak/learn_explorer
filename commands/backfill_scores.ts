import Attempt from '#models/attempt'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Saves scores for attempts that answered every item but never opened the result, which is
 * the only place scores are stored [M1]. Safe to run again: scored attempts are skipped.
 * ponytail: one query per attempt; fine for the handful this finds, batch if it ever is many.
 */
export default class BackfillScores extends BaseCommand {
  static commandName = 'backfill:scores'
  static description = 'Store scores for finished attempts that have none yet'

  static options: CommandOptions = { startApp: true }

  async run() {
    const attempts = await Attempt.query()
      .withScopes((scopes) => scopes.complete())
      .whereNull('scoreR')

    for (const attempt of attempts) {
      if (await attempt.score()) await attempt.save()
    }
    this.logger.success(`Scored ${attempts.length} attempts`)
  }
}
