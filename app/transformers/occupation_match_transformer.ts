import content, { type RiasecType } from '#services/content_service'
import { fieldsForOccupation } from '#services/major_service'
import { occupationCode, type OccupationMatch } from '#services/scoring_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** Top TCAS fields shown per occupation on the result page. */
const FIELDS_SHOWN = 3

/** One matched occupation with its top fields; never the program lists. */
export default class OccupationMatchTransformer extends BaseTransformer<
  OccupationMatch & { shared: RiasecType[] }
> {
  toObject() {
    const { occupation: o, fit, shared } = this.resource
    return {
      code: o.code,
      title: content.thaiTitles[o.code] ?? o.title,
      titleEn: o.title,
      fit: fit!, // matches have r ≥ 0, so always a level
      typeCode: occupationCode(o).join(''),
      shared,
      fields: fieldsForOccupation(o.code, content.occupationCip, content.tcasFields)
        .slice(0, FIELDS_SHOWN)
        .map(({ key, field }) => ({ key, name: field.th, unsure: field.confidence === 'low' })),
    }
  }
}
