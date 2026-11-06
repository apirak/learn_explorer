import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { AttemptSchema } from '#database/schema'
import Answer from '#models/answer'
import CareerView from '#models/career_view'
import content from '#services/content_service'
import { interestCode, profileStatus, scoreAnswers } from '#services/scoring_service'
import { beforeCreate, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export type Step = Attempt['furthestStep']

/** Student flow order. Test entry time is `created_at` [M5]; later steps have their own `*_at`. */
const STEPS: Step[] = ['test', 'result', 'career', 'mypath']
const STEP_AT = { result: 'resultAt', career: 'careerAt', mypath: 'mypathAt' } as const

export default class Attempt extends AttemptSchema {
  @hasMany(() => Answer)
  declare answers: HasMany<typeof Answer>

  @hasMany(() => CareerView)
  declare careerViews: HasMany<typeof CareerView>

  @beforeCreate()
  static assignUuid(attempt: Attempt) {
    attempt.uuid ??= randomUUID()
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
}
