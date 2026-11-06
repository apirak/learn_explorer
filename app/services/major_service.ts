// Occupation → TCAS fields of study: pure functions, no DOM, no fetching.
// Line-by-line port of the prototype's majors.js; only the syntax changes.
// Chain: O*NET occupation ─(CIP crosswalk)→ CIP 4-digit series ─(tcas_field_to_cip.json)→ TCAS field.
import type { TcasField } from '#services/content_service'

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 }

export type FieldMatch = { key: string; field: TcasField; shared: string[]; share: number }

/**
 * TCAS fields that lead to an occupation, best first.
 * A field ranks higher when more of its CIP series lead to the occupation
 * (share = shared series / the field's series), so an on-topic field like จิตวิทยา
 * beats a broad one that only touches psychology through one of its series.
 *
 * occupationCip: { socCode: ["42.27", …] }   fieldMap: { "11-31": { th, cip: [...], confidence } }
 */
export function fieldsForOccupation(
  socCode: string,
  occupationCip: Record<string, string[]>,
  fieldMap: Record<string, TcasField>
): FieldMatch[] {
  const cips = new Set(occupationCip[socCode] ?? [])
  return Object.entries(fieldMap)
    .map(([key, field]) => {
      const shared = field.cip.filter((c) => cips.has(c))
      return { key, field, shared, share: shared.length / field.cip.length }
    })
    .filter((m) => m.shared.length)
    .sort(
      (a, b) =>
        b.share - a.share ||
        CONFIDENCE_RANK[a.field.confidence] - CONFIDENCE_RANK[b.field.confidence] ||
        a.key.localeCompare(b.key)
    )
}

/** TCAS field key "11-31" → its group id "11" (group names live in tcas_programs.json). */
export const groupOf = (fieldKey: string) => fieldKey.split('-')[0]
