import { DateTime } from 'luxon'
import { StudentContactSchema } from '#database/schema'
import Attempt from '#models/attempt'
import consent from '#services/consent_service'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

type ContactInput = { phone?: string; email?: string; consent?: boolean }

/** Phone and email a student left with consent. Personal data of a minor [DP-001]. */
export default class StudentContact extends StudentContactSchema {
  @belongsTo(() => Attempt)
  declare attempt: BelongsTo<typeof Attempt>

  /**
   * Saves a validated contact form. Nothing is stored without consent or without a phone or
   * email. `source` is kept from the first save, so it always names the page that got it.
   */
  static async record(attemptId: number, input: ContactInput, source: StudentContact['source']) {
    if (!input.consent || !(input.phone || input.email)) return null

    const contact = await this.firstOrNew({ attemptId }, { source })
    contact.merge({
      phone: input.phone ?? null,
      email: input.email ?? null,
      consentAt: DateTime.now(),
      consentVersion: consent.version,
    })
    return contact.save()
  }
}
