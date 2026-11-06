import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'

/**
 * Bump together with a new `content/vN/` folder. Files in a version never change.
 */
export const CONTENT_VERSION = 'v1'

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

export type TcasProgram = {
  id: string
  university: string
  campus: string
  faculty: string
  program: string
  type: string
}

const read = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(app.makePath('content', CONTENT_VERSION, file), 'utf8'))

const [itemsFile, riasecFile, occupationsFile, titlesFile, cipFile, fieldsFile, programsFile] =
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
    read<{ groups: Record<string, string>; fields: Record<string, TcasProgram[]> }>(
      'tcas_programs.json'
    ),
  ])

/**
 * Content v1, read once when this module is first imported (preloaded at boot by start/content.ts).
 * Server only: `tcasPrograms` is ~2 MB and must never reach the browser whole.
 */
export class ContentService {
  /** O*NET license credit: show it in full wherever O*NET content appears. */
  readonly attribution = itemsFile.attribution
  readonly items = itemsFile.items
  readonly forms = itemsFile.forms
  readonly riasecTypes = riasecFile.types
  readonly occupations = occupationsFile.occupations
  readonly thaiTitles = titlesFile.titles
  readonly occupationCip = cipFile.occupations
  readonly tcasFields = fieldsFile.fields
  readonly tcasPrograms = programsFile
}

export default new ContentService()
