import type Attempt from '#models/attempt'
import content from '#services/content_service'
import { REPORT_ZONE } from '#services/report_service'
import type { DateTime } from 'luxon'

type Value = string | number | boolean | null | undefined

/** The column guide, relative to the app root. */
export const DICTIONARY_PATH = 'resources/exports/students.md'

const bangkok = (dt: DateTime | null) => dt?.setZone(REPORT_ZONE).toISO() ?? null

/**
 * The student export: one row per attempt, in this column order. Every header must be described
 * in `resources/exports/students.md` (a test checks). Needs `contact`, `npsResponse` and
 * `careerMatches` (by rank) preloaded and the `answer_count`, `career_view_count` and
 * `career_save_count` counts. Carries full contact details [DP-001].
 */
export const COLUMNS: [string, (a: Attempt) => Value][] = [
  ['attempt_uuid', (a) => a.uuid],
  ['code', (a) => a.code],
  ['code_type', (a) => (!a.code ? null : a.hasCampaignCode ? 'campaign' : 'no_code')],
  ['furthest_step', (a) => a.furthestStep],
  ['started_at', (a) => bangkok(a.createdAt)],
  ['result_at', (a) => bangkok(a.resultAt)],
  ['career_at', (a) => bangkok(a.careerAt)],
  ['print_prep_at', (a) => bangkok(a.printPrepAt)],
  ['downloaded_at', (a) => bangkok(a.downloadedAt)],
  ['answer_count', (a) => Number(a.$extras.answer_count)],
  ['test_time_sec', (a) => (a.testTimeMs === null ? null : Math.round(a.testTimeMs / 1000))],
  ['score_r', (a) => a.scoreR],
  ['score_i', (a) => a.scoreI],
  ['score_a', (a) => a.scoreA],
  ['score_s', (a) => a.scoreS],
  ['score_e', (a) => a.scoreE],
  ['score_c', (a) => a.scoreC],
  ['interest_code', (a) => a.interestCode],
  ['profile_status', (a) => a.profileStatus],
  ['desired_career', (a) => a.desiredCareer],
  [
    'career_matches',
    (a) => a.careerMatches.map((m) => content.occupationTitle(m.occupationCode)).join(' | '),
  ],
  ['career_view_count', (a) => Number(a.$extras.career_view_count)],
  ['career_save_count', (a) => Number(a.$extras.career_save_count)],
  ['nps_score', (a) => a.npsResponse?.score],
  ['nps_comment', (a) => a.npsResponse?.comment],
  ['has_consent', (a) => !!a.contact],
  ['consent_at', (a) => bangkok(a.contact?.consentAt ?? null)],
  ['consent_version', (a) => a.contact?.consentVersion],
  ['contact_source', (a) => a.contact?.source],
  ['name', (a) => a.contact?.name],
  ['phone', (a) => a.contact?.phone],
  ['email', (a) => a.contact?.email],
]

/**
 * One CSV field (RFC 4180). Text a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, tab,
 * CR) gets a leading `'`, since `desired_career`, `nps_comment` and `name` are typed by students.
 */
export function csvField(value: Value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** The whole file, with a BOM so Excel reads the Thai text as UTF-8. */
export function toCsv(attempts: Attempt[]) {
  const lines = [COLUMNS.map(([header]) => header).join(',')]
  for (const a of attempts) lines.push(COLUMNS.map(([, get]) => csvField(get(a))).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}
