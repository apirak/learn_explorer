import { test } from '@japa/runner'
import Attempt from '#models/attempt'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Attempt.reachStep', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('moves forward only and sets each step time once', async ({ assert }) => {
    const attempt = await Attempt.create({ contentVersion: 'v1', furthestStep: 'test' })
    assert.match(attempt.uuid, /^[0-9a-f-]{36}$/)

    await attempt.reachStep('career')
    const careerAt = attempt.careerAt!
    assert.equal(attempt.furthestStep, 'career')
    assert.notExists(attempt.resultAt)

    await attempt.reachStep('result') // going back
    await attempt.reachStep('career') // entering again
    await attempt.refresh()
    assert.equal(attempt.furthestStep, 'career')
    assert.isNotNull(attempt.resultAt)
    assert.equal(attempt.careerAt!.toMillis(), careerAt.toMillis())
  })
})
