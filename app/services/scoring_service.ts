// Interest Profiler algorithm: pure functions, no DOM, no fetching.
// Line-by-line port of the prototype's scoring.js; only the syntax changes.
// Rules follow the O*NET Interest Profiler Manual (Rounds, Hoff & Lewis, 2021),
// saved at reference/onet/interest_profiler/IP_Manual.pdf.
import type { Item, Occupation, RiasecType, Scores } from '#services/content_service'

export const RIASEC: RiasecType[] = ['R', 'I', 'A', 'S', 'E', 'C']

// Ch.3: 0 = strongly dislike, 1 = dislike, 2 = unsure, 3 = like, 4 = strongly like.
export const ANSWER_MIN = 0
export const ANSWER_MAX = 4
export const ITEMS_PER_TYPE = 10 // Short Form; the Mini-IP has 5

/** Highest possible score per type: 40 on the Short Form (60 items), 20 on the Mini-IP (30). */
export const scoreMax = (itemCount: number) => (itemCount / RIASEC.length) * ANSWER_MAX

export type FitLevel = 'best' | 'great' | 'good'
export type ProfileStatus = 'ok' | 'all-dislike' | 'flat'
export type OccupationMatch = { occupation: Occupation; r: number; fit: FitLevel | null }

// Ch.2 decision rules: r ≥ .729 "Best Fit", .608–.728 "Great Fit", 0–.607 "Good Fit".
// Occupations with a negative r are never suggested.
export const FIT_LEVELS: { level: FitLevel; minR: number }[] = [
  { level: 'best', minR: 0.729 },
  { level: 'great', minR: 0.608 },
  { level: 'good', minR: 0 },
]

// Item ids are "<type letter><number>", e.g. "I3".
const typeOf = (itemId: string) => itemId[0] as RiasecType

/**
 * Short Form ("all"): ask R1 I1 A1 S1 E1 C1 R2 … so consecutive questions never come from one type.
 * `first` (the Mini-IP ids) go first, so a student who finished the 30 continues at question 31.
 * The rest keep the rotation because the Mini-IP takes exactly 5 items of each type.
 * Mini-IP: its ids are already listed in the report's suggested order (same R I A S E C rotation).
 */
export function questionOrder(items: Item[], ids: string[] | 'all' = 'all', first: string[] = []) {
  const byId = new Map(items.map((it) => [it.id, it]))
  if (ids !== 'all') return ids.map((id) => byId.get(id)!)
  const head = new Set(first)
  const left = Object.fromEntries(
    RIASEC.map((t) => [
      t,
      Array.from({ length: ITEMS_PER_TYPE }, (_, i) => byId.get(t + (i + 1))!).filter(
        (it) => !head.has(it.id)
      ),
    ])
  ) as Record<RiasecType, Item[]>
  const order = first.map((id) => byId.get(id)!)
  while (RIASEC.some((t) => left[t].length))
    for (const t of RIASEC) if (left[t].length) order.push(left[t].shift()!)
  return order
}

/** answers: { itemId: 0–4 } → { R: 0–40, I: …, … } */
export function scoreAnswers(answers: Record<string, number>): Scores {
  const scores = Object.fromEntries(RIASEC.map((t) => [t, 0])) as Scores
  for (const [id, value] of Object.entries(answers)) scores[typeOf(id)] += value
  return scores
}

/** Top-n types, highest first. Ties keep RIASEC order (the paper form lets the student break ties). */
export function interestCode(scores: Scores, n = 3) {
  return [...RIASEC].sort((a, b) => scores[b] - scores[a]).slice(0, n)
}

/**
 * "ok" | "all-dislike" | "flat"
 * Ch.2 rule 9: all "strongly dislike" means the profile is likely invalid.
 * A flat profile (all six scores equal) has no shape, so correlation is undefined.
 */
export function profileStatus(scores: Scores): ProfileStatus {
  const values = RIASEC.map((t) => scores[t])
  if (values.every((v) => v === 0)) return 'all-dislike'
  if (new Set(values).size === 1) return 'flat'
  return 'ok'
}

export function pearson(a: number[], b: number[]) {
  const n = a.length
  const ma = a.reduce((s, x) => s + x, 0) / n
  const mb = b.reduce((s, x) => s + x, 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : Number.NaN
}

export function fitLevel(r: number) {
  return FIT_LEVELS.find((f) => r >= f.minR)?.level ?? null
}

/**
 * University teaching jobs (SOC 25-1xxx "… Teachers, Postsecondary" and postsecondary TAs).
 * Not part of O*NET's rules: we drop them because one exists per subject, they crowd the top 5,
 * and a high-school student doesn't choose a major to become a lecturer.
 */
export const isPostsecondaryTeaching = (o: Occupation) =>
  o.code.startsWith('25-1') || o.code === '25-9044.00'

/**
 * Ch.2: correlate the student's 6 scores with each occupation's 6 interest scores (1–7)
 * and keep the highest non-negative r.
 * ponytail: one ranked list across the allowed Job Zones; O*NET shows up to 10 per Job Zone
 */
export function matchOccupations(
  scores: Scores,
  occupations: Occupation[],
  { limit = 5, jobZones = [4, 5] } = {}
): OccupationMatch[] {
  const student = RIASEC.map((t) => scores[t])
  return occupations
    .filter((o) => jobZones.includes(o.jobZone) && !isPostsecondaryTeaching(o))
    .map((o) => ({
      occupation: o,
      r: pearson(
        student,
        RIASEC.map((t) => o[t])
      ),
    }))
    .filter((m) => m.r >= 0)
    .sort((a, b) => b.r - a.r)
    .slice(0, limit)
    .map((m) => ({ ...m, fit: fitLevel(m.r) }))
}

/** An occupation's own top types, keeping only clearly high ones (≥ 3.5 on the 1–7 scale). */
export function occupationCode(occupation: Occupation, n = 3, minScore = 3.5) {
  return [...RIASEC]
    .sort((a, b) => occupation[b] - occupation[a])
    .slice(0, n)
    .filter((t) => occupation[t] >= minScore)
}

/** Which of the student's top types this occupation also scores high on (≥ 4.5 of 7): the "why". */
export function sharedHighTypes(occupation: Occupation, studentCode: RiasecType[], minScore = 4.5) {
  return studentCode.filter((t) => occupation[t] >= minScore)
}
