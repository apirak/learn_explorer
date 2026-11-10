import { randomInt, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { AttemptSchema } from '#database/schema'
import Answer from '#models/answer'
import CareerMatch from '#models/career_match'
import CareerView from '#models/career_view'
import NpsResponse from '#models/nps_response'
import StudentContact from '#models/student_contact'
import content from '#services/content_service'
import { interestCode, profileStatus, scoreAnswers } from '#services/scoring_service'
import { beforeCreate, hasMany, hasOne, scope } from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export type Step = Attempt['furthestStep']

/** Student flow order. Test entry time is `created_at` [M5]; later steps have their own `*_at`. */
export const STEPS: Step[] = ['test', 'result', 'career', 'print_prep']
const STEP_AT = { result: 'resultAt', career: 'careerAt', print_prep: 'printPrepAt' } as const

/** Prefix of a code this system gives a student who arrived without one ("No Code"). */
export const NO_CODE_PREFIX = 'NC-'
/** A–Z and 2–9 without 0/O/1/I/L, so staff can read a code aloud. */
const NO_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export default class Attempt extends AttemptSchema {
  @hasMany(() => Answer)
  declare answers: HasMany<typeof Answer>

  /** Stored from the latest scores; `matchedAt` says when (ADR 0005). */
  @hasMany(() => CareerMatch)
  declare careerMatches: HasMany<typeof CareerMatch>

  @hasMany(() => CareerView)
  declare careerViews: HasMany<typeof CareerView>

  @hasOne(() => NpsResponse)
  declare npsResponse: HasOne<typeof NpsResponse>

  /** Exists only when the student consented [DP-001]. */
  @hasOne(() => StudentContact)
  declare contact: HasOne<typeof StudentContact>

  /** Complete attempts (every answer in), the only ones that can be scored. */
  static complete = scope((query: ModelQueryBuilderContract<typeof Attempt>) => {
    query.has('answers', '>=', content.forms.mini.ids.length)
  })

  @beforeCreate()
  static assignUuid(attempt: Attempt) {
    attempt.uuid ??= randomUUID()
  }

  /**
   * A fresh `NC-XXXXX` for a student without a code. Restarts carry it forward through the
   * attempt cookie, so repeats on one browser share it. Retries while an attempt has it.
   * ponytail: check-then-insert can race (code is shared by repeats, so no unique index);
   * 31^5 ≈ 28.6M codes makes it negligible at our volume.
   */
  static async generateNoCode() {
    for (let tries = 0; tries < 10; tries++) {
      const suffix = Array.from({ length: 5 }, () => NO_CODE_CHARS[randomInt(NO_CODE_CHARS.length)])
      const code = NO_CODE_PREFIX + suffix.join('')
      if (!(await Attempt.findBy('code', code))) return code
    }
    throw new Error('No free NC- code after 10 tries')
  }

  /** A code from another system or campaign, not one this system made up (`NC-`). */
  get hasCampaignCode() {
    return !!this.code && !this.code.startsWith(NO_CODE_PREFIX)
  }

  /**
   * Scores from the saved answers, recomputed on every open [M1] so a changed answer
   * always shows up. Merged onto the attempt (unsaved). Null until all 30 are answered.
   */
  async score(this: Attempt) {
    const answers = await this.related('answers').query().select('itemId', 'value')
    if (answers.length < content.forms.mini.ids.length) return null

    const scores = scoreAnswers(Object.fromEntries(answers.map((a) => [a.itemId, a.value])))
    const code = interestCode(scores)
    const status = profileStatus(scores)
    this.merge({
      scoreR: scores.R,
      scoreI: scores.I,
      scoreA: scores.A,
      scoreS: scores.S,
      scoreE: scores.E,
      scoreC: scores.C,
      interestCode: code.join(''),
      profileStatus: status,
    })
    return { scores, code, status }
  }

  async answerCount() {
    const [row] = await Answer.query().where('attemptId', this.id).count('* as total')
    return Number(row.$extras.total)
  }

  /** The only way an attempt moves forward: never lowers the step, sets each `*_at` once. */
  async reachStep(step: Step) {
    if (STEPS.indexOf(step) > STEPS.indexOf(this.furthestStep)) this.furthestStep = step
    if (step !== 'test') this[STEP_AT[step]] ??= DateTime.now()
    await this.save()
  }

  /** Download records only its first time [N5]. Saves the scores merged by `score()` too. */
  async markDownloaded() {
    this.downloadedAt ??= DateTime.now()
    await this.save()
  }
}
