import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { AttemptSchema } from '#database/schema'
import Answer from '#models/answer'
import { beforeCreate, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export type Step = Attempt['furthestStep']

/** Student flow order. Test entry time is `created_at` [M5]; later steps have their own `*_at`. */
const STEPS: Step[] = ['test', 'result', 'career', 'mypath']
const STEP_AT = { result: 'resultAt', career: 'careerAt', mypath: 'mypathAt' } as const

export default class Attempt extends AttemptSchema {
  @hasMany(() => Answer)
  declare answers: HasMany<typeof Answer>

  @beforeCreate()
  static assignUuid(attempt: Attempt) {
    attempt.uuid ??= randomUUID()
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
