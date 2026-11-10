import type Attempt from '#models/attempt'
import content from '#services/content_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** `0812341234` → `08x-xxx-1234`. */
export const maskPhone = (phone: string) => `${phone.slice(0, 2)}x-xxx-${phone.slice(-4)}`

/** `สมชาย` → `ส***`. Counts code points so an emoji is not split. */
export const maskName = (name: string) => `${Array.from(name)[0]}***`

/** `student@example.com` → `s***@example.com`. */
export const maskEmail = (email: string) => {
  const at = email.lastIndexOf('@')
  return `${email.slice(0, 1)}***${email.slice(at)}`
}

/**
 * Admin views of one attempt. The list (default) masks contact details; `forDetail` shows them
 * in full and needs `answers`, `careerMatches` (by rank), `careerViews` (in view order) and `contact`
 * preloaded, and `score()` run first.
 * Contact rows exist only with consent [DP-001].
 */
export default class AttemptTransformer extends BaseTransformer<Attempt> {
  toObject() {
    const contact = this.resource.contact
    return {
      ...this.pick(this.resource, [
        'id',
        'code',
        'furthestStep',
        'interestCode',
        'createdAt',
        'downloadedAt',
      ]),
      name: contact?.name ? maskName(contact.name) : null,
      phone: contact?.phone ? maskPhone(contact.phone) : null,
      email: contact?.email ? maskEmail(contact.email) : null,
    }
  }

  forDetail() {
    const a = this.resource
    const items = new Map(content.items.map((item) => [item.id, item]))
    const values = new Map(a.answers.map((answer) => [answer.itemId, answer.value]))
    return {
      ...this.pick(a, [
        'id',
        'uuid',
        'code',
        'contentVersion',
        'furthestStep',
        'createdAt',
        'resultAt',
        'careerAt',
        'printPrepAt',
        'downloadedAt',
        'interestCode',
        'profileStatus',
        'desiredCareer',
        'testTimeMs',
        'matchedAt',
      ]),
      scores:
        a.scoreR === null
          ? null
          : { R: a.scoreR, I: a.scoreI!, A: a.scoreA!, S: a.scoreS!, E: a.scoreE!, C: a.scoreC! },
      // Form order, answered items only.
      answers: content.forms.mini.ids
        .filter((id) => values.has(id))
        .map((id) => ({
          itemId: id,
          type: items.get(id)!.type,
          text: items.get(id)!.text_th,
          value: values.get(id)!,
        })),
      careerMatches: this.careerMatchRows(),
      contact: a.contact
        ? this.pick(a.contact, ['name', 'phone', 'email', 'consentAt', 'consentVersion'])
        : null,
    }
  }

  /**
   * Stored career matches in rank order, then viewed careers that are not among them (`rank`
   * null), each with when it was viewed and saved (a Career save). Stored data only (ADR 0005).
   */
  private careerMatchRows() {
    const a = this.resource
    const views = new Map(a.careerViews.map((view) => [view.occupationCode, view]))
    const matched = new Set(a.careerMatches.map((m) => m.occupationCode))
    const row = (code: string, rank: number | null) => ({
      code,
      rank,
      title: content.occupationTitle(code),
      viewedAt: views.get(code)?.createdAt ?? null,
      savedAt: views.get(code)?.savedAt ?? null,
    })
    return [
      ...a.careerMatches.map((m) => row(m.occupationCode, m.rank)),
      ...a.careerViews
        .filter((v) => !matched.has(v.occupationCode))
        .map((v) => row(v.occupationCode, null)),
    ]
  }
}
