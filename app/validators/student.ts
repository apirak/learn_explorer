import vine from '@vinejs/vine'
import content from '#services/content_service'
import { ANSWER_MAX, ANSWER_MIN } from '#services/scoring_service'

/** Campaign code from `?code=`. A code that fails is treated as no code, never as an error. */
export const entryCodeValidator = vine.create({
  code: vine.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
})

/** Start: the career the student has in mind (free text, never logged [DP-001]). */
export const startValidator = vine.create({
  desiredCareer: vine.string().trim().maxLength(100).optional(),
})

/** One answer: an item of the Mini-IP (the only routed form [N3]) and a value 0–4. */
export const answerValidator = vine.create({
  itemId: vine.string().in(content.forms.mini.ids),
  value: vine.number().withoutDecimals().range([ANSWER_MIN, ANSWER_MAX]),
})
