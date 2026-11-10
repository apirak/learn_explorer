import { test } from '@japa/runner'
import Answer from '#models/answer'
import Attempt from '#models/attempt'
import CareerMatch from '#models/career_match'
import content from '#services/content_service'
import { matchOccupations } from '#services/scoring_service'
import { CareerMatchService } from '#services/career_match_service'
import testUtils from '@adonisjs/core/services/test_utils'

const MINI: string[] = content.forms.mini.ids
const cookie = (a: Attempt) => ({ uuid: a.uuid, code: a.code })
const newAttempt = () => Attempt.create({ code: null, contentVersion: 'v1', furthestStep: 'test' })

/** Every Mini-IP answer set to `value`, with `overrides` on top. */
const answerAll = (attempt: Attempt, value: number, overrides: Record<string, number> = {}) =>
  Answer.createMany(
    MINI.map((itemId) => ({ attemptId: attempt.id, itemId, value: overrides[itemId] ?? value }))
  )

/** R items 4, I items 3, the rest 2: a valid profile with matches. */
const realistic = Object.fromEntries(
  MINI.filter((id) => 'RI'.includes(id[0])).map((id) => [id, id[0] === 'R' ? 4 : 3])
)

const storedCodes = async (attempt: Attempt) => {
  const rows = await CareerMatch.query().where('attemptId', attempt.id).orderBy('rank')
  return rows.map((m) => [m.rank, m.occupationCode])
}

const expectedCodes = (overrides: Record<string, number>) => {
  const answers = Object.fromEntries(MINI.map((id) => [id, overrides[id] ?? 2]))
  const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }
  for (const [id, v] of Object.entries(answers)) scores[id[0] as keyof typeof scores] += v
  return matchOccupations(scores, content.occupations).map((m, i) => [i + 1, m.occupation.code])
}

test.group('Career matches are stored when an attempt is scored', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('opening the result stores the top matches in rank order', async ({ client, assert }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 2, realistic)

    await client.get('/result').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()

    await attempt.refresh()
    assert.isNotNull(attempt.matchedAt)
    const stored = await storedCodes(attempt)
    assert.lengthOf(stored, 5)
    assert.deepEqual(stored, expectedCodes(realistic))
  })

  test('a changed answer replaces the matches on the careers page', async ({ client, assert }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 2, realistic)
    await client.get('/result').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()

    // Swap to an A/S-heavy profile.
    const artsy = Object.fromEntries(
      MINI.filter((id) => 'AS'.includes(id[0])).map((id) => [id, id[0] === 'A' ? 4 : 3])
    )
    for (const id of MINI)
      await Answer.query()
        .where({ attemptId: attempt.id, itemId: id })
        .update({ value: artsy[id] ?? 2 })

    await client.get('/careers').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()

    const stored = await storedCodes(attempt)
    assert.lengthOf(stored, 5)
    assert.deepEqual(stored, expectedCodes(artsy))
    assert.notDeepEqual(stored, expectedCodes(realistic))
  })

  test('an invalid profile stores no matches but is marked computed', async ({
    client,
    assert,
  }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 3) // flat

    await client.get('/result').withEncryptedCookie('le_attempt', cookie(attempt)).withInertia()

    await attempt.refresh()
    assert.equal(attempt.profileStatus, 'flat')
    assert.isNotNull(attempt.matchedAt)
    assert.isNotNull(attempt.testTimeMs)
    assert.lengthOf(await storedCodes(attempt), 0)
  })

  test('an unfinished attempt stores nothing', async ({ assert }) => {
    const attempt = await newAttempt()
    await Answer.create({ attemptId: attempt.id, itemId: MINI[0], value: 3 })

    assert.isNull(await CareerMatchService.record(attempt))
    await attempt.refresh()
    assert.isNull(attempt.matchedAt)
    assert.isNull(attempt.testTimeMs)
  })
})

test.group('Test time', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const setGaps = async (attempt: Attempt, gaps: (number | null)[]) => {
    for (const [i, itemId] of MINI.entries())
      await Answer.query().where({ attemptId: attempt.id, itemId }).update({ gapMs: gaps[i] })
  }

  test('sums answer gaps, leaving out gaps over 5 minutes', async ({ assert }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 2, realistic)
    // First answer has no gap, 28 gaps of 2 s, one 6-minute break.
    await setGaps(attempt, [null, ...Array(28).fill(2000), 6 * 60 * 1000])

    await CareerMatchService.record(attempt)

    await attempt.refresh()
    assert.equal(attempt.testTimeMs, 28 * 2000)
  })

  test('counts a gap of exactly 5 minutes', async ({ assert }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 2, realistic)
    await setGaps(attempt, [null, 5 * 60 * 1000, ...Array(28).fill(1000)])

    await CareerMatchService.record(attempt)

    await attempt.refresh()
    assert.equal(attempt.testTimeMs, 5 * 60 * 1000 + 28 * 1000)
  })

  test('is null when no answer has a gap', async ({ assert }) => {
    const attempt = await newAttempt()
    await answerAll(attempt, 2, realistic)
    await setGaps(attempt, Array(MINI.length).fill(null))

    await CareerMatchService.record(attempt)

    await attempt.refresh()
    assert.isNull(attempt.testTimeMs)
    assert.isNotNull(attempt.matchedAt)
  })
})
