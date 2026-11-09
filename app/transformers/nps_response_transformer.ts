import type NpsResponse from '#models/nps_response'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * The student's own NPS response for the careers page: the score and whether ส่ง was pressed.
 * The comment never comes back, since after ส่ง the page shows thanks instead of the form.
 */
export default class NpsResponseTransformer extends BaseTransformer<NpsResponse> {
  toObject() {
    return { score: this.resource.score, sent: this.resource.sentAt !== null }
  }
}
