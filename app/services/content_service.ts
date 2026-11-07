import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'

/**
 * Bump together with a new `content/vN/` folder. Files in a version never change.
 */
export const CONTENT_VERSION = 'v2'

export type RiasecType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
export type Scores = Record<RiasecType, number>

export type Item = {
  id: string
  type: string
  text_en: string
  text_th: string
  adapted?: boolean
  note?: string
}

export type Form = { label_th: string; source: string; ids: string[] | 'all'; first?: string }

export type Occupation = { code: string; title: string; jobZone: number } & Scores

export type TcasField = {
  th: string
  en: string
  cip: string[]
  confidence: 'high' | 'medium' | 'low'
  note?: string
}

/** One program from learn_tcas `browse.json`. `uni` is a code into `universities`. */
export type TcasProgram = {
  id: string
  name: string
  type: string
  uni: string
  group: string
  field: string
  campus: string
  faculty: string
  exams: Record<string, number>
  others: Record<string, number>
  either: string[][]
  rounds: number[]
  scored: number[]
  /** Round-3 weights filled from last year. */
  ly?: true
}

type Browse = {
  groups: Record<string, string>
  fields: Record<string, string>
  universities: Record<string, string>
  programs: TcasProgram[]
}

const read = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(app.makePath('content', CONTENT_VERSION, file), 'utf8'))

const [itemsFile, riasecFile, occupationsFile, titlesFile, cipFile, fieldsFile, browseFile] =
  await Promise.all([
    read<{
      attribution: string
      items: Item[]
      forms: { mini: Form & { ids: string[] }; full: Form }
    }>('items_th.json'),
    read<{ types: Record<RiasecType, { name: string; desc: string }> }>('riasec_types_th.json'),
    read<{ occupations: Occupation[] }>('occupations.json'),
    read<{ titles: Record<string, string> }>('occupation_titles_th.json'),
    read<{ occupations: Record<string, string[]> }>('occupation_cip.json'),
    read<{ fields: Record<string, TcasField> }>('tcas_field_to_cip.json'),
    read<{ data: Browse }>('browse.json'),
  ])

const { groups, universities, programs } = browseFile.data

/** Programs by TCAS field key, sorted by university then program name as in v1. */
const byField: Record<string, TcasProgram[]> = {}
for (const p of programs) (byField[p.field] ??= []).push(p)
const sortKey = (p: TcasProgram) => [universities[p.uni] ?? '', p.name]
for (const list of Object.values(byField)) {
  list.sort((a, b) => {
    const [ua, na] = sortKey(a)
    const [ub, nb] = sortKey(b)
    return ua < ub ? -1 : ua > ub ? 1 : na < nb ? -1 : na > nb ? 1 : 0
  })
}

/**
 * Content v2, read once when this module is first imported (preloaded at boot by start/content.ts).
 * Server only: `tcasPrograms` is ~2 MB and must never reach the browser whole.
 */
export class ContentService {
  /** O*NET license credit, shown in full on Home. */
  readonly attribution = itemsFile.attribution
  readonly items = itemsFile.items
  readonly forms = itemsFile.forms
  readonly riasecTypes = riasecFile.types
  readonly occupations = occupationsFile.occupations
  readonly thaiTitles = titlesFile.titles
  readonly occupationCip = cipFile.occupations
  readonly tcasFields = fieldsFile.fields
  readonly tcasPrograms = { groups, fields: byField }
  /** University code → Thai name. */
  readonly universities = universities
}

export default new ContentService()
