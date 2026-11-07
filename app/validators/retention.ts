import vine from '@vinejs/vine'

/** Days student data is kept. Same bounds as the `settings.retention_days` check. */
export const retentionValidator = vine.create({
  retentionDays: vine.number().withoutDecimals().range([1, 3650]),
})
