import content from '#services/content_service'
import { fieldsForOccupation, groupOf } from '#services/major_service'
import { RIASEC, occupationCode, type OccupationMatch } from '#services/scoring_service'
import { BaseTransformer } from '@adonisjs/core/transformers'

/** Ranked TCAS fields shown on the career page (prototype FIELDS_SHOWN). */
const FIELDS_SHOWN = 6
/** Programs listed per field; the rest are only counted. */
const PROGRAMS_SHOWN = 20

/** One matched occupation in full: titles, RIASEC profile, ranked fields and a slice of their programs. */
export default class OccupationTransformer extends BaseTransformer<OccupationMatch> {
  toObject() {
    const { occupation: o, fit } = this.resource
    const { groups, fields: programs } = content.tcasPrograms
    return {
      code: o.code,
      title: content.thaiTitles[o.code] ?? o.title,
      titleEn: o.title,
      fit: fit!, // matches have r ≥ 0, so always a level
      typeCode: occupationCode(o).join(''),
      /** O*NET interest scores, 1–7, with the Thai type names. */
      profile: RIASEC.map((type) => ({
        type,
        name: content.riasecTypes[type].name,
        score: o[type],
      })),
      fields: fieldsForOccupation(o.code, content.occupationCip, content.tcasFields)
        .slice(0, FIELDS_SHOWN)
        .map(({ key, field }) => ({
          key,
          name: field.th,
          group: groups[groupOf(key)] ?? '',
          unsure: field.confidence === 'low',
          programCount: (programs[key] ?? []).length,
          programs: (programs[key] ?? []).slice(0, PROGRAMS_SHOWN).map((p) => ({
            university: p.university,
            campus: p.campus,
            faculty: p.faculty,
            program: p.program,
            type: p.type,
          })),
        })),
    }
  }
}
