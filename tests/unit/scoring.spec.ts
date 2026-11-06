// Ported case by case from the prototype's scoring.test.js.
import { test } from '@japa/runner'
import content, { type Occupation, type Scores } from '#services/content_service'
import {
  RIASEC,
  scoreMax,
  questionOrder,
  scoreAnswers,
  interestCode,
  profileStatus,
  pearson,
  fitLevel,
  matchOccupations,
  sharedHighTypes,
} from '#services/scoring_service'

const { items, forms, occupations } = content

const answerAll = (valueByType: Scores) =>
  Object.fromEntries(items.map((it) => [it.id, valueByType[it.id[0] as keyof Scores]]))

test.group('Scoring', () => {
  test('question order covers all 60 items and alternates types', ({ assert }) => {
    const order = questionOrder(items)
    assert.equal(order.length, 60)
    assert.equal(new Set(order.map((it) => it.id)).size, 60)
    assert.deepEqual(
      order.slice(0, 6).map((it) => it.id),
      ['R1', 'I1', 'A1', 'S1', 'E1', 'C1']
    )
  })

  test('scores sum 0–4 answers per type, max 40', ({ assert }) => {
    const s = scoreAnswers(answerAll({ R: 0, I: 4, A: 2, S: 3, E: 1, C: 0 }))
    assert.deepEqual(s, { R: 0, I: 40, A: 20, S: 30, E: 10, C: 0 })
    assert.equal(scoreMax(60), 40)
    assert.deepEqual(interestCode(s), ['I', 'S', 'A'])
  })

  test('Mini-IP: 30 known items, 5 per type, rotating R I A S E C, max 20', ({ assert }) => {
    const order = questionOrder(items, forms.mini.ids)
    assert.equal(order.length, 30)
    assert.isTrue(order.every(Boolean), 'every Mini-IP id exists in the Short Form')
    assert.equal(new Set(order.map((it) => it.id)).size, 30)
    assert.deepEqual(order.map((it) => it.id[0]).join(''), 'RIASEC'.repeat(5))
    assert.equal(scoreMax(order.length), 20)
  })

  test('60-item form asks the Mini-IP 30 first, so continuing starts at question 31', ({
    assert,
  }) => {
    const mini = questionOrder(items, forms.mini.ids)
    const full = questionOrder(items, forms.full.ids, forms[forms.full.first as 'mini'].ids)
    assert.equal(new Set(full.map((it) => it.id)).size, 60)
    assert.deepEqual(full.slice(0, 30), mini)
    assert.deepEqual(full.map((it) => it.id[0]).join(''), 'RIASEC'.repeat(10))
  })

  test('ties keep RIASEC order', ({ assert }) => {
    assert.deepEqual(interestCode({ R: 5, I: 9, A: 9, S: 5, E: 9, C: 0 }), ['I', 'A', 'E'])
  })

  test('invalid profiles are flagged', ({ assert }) => {
    assert.equal(
      profileStatus(scoreAnswers(answerAll({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }))),
      'all-dislike'
    )
    assert.equal(profileStatus({ R: 20, I: 20, A: 20, S: 20, E: 20, C: 20 }), 'flat')
    assert.equal(profileStatus({ R: 20, I: 21, A: 20, S: 20, E: 20, C: 20 }), 'ok')
  })

  test('pearson', ({ assert }) => {
    assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1)
    assert.equal(pearson([1, 2, 3], [3, 2, 1]), -1)
    assert.isTrue(Number.isNaN(pearson([1, 1, 1], [1, 2, 3])))
  })

  test("fit levels use the Manual's cut-offs", ({ assert }) => {
    assert.equal(fitLevel(0.729), 'best')
    assert.equal(fitLevel(0.728), 'great')
    assert.equal(fitLevel(0.608), 'great')
    assert.equal(fitLevel(0.607), 'good')
    assert.equal(fitLevel(0), 'good')
    assert.isNull(fitLevel(-0.01))
  })

  test('matching ranks by r, drops negative r and other Job Zones', ({ assert }) => {
    const occ = (code: string, jobZone: number, v: number[]) =>
      ({
        code,
        title: code,
        jobZone,
        ...Object.fromEntries(RIASEC.map((t, i) => [t, v[i]])),
      }) as Occupation
    const pool = [
      occ('same', 4, [1, 7, 3, 5, 1, 2]),
      occ('close', 5, [2, 6, 4, 5, 1, 1]),
      occ('opposite', 4, [7, 1, 5, 3, 7, 6]),
      occ('wrong-zone', 2, [1, 7, 3, 5, 1, 2]),
    ]
    const hits = matchOccupations({ R: 0, I: 40, A: 20, S: 30, E: 0, C: 10 }, pool)
    assert.deepEqual(
      hits.map((h) => h.occupation.code),
      ['same', 'close']
    )
    assert.equal(hits[0].fit, 'best')
  })

  test('matching never suggests university teaching jobs', ({ assert }) => {
    const occ = (code: string, v: number[]) =>
      ({
        code,
        title: code,
        jobZone: 5,
        ...Object.fromEntries(RIASEC.map((t, i) => [t, v[i]])),
      }) as Occupation
    const pool = [
      occ('25-1054.00', [1, 7, 3, 5, 1, 2]),
      occ('25-9044.00', [1, 7, 3, 5, 1, 2]),
      occ('19-2012.00', [2, 6, 3, 4, 1, 2]),
    ]
    assert.deepEqual(
      matchOccupations({ R: 0, I: 40, A: 20, S: 30, E: 0, C: 10 }, pool).map(
        (h) => h.occupation.code
      ),
      ['19-2012.00']
    )
    for (const lean of [
      { R: 10, I: 40, A: 20, S: 30, E: 0, C: 10 },
      { R: 0, I: 10, A: 40, S: 30, E: 10, C: 0 },
    ]) {
      assert.isTrue(
        matchOccupations(lean, occupations).every((h) => !h.occupation.code.startsWith('25-1'))
      )
    }
  })

  // "every occupation the app can suggest has a Thai title" lives in content.spec.ts.

  test('real data: an I+S student gets I/S occupations', ({ assert }) => {
    const s = { R: 0, I: 40, A: 20, S: 30, E: 0, C: 10 }
    const hits = matchOccupations(s, occupations)
    assert.equal(hits.length, 5)
    for (const h of hits) {
      assert.include(sharedHighTypes(h.occupation, interestCode(s)), 'I', h.occupation.title)
    }
  })
})
