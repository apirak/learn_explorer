import { fieldsForOccupation } from '#services/major_service'
import content, { type RiasecType, type Scores } from '#services/content_service'
import {
  matchOccupations,
  occupationCode,
  sharedHighTypes,
  type OccupationMatch,
} from '#services/scoring_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** Top TCAS fields shown per occupation on the careers page. */
const FIELDS_SHOWN = 3

/** One matched occupation with its top fields; never the program lists. `shared`: Thai names of the student types it shares. */
export default class OccupationMatchTransformer extends BaseTransformer<
  OccupationMatch & { shared: string[] }
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

/**
 * The top matching occupations for a valid profile, as the careers and print pages show them.
 * Pass `matches` when they are already computed (the careers page gets them from
 * `CareerMatchService.record`), so the page shows the same list that was stored.
 */
export function transformMatches(
  scores: Scores,
  code: RiasecType[],
  matches: OccupationMatch[] = matchOccupations(scores, content.occupations)
) {
  const name = (t: RiasecType) => content.riasecTypes[t].name
  return OccupationMatchTransformer.transform(
    matches.map((m) => ({
      ...m,
      shared: sharedHighTypes(m.occupation, code).map(name),
    }))
  )
}
