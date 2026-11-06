import vine, { SimpleMessagesProvider } from '@vinejs/vine'
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

const PHONE_MESSAGE = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก เช่น 0812345678'
const EMAIL_MESSAGE = 'อีเมลไม่ถูกต้อง ลองตรวจอีกครั้ง'

/**
 * Download on MyPath. Phone: spaces and dashes removed, `+66` becomes `0`, then 9–10 digits
 * starting with 0. The checkbox sends `on` only when ticked. Never logged [DP-001].
 */
export const downloadValidator = vine.create({
  phone: vine
    .string()
    .parse((v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '').replace(/^\+66/, '0') : v))
    .regex(/^0\d{8,9}$/)
    .optional(),
  email: vine.string().trim().email().maxLength(254).optional(),
  consent: vine.boolean().optional(),
})
downloadValidator.messagesProvider = new SimpleMessagesProvider({
  'phone.string': PHONE_MESSAGE,
  'phone.regex': PHONE_MESSAGE,
  'email.string': EMAIL_MESSAGE,
  'email.email': EMAIL_MESSAGE,
  'email.maxLength': EMAIL_MESSAGE,
})
