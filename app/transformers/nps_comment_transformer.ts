import NpsResponse from '#models/nps_response'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * One NPS comment for the admin comments page: score, band, text and when it was sent. No
 * attempt id, code or contact, so a comment is not tied back to a student on screen [DP-001].
 */
export default class NpsCommentTransformer extends BaseTransformer<NpsResponse> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'score', 'comment', 'sentAt']),
      group: NpsResponse.group(this.resource.score),
    }
  }
}
