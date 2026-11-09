import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import content from '#services/content_service'
import { NO_CODE_PREFIX } from '#models/attempt'
import { ANSWER_MAX, ANSWER_MIN } from '#services/scoring_service'

/**
 * Campaign code from `?code=`. A code that fails is treated as no code, never as an error.
 * `NC-` belongs to codes this system makes, so a sent one is stored as `M-NC-…` (manual);
 * it is capped at 62 characters so the prefixed code still fits the 64-character column.
 */
export const entryCodeValidator = vine.create({
  code: vine
    .string()
    .regex(/^(?:NC-[A-Za-z0-9_-]{0,59}|(?!NC-)[A-Za-z0-9_-]{1,64})$/)
    .transform((code) => (code.startsWith(NO_CODE_PREFIX) ? `M-${code}` : code)),
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

const NAME_LENGTH_MESSAGE = 'ชื่อยาวได้ไม่เกิน 100 ตัวอักษร'
const NAME_MESSAGE = 'ใส่เบอร์หรืออีเมลด้วย หรือลบชื่อออกแล้วไปต่อ'
const CONSENT_MESSAGE = 'ติ๊กยินยอมก่อน หรือลบชื่อ เบอร์ และอีเมลออกแล้วไปต่อ'

/** A name alone cannot reach anyone, so it needs a phone or email beside it. */
const withPhoneOrEmail = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string' || !value || field.parent.phone || field.parent.email) return
  field.report(NAME_MESSAGE, 'withPhoneOrEmail', field)
})

/**
 * Contact form on `/contact` and MyPath. Name: the student's own name or nickname, only kept
 * with a phone or email. Phone: spaces and dashes removed, `+66` becomes `0`,
 * then 9–10 digits starting with 0. The checkbox sends `on` only when ticked; it is required
 * once anything is typed, so nothing typed is dropped silently. Never logged [DP-001].
 */
export const contactValidator = vine.create({
  name: vine.string().trim().maxLength(100).use(withPhoneOrEmail()).optional(),
  phone: vine
    .string()
    .parse((v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '').replace(/^\+66/, '0') : v))
    .regex(/^0\d{8,9}$/)
    .optional(),
  email: vine.string().trim().email().maxLength(254).optional(),
  consent: vine.boolean().optional().requiredIfAnyExists(['name', 'phone', 'email']),
})
contactValidator.messagesProvider = new SimpleMessagesProvider({
  'name.string': NAME_LENGTH_MESSAGE,
  'name.maxLength': NAME_LENGTH_MESSAGE,
  'name.withPhoneOrEmail': NAME_MESSAGE,
  'phone.string': PHONE_MESSAGE,
  'phone.regex': PHONE_MESSAGE,
  'email.string': EMAIL_MESSAGE,
  'email.email': EMAIL_MESSAGE,
  'email.maxLength': EMAIL_MESSAGE,
  'consent.required': CONSENT_MESSAGE,
  'consent.boolean': CONSENT_MESSAGE,
})
