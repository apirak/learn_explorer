// Golden vectors produced by the prototype's own scoring.js and majors.js (see the fixture's note).
// The TypeScript port must return exactly the same output, down to the last bit of each r.
import { test } from '@japa/runner'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import content from '#services/content_service'
import {
  questionOrder,
  scoreAnswers,
  interestCode,
  profileStatus,
  matchOccupations,
  occupationCode,
  sharedHighTypes,
} from '#services/scoring_service'
import { fieldsForOccupation } from '#services/major_service'

type Vector = { name: string; form: string; answers: Record<string, number> } & Record<
  string,
  unknown
>

const golden: { order: Record<'mini' | 'full', string[]>; vectors: Vector[] } = JSON.parse(
  await readFile(app.makePath('tests/fixtures/scoring_golden_v1.json'), 'utf8')
)

test.group('Scoring parity with the prototype', () => {
  test('question order for both forms', ({ assert }) => {
    const { items, forms } = content
    assert.deepEqual(
      questionOrder(items, forms.mini.ids).map((i) => i.id),
      golden.order.mini
    )
    assert.deepEqual(
      questionOrder(items, forms.full.ids, forms.mini.ids).map((i) => i.id),
      golden.order.full
    )
  })

  test('{name}')
    .with(golden.vectors)
    .run(({ assert }, vector) => {
      const scores = scoreAnswers(vector.answers)
      const code = interestCode(scores)
      const { name, form, answers, ...expected } = vector
      assert.deepEqual(
        {
          scores,
          code,
          status: profileStatus(scores),
          matches: matchOccupations(scores, content.occupations).map((m) => ({
            code: m.occupation.code,
            r: m.r,
            fit: m.fit,
            occupationCode: occupationCode(m.occupation),
            sharedHighTypes: sharedHighTypes(m.occupation, code),
            fields: fieldsForOccupation(
              m.occupation.code,
              content.occupationCip,
              content.tcasFields
            ).map((f) => ({ key: f.key, shared: f.shared, share: f.share })),
          })),
        },
        expected
      )
    })
})
