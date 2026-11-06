import type { ConsentService } from '#services/consent_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** The consent text MyPath shows, as heading / paragraph / list blocks. */
export default class ConsentTransformer extends BaseTransformer<ConsentService> {
  toObject() {
    return { blocks: this.resource.blocks }
  }
}
