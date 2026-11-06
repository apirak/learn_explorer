import Answer from '#models/answer'
import content from '#services/content_service'
import { questionOrder } from '#services/scoring_service'
import { answerValidator } from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'

const UNIQUE_VIOLATION = '23505'

export default class StudentTestController {
  /** `GET /test`: the 30 Mini-IP items in order, plus the answers already saved. */
  async show({ inertia, attempt }: HttpContext) {
    const answers = await attempt!.related('answers').query().select('itemId', 'value')
    return inertia.render('student/test', {
      items: questionOrder(content.items, content.forms.mini.ids).map((item) => ({
        id: item.id,
        text: item.text_th,
      })),
      answers: Object.fromEntries(answers.map((a) => [a.itemId, a.value])),
    })
  }

  /**
   * `POST /test/answers` (JSON): save one answer, return the counts. No scoring here [M1].
   * The unique (attempt, item) index stops duplicates. When two first saves race,
   * the loser's insert fails and is retried once, now as an update.
   */
  async answer({ request, attempt }: HttpContext) {
    const { itemId, value } = await request.validateUsing(answerValidator)
    const save = () => Answer.updateOrCreate({ attemptId: attempt!.id, itemId }, { value })
    try {
      await save()
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error
      await save()
    }
    return { answered: await attempt!.answerCount(), total: content.forms.mini.ids.length }
  }
}
